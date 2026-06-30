import { useCallback, useEffect, useState } from "react";
import { useStream } from "@langchain/react";
import { AlertTriangleIcon } from "lucide-react";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { ChatThread } from "@/components/ChatThread";
import { Composer } from "@/components/Composer";
import { EmptyState } from "@/components/EmptyState";
import { ActivityPanel, type TodoItem } from "@/components/ActivityPanel";
import { fetchConfig, fetchFiles, type AppConfig, type BoxFile } from "@/lib/api";

const ASSISTANT_ID = "knowledge-assistant";
// In dev, Vite proxies `/lg` -> the LangGraph dev server (see `vite.config.ts`).
// In the deployed build the SPA is served from `/ui` on the LangGraph server
// itself, so the graph API lives at the same origin's root.
const API_URL = import.meta.env.DEV ? `${window.location.origin}/lg` : window.location.origin;

export function App() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [files, setFiles] = useState<BoxFile[]>([]);
  const [filesError, setFilesError] = useState<string | undefined>();
  const [filesLoading, setFilesLoading] = useState(true);
  const [threadId, setThreadId] = useState<string | null>(null);

  const stream = useStream({
    apiUrl: API_URL,
    assistantId: ASSISTANT_ID,
    threadId,
    onThreadId: setThreadId,
  });

  const loadFiles = useCallback(async () => {
    setFilesLoading(true);
    try {
      const result = await fetchFiles();
      setFiles(result.files);
      setFilesError(result.error);
    } catch (e) {
      setFilesError(e instanceof Error ? e.message : String(e));
    } finally {
      setFilesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig()
      .then(setConfig)
      .catch(() => { });
    void loadFiles();
  }, [loadFiles]);

  const suggestions = config?.suggestions ?? [];
  const modelLabel = config?.model ? `${config.model.provider}:${config.model.model}` : null;
  const ready = Boolean(config?.boxConfigured && config?.model && config?.folderId);
  const chatDisabled = !ready;

  const todos = ((stream.values as { todos?: TodoItem[] } | undefined)?.todos ?? []) as TodoItem[];
  const subagents = Array.from(stream.subagents.values());
  const toolCalls = stream.toolCalls;
  const hasMessages = stream.messages.length > 0;
  const errorText = stream.error
    ? stream.error instanceof Error
      ? stream.error.message
      : String(stream.error)
    : null;

  const submit = useCallback(
    (text: string) => {
      void stream.submit({ messages: [{ type: "human", content: text }] });
    },
    [stream],
  );

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <Header
        modelLabel={modelLabel}
        boxConfigured={Boolean(config?.boxConfigured)}
        hasMessages={hasMessages}
        onNewChat={() => setThreadId(null)}
      />

      <div className="flex min-h-0 flex-1">
        <Sidebar
          files={files}
          error={filesError}
          folderId={config?.folderId ?? ""}
          loading={filesLoading}
          onRefresh={loadFiles}
        />

        <main className="flex min-h-0 flex-1 flex-col">
          {config && !ready && (
            <Banner>
              {config.modelError
                ? config.modelError
                : !config.boxConfigured
                  ? "Box is not configured. Set BOX_DEVELOPER_TOKEN (or CCG credentials) in your .env."
                  : "Set BOX_ROOT_FOLDER_ID in your .env (run `bun run seed` to get it)."}
            </Banner>
          )}

          {hasMessages ? (
            <ChatThread messages={stream.messages} isLoading={stream.isLoading} />
          ) : (
            <EmptyState suggestions={suggestions} onPick={submit} disabled={chatDisabled} />
          )}

          {errorText && <Banner>{errorText}</Banner>}

          <Composer
            onSubmit={submit}
            onStop={() => void stream.stop()}
            isLoading={stream.isLoading}
            disabled={chatDisabled}
          />
        </main>

        <ActivityPanel
          todos={todos}
          toolCalls={toolCalls}
          subagents={subagents}
          active={stream.isLoading}
        />
      </div>
    </div>
  );
}

function Banner({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto mt-3 flex w-full max-w-3xl items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
      <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
