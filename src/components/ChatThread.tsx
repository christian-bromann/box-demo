import { useEffect, useMemo, useRef } from "react";
import { AIMessage, HumanMessage, type BaseMessage } from "@langchain/core/messages";
import { BotIcon, UserIcon } from "lucide-react";
import { Response } from "@/components/Response";
import { Citations } from "@/components/Citations";
import { extractCitations, stripSources } from "@/lib/messages";
import { cn } from "@/lib/utils";

function Avatar({ kind }: { kind: "user" | "assistant" }) {
  return (
    <div
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full",
        kind === "user" ? "bg-primary text-primary-foreground" : "border bg-card text-primary",
      )}
    >
      {kind === "user" ? <UserIcon className="size-4" /> : <BotIcon className="size-4" />}
    </div>
  );
}

export function ChatThread({
  messages,
  isLoading,
}: {
  messages: BaseMessage[];
  isLoading: boolean;
}) {
  const endRef = useRef<HTMLDivElement>(null);

  const rendered = useMemo(
    () =>
      messages.filter((msg) => {
        if (HumanMessage.isInstance(msg)) return msg.text.trim().length > 0;
        if (AIMessage.isInstance(msg)) return msg.text.trim().length > 0;
        return false;
      }),
    [messages],
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const lastMsg = rendered.at(-1);
  const waiting = isLoading && (!lastMsg || HumanMessage.isInstance(lastMsg));

  return (
    <div className="scroll-area min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
        {rendered.map((msg, i) => {
          const key = msg.id ?? `msg-${i}`;
          if (HumanMessage.isInstance(msg)) {
            return (
              <div key={key} className="flex flex-row-reverse items-start gap-3">
                <Avatar kind="user" />
                <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground shadow-sm">
                  {msg.text}
                </div>
              </div>
            );
          }

          const citations = extractCitations(msg.text);
          return (
            <div key={key} className="flex items-start gap-3">
              <Avatar kind="assistant" />
              <div className="min-w-0 max-w-[85%] rounded-2xl rounded-tl-sm border bg-card px-4 py-3 shadow-sm">
                <Response>{stripSources(msg.text)}</Response>
                <Citations citations={citations} />
              </div>
            </div>
          );
        })}

        {waiting && (
          <div className="flex items-center gap-3">
            <Avatar kind="assistant" />
            <span className="text-sm shimmer">Planning and searching Box…</span>
          </div>
        )}

        <div ref={endRef} />
      </div>
    </div>
  );
}
