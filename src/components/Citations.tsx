import { FileTextIcon } from "lucide-react";
import type { Citation } from "@/lib/messages";

export function Citations({ citations }: { citations: Citation[] }) {
  if (citations.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      <span className="text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">
        Sources
      </span>
      {citations.map((c) => (
        <a
          key={c.url}
          href={c.url}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex max-w-[16rem] items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary hover:bg-accent hover:text-accent-foreground"
          title={c.name}
        >
          <FileTextIcon className="size-3 shrink-0 text-primary" />
          <span className="truncate">{c.name}</span>
        </a>
      ))}
    </div>
  );
}
