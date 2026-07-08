import { useEffect, useRef, useState } from "react";
import { BrainIcon, ChevronRightIcon } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

/**
 * Renders a model's reasoning / thinking token stream.
 *
 * While the reasoning is still streaming the panel stays expanded so the user
 * can watch it think. Once the stream ends it auto-collapses, but the user can
 * re-open it at any time to review what the model was thinking.
 */
export function Reasoning({
  reasoning,
  streaming,
}: {
  reasoning: string;
  streaming: boolean;
}) {
  const [open, setOpen] = useState(streaming);
  const prevStreaming = useRef(streaming);
  const endRef = useRef<HTMLDivElement>(null);

  // Auto-open while thinking, auto-collapse once the stream ends. User toggles
  // in between are preserved because we only react to transitions.
  useEffect(() => {
    if (streaming && !prevStreaming.current) setOpen(true);
    if (!streaming && prevStreaming.current) setOpen(false);
    prevStreaming.current = streaming;
  }, [streaming]);

  useEffect(() => {
    if (open && streaming) endRef.current?.scrollIntoView({ block: "nearest" });
  }, [reasoning, open, streaming]);

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="mb-2 overflow-hidden rounded-lg border bg-muted/40"
    >
      <CollapsibleTrigger className="flex items-center gap-2 px-3 py-2 text-left text-xs hover:bg-accent/60">
        <BrainIcon
          className={cn("size-3.5 shrink-0 text-primary", streaming && "animate-pulse")}
        />
        <span className={cn("font-medium text-foreground", streaming && "shimmer")}>
          {streaming ? "Thinking…" : "Thought process"}
        </span>
        <ChevronRightIcon
          className={cn(
            "ml-auto size-3.5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-90",
          )}
        />
      </CollapsibleTrigger>

      <CollapsibleContent className="border-t px-3 py-2">
        <div className="scroll-area max-h-56 overflow-y-auto whitespace-pre-wrap break-words text-[0.8rem] leading-relaxed text-muted-foreground">
          {reasoning}
          <div ref={endRef} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
