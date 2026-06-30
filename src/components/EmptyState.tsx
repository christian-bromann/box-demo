import { ArrowRightIcon, SparklesIcon } from "lucide-react";

export function EmptyState({
  suggestions,
  onPick,
  disabled,
}: {
  suggestions: string[];
  onPick: (text: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-4 py-10">
      <div className="w-full max-w-2xl text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
          <SparklesIcon className="size-6" />
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">
          Enterprise Knowledge Assistant
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Ask anything about the Acme Corp knowledge base. The agent plans its approach, searches
          Box, reads documents with Box AI, and answers with citations.
        </p>

        <div className="mt-7 grid gap-2.5 text-left sm:grid-cols-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              disabled={disabled}
              onClick={() => onPick(s)}
              className="group flex items-start justify-between gap-3 rounded-xl border bg-card p-3.5 text-sm shadow-sm transition-colors hover:border-primary hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="leading-snug">{s}</span>
              <ArrowRightIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
