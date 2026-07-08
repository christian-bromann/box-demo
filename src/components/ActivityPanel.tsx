import { useState } from "react";
import {
  ActivityIcon,
  CircleCheckIcon,
  CircleDotIcon,
  CircleIcon,
  ListTodoIcon,
  UsersIcon,
} from "lucide-react";
import type { AnyStream, AssembledToolCall, SubagentDiscoverySnapshot } from "@langchain/react";
import { useToolCalls } from "@langchain/react";
import { ToolActivity, type ToolStatus } from "@/components/ToolActivity";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface TodoItem {
  content: string;
  status?: "pending" | "in_progress" | "completed" | string;
}

const HIDDEN_TOOLS = new Set(["task", "write_todos"]);

function PlanSection({ todos }: { todos: TodoItem[] }) {
  if (todos.length === 0) return null;
  return (
    <section className="space-y-2">
      <SectionHeading icon={<ListTodoIcon className="size-3.5" />}>Plan</SectionHeading>
      <ul className="space-y-1.5 rounded-lg border bg-card p-3">
        {todos.map((todo, i) => (
          <li key={i} className="flex items-start gap-2 text-xs">
            {todo.status === "completed" ? (
              <CircleCheckIcon className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
            ) : todo.status === "in_progress" ? (
              <CircleDotIcon className="mt-0.5 size-3.5 shrink-0 animate-pulse text-primary" />
            ) : (
              <CircleIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            )}
            <span
              className={cn(
                "leading-snug",
                todo.status === "completed" && "text-muted-foreground line-through",
              )}
            >
              {todo.content}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SubagentCard({
  stream,
  subagent,
}: {
  stream: AnyStream;
  subagent: SubagentDiscoverySnapshot;
}) {
  // Tool calls scoped to this subagent's namespace — this is what surfaces
  // "what the subagent is actually doing" (Box searches, AI reads, etc.).
  const toolCalls = useToolCalls(stream, subagent).filter((tc) => !HIDDEN_TOOLS.has(tc.name));
  const [taskOpen, setTaskOpen] = useState(false);
  const running = subagent.status === "running";

  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold">{subagent.name}</span>
        <Badge
          variant={
            subagent.status === "complete"
              ? "success"
              : subagent.status === "error"
                ? "outline"
                : "muted"
          }
        >
          {subagent.status === "complete" ? "done" : subagent.status === "error" ? "error" : "working…"}
        </Badge>
      </div>

      {subagent.taskInput && (
        <button
          type="button"
          onClick={() => setTaskOpen((v) => !v)}
          className="mt-1.5 block w-full text-left"
          title={taskOpen ? "Collapse task" : "Show full task"}
        >
          <p
            className={cn(
              "text-[0.7rem] leading-snug text-muted-foreground",
              !taskOpen && "line-clamp-2",
            )}
          >
            {subagent.taskInput}
          </p>
        </button>
      )}

      {subagent.error && (
        <p className="mt-1.5 text-[0.7rem] leading-snug text-destructive">{subagent.error}</p>
      )}

      {(toolCalls.length > 0 || running) && (
        <div className="mt-2 space-y-1.5 border-t pt-2">
          <p className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
            Activity{toolCalls.length > 0 ? ` · ${toolCalls.length}` : ""}
          </p>
          {toolCalls.length === 0 && running ? (
            <p className="text-[0.7rem] text-muted-foreground shimmer">Getting to work…</p>
          ) : (
            toolCalls.map((tc) => (
              <ToolActivity
                key={tc.id}
                name={tc.name}
                args={tc.args as Record<string, unknown>}
                output={tc.output ?? undefined}
                status={tc.status as ToolStatus}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function SubagentsSection({
  stream,
  subagents,
}: {
  stream: AnyStream;
  subagents: SubagentDiscoverySnapshot[];
}) {
  if (subagents.length === 0) return null;
  const done = subagents.filter((s) => s.status === "complete" || s.status === "error").length;
  const progress = (done / subagents.length) * 100;
  return (
    <section className="space-y-2">
      <SectionHeading icon={<UsersIcon className="size-3.5" />}>
        Subagents · {done}/{subagents.length}
      </SectionHeading>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="space-y-2">
        {subagents.map((s) => (
          <SubagentCard key={s.id} stream={stream} subagent={s} />
        ))}
      </div>
    </section>
  );
}

function ToolsSection({ toolCalls }: { toolCalls: AssembledToolCall[] }) {
  const visible = toolCalls.filter((tc) => !HIDDEN_TOOLS.has(tc.name));
  if (visible.length === 0) return null;
  return (
    <section className="space-y-2">
      <SectionHeading icon={<ActivityIcon className="size-3.5" />}>Tool calls</SectionHeading>
      <div className="space-y-2">
        {visible.map((tc) => (
          <ToolActivity
            key={tc.id}
            name={tc.name}
            args={tc.args as Record<string, unknown>}
            output={tc.output ?? undefined}
            status={tc.status as ToolStatus}
          />
        ))}
      </div>
    </section>
  );
}

function SectionHeading({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
      {icon}
      {children}
    </div>
  );
}

export function ActivityPanel({
  stream,
  todos,
  toolCalls,
  subagents,
  active,
}: {
  stream: AnyStream;
  todos: TodoItem[];
  toolCalls: AssembledToolCall[];
  subagents: SubagentDiscoverySnapshot[];
  active: boolean;
}) {
  const empty =
    todos.length === 0 &&
    subagents.length === 0 &&
    toolCalls.filter((tc) => !HIDDEN_TOOLS.has(tc.name)).length === 0;

  return (
    <aside className="hidden w-[22rem] shrink-0 flex-col border-l bg-card/60 xl:flex">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <ActivityIcon className="size-4 text-primary" />
        <span className="text-sm font-semibold">Agent activity</span>
        {active && (
          <span className="ml-auto text-[0.7rem] font-medium text-primary shimmer">working…</span>
        )}
      </div>
      <div className="scroll-area min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
        {empty ? (
          <p className="text-xs text-muted-foreground">
            The agent&apos;s plan, Box tool calls, and any subagents it spins up will appear here as
            it works.
          </p>
        ) : (
          <>
            <PlanSection todos={todos} />
            <SubagentsSection stream={stream} subagents={subagents} />
            <ToolsSection toolCalls={toolCalls} />
          </>
        )}
      </div>
    </aside>
  );
}
