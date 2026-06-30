import { useState } from "react";
import {
  CheckIcon,
  ChevronRightIcon,
  FileSearchIcon,
  FilesIcon,
  FileUpIcon,
  LoaderIcon,
  ScanTextIcon,
  SparklesIcon,
  WrenchIcon,
  XIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export type ToolStatus = "running" | "finished" | "error";

export interface ToolActivityProps {
  name: string;
  args?: Record<string, unknown>;
  output?: unknown;
  status: ToolStatus;
}

function meta(name: string): { label: string; Icon: LucideIcon } {
  switch (name) {
    case "search_box_files":
      return { label: "Searched Box", Icon: FileSearchIcon };
    case "list_box_files":
      return { label: "Listed Box files", Icon: FilesIcon };
    case "ask_box_ai":
      return { label: "Asked Box AI", Icon: SparklesIcon };
    case "extract_box_fields":
      return { label: "Extracted fields with Box AI", Icon: ScanTextIcon };
    case "write_summary_to_box":
      return { label: "Wrote a summary to Box", Icon: FileUpIcon };
    default:
      return { label: name, Icon: WrenchIcon };
  }
}

const DETAIL_KEYS = ["query", "question", "filename", "fileId"];

function detail(args: Record<string, unknown> | undefined): string | null {
  if (!args) return null;
  for (const key of DETAIL_KEYS) {
    const value = args[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

function stringify(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function StatusGlyph({ status }: { status: ToolStatus }) {
  if (status === "running") return <LoaderIcon className="size-3.5 animate-spin text-primary" />;
  if (status === "error") return <XIcon className="size-3.5 text-destructive" />;
  return <CheckIcon className="size-3.5 text-emerald-500" />;
}

export function ToolActivity({ name, args, output, status }: ToolActivityProps) {
  const [open, setOpen] = useState(false);
  const { label, Icon } = meta(name);
  const subtitle = detail(args);
  const argsText = args && Object.keys(args).length > 0 ? stringify(args) : "";
  const outputText = stringify(output);
  const hasBody = Boolean(argsText || outputText);

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="overflow-hidden rounded-lg border bg-card"
    >
      <CollapsibleTrigger
        disabled={!hasBody}
        className={cn(
          "flex items-center gap-2 px-3 py-2 text-left text-xs",
          hasBody && "hover:bg-accent/60",
        )}
      >
        <Icon className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="font-medium text-foreground">{label}</span>
        {subtitle && (
          <span className="truncate font-mono text-[0.7rem] text-muted-foreground">{subtitle}</span>
        )}
        <span className="ml-auto flex shrink-0 items-center gap-1.5">
          <StatusGlyph status={status} />
          {hasBody && (
            <ChevronRightIcon
              className={cn(
                "size-3.5 text-muted-foreground transition-transform",
                open && "rotate-90",
              )}
            />
          )}
        </span>
      </CollapsibleTrigger>

      {hasBody && (
        <CollapsibleContent className="space-y-2 border-t px-3 py-2">
          {argsText && (
            <div className="space-y-1">
              <p className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
                Input
              </p>
              <pre className="max-h-40 overflow-auto rounded-md bg-muted p-2 font-mono text-[0.7rem] leading-relaxed">
                {argsText}
              </pre>
            </div>
          )}
          {outputText && (
            <div className="space-y-1">
              <p className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
                Output
              </p>
              <pre className="max-h-48 overflow-auto rounded-md bg-muted p-2 font-mono text-[0.7rem] leading-relaxed whitespace-pre-wrap">
                {outputText}
              </pre>
            </div>
          )}
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}
