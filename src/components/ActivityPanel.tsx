import {
  ActivityIcon,
  CircleCheckIcon,
  CircleDotIcon,
  CircleIcon,
  ListTodoIcon,
  UsersIcon,
} from "lucide-react";
import type { AssembledToolCall, SubagentDiscoverySnapshot } from "@langchain/react";
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

function SubagentsSection({ subagents }: { subagents: SubagentDiscoverySnapshot[] }) {
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
          <div key={s.id} className="rounded-lg border bg-card p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold">{s.name}</span>
              <Badge
                variant={
                  s.status === "complete" ? "success" : s.status === "error" ? "outline" : "muted"
                }
              >
                {s.status === "complete" ? "done" : s.status === "error" ? "error" : "working…"}
              </Badge>
            </div>
            {s.taskInput && (
              <p className="mt-1.5 line-clamp-3 text-[0.7rem] leading-snug text-muted-foreground">
                {s.taskInput}
              </p>
            )}
          </div>
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
  todos,
  toolCalls,
  subagents,
  active,
}: {
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
            <SubagentsSection subagents={subagents} />
            <ToolsSection toolCalls={toolCalls} />
          </>
        )}
      </div>
    </aside>
  );
}
