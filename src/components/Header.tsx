import { useEffect, useState } from "react";
import { BoxIcon, MoonIcon, PlusIcon, SunIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function Header({
  modelLabel,
  boxConfigured,
  hasMessages,
  onNewChat,
}: {
  modelLabel: string | null;
  boxConfigured: boolean;
  hasMessages: boolean;
  onNewChat: () => void;
}) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <header className="flex shrink-0 items-center justify-between gap-3 border-b bg-card/70 px-4 py-2.5 backdrop-blur">
      <div className="flex items-center gap-2.5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <BoxIcon className="size-4.5" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">Enterprise Knowledge Assistant</div>
          <div className="hidden text-[0.7rem] text-muted-foreground sm:block">
            Acme Corp · Box + LangChain Deep Agents
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {modelLabel && (
          <Badge variant="secondary" className="hidden font-mono sm:inline-flex">
            {modelLabel}
          </Badge>
        )}
        <Badge variant={boxConfigured ? "success" : "outline"} className="hidden sm:inline-flex">
          Box {boxConfigured ? "connected" : "not configured"}
        </Badge>
        {hasMessages && (
          <Button variant="ghost" size="sm" onClick={onNewChat} className="gap-1.5">
            <PlusIcon className="size-4" />
            <span className="hidden sm:inline">New chat</span>
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => setDark((d) => !d)}
          title="Toggle theme"
        >
          {dark ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
        </Button>
      </div>
    </header>
  );
}
