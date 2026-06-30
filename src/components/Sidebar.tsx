import { DatabaseIcon, FileIcon, FolderOpenIcon, RefreshCwIcon } from "lucide-react";
import type { BoxFile } from "@/lib/api";
import { Button } from "@/components/ui/button";

const EXT_LABEL: Record<string, string> = {
  pdf: "PDF",
  docx: "DOCX",
  doc: "DOC",
  md: "MD",
  txt: "TXT",
  csv: "CSV",
  xlsx: "XLSX",
};

export function Sidebar({
  files,
  error,
  folderId,
  loading,
  onRefresh,
}: {
  files: BoxFile[];
  error?: string;
  folderId: string;
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <aside className="hidden w-72 shrink-0 flex-col border-r bg-card/60 lg:flex">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <DatabaseIcon className="size-4 text-primary" />
          <span className="text-sm font-semibold">Knowledge base</span>
        </div>
        <Button variant="ghost" size="icon" className="size-7" onClick={onRefresh} title="Refresh">
          <RefreshCwIcon className={loading ? "size-3.5 animate-spin" : "size-3.5"} />
        </Button>
      </div>

      <div className="flex items-center gap-1.5 px-4 py-2 text-xs text-muted-foreground">
        <FolderOpenIcon className="size-3.5" />
        <span>Box folder</span>
        <code className="rounded bg-muted px-1.5 py-0.5 text-[0.7rem]">{folderId || "—"}</code>
      </div>

      <div className="scroll-area min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {error ? (
          <p className="px-2 py-4 text-xs text-muted-foreground">{error}</p>
        ) : files.length === 0 ? (
          <p className="px-2 py-4 text-xs text-muted-foreground">
            {loading ? "Loading files…" : "No files found. Run `bun run seed` to upload fixtures."}
          </p>
        ) : (
          <ul className="space-y-0.5">
            {files.map((file) => (
              <li key={file.id}>
                <a
                  href={file.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                  title={file.name}
                >
                  <FileIcon className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{file.name}</span>
                  {file.extension && EXT_LABEL[file.extension] && (
                    <span className="ml-auto shrink-0 rounded bg-muted px-1.5 py-0.5 text-[0.6rem] font-medium uppercase text-muted-foreground">
                      {EXT_LABEL[file.extension]}
                    </span>
                  )}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t px-4 py-2.5 text-[0.7rem] text-muted-foreground">
        {files.length} file{files.length === 1 ? "" : "s"} indexed · grounded by Box AI
      </div>
    </aside>
  );
}
