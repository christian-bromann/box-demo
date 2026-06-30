import { useState } from "react";
import { ArrowUpIcon, SquareIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function Composer({
  onSubmit,
  onStop,
  isLoading,
  disabled,
}: {
  onSubmit: (text: string) => void;
  onStop: () => void;
  isLoading: boolean;
  disabled?: boolean;
}) {
  const [text, setText] = useState("");

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setText("");
  };

  return (
    <div className="shrink-0 border-t bg-background/80 backdrop-blur">
      <div className="mx-auto w-full max-w-3xl px-4 py-3">
        <div className="flex items-end gap-2 rounded-xl border bg-card p-2 shadow-sm focus-within:ring-2 focus-within:ring-ring">
          <Textarea
            value={text}
            rows={1}
            disabled={disabled}
            placeholder={
              disabled ? "Set your env vars to start chatting…" : "Ask about the Acme Corp knowledge base…"
            }
            className="max-h-40 min-h-10 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          {isLoading ? (
            <Button size="icon" variant="secondary" onClick={onStop} title="Stop">
              <SquareIcon className="size-4" />
            </Button>
          ) : (
            <Button size="icon" onClick={send} disabled={!text.trim() || disabled} title="Send">
              <ArrowUpIcon className="size-4" />
            </Button>
          )}
        </div>
        <p className="mt-1.5 px-1 text-[0.7rem] text-muted-foreground">
          Answers are grounded in your Box knowledge base via Box AI. Enter to send · Shift+Enter for
          a new line.
        </p>
      </div>
    </div>
  );
}
