import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

export interface ModelInfo {
  provider: "openai" | "anthropic";
  model: string;
}

export function describeModel(): ModelInfo {
  if (process.env.OPENAI_API_KEY) {
    return { provider: "openai", model: process.env.OPENAI_MODEL ?? "gpt-5.5-mini" };
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return { provider: "anthropic", model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5" };
  }
  throw new Error(
    "No LLM API key found. Set OPENAI_API_KEY or ANTHROPIC_API_KEY in your .env file.",
  );
}

/** Token budget for the model's internal reasoning / extended thinking. */
const REASONING_BUDGET = Number(process.env.REASONING_BUDGET_TOKENS ?? 2048);

/**
 * How hard the model should think. Higher effort makes reasoning models spend
 * more tokens thinking, which makes them far more likely to emit a reasoning
 * summary on every turn (with `"minimal"`/`"low"` they often skip it).
 */
const REASONING_EFFORT = (process.env.REASONING_EFFORT ?? "high") as
  | "minimal"
  | "low"
  | "medium"
  | "high";

export function buildModel(): BaseChatModel {
  const info = describeModel();
  if (info.provider === "openai") {
    // The Responses API is required to stream reasoning summaries back to the
    // client as `reasoning` content blocks. `summary: "detailed"` asks OpenAI
    // to always surface a summary rather than deciding per-turn (`"auto"`).
    return new ChatOpenAI({
      model: info.model,
      useResponsesApi: true,
      reasoning: { effort: REASONING_EFFORT, summary: "detailed" },
    });
  }
  // Extended thinking emits `reasoning` content blocks. `maxTokens` must leave
  // room for the visible answer on top of the thinking budget.
  return new ChatAnthropic({
    model: info.model,
    thinking: { type: "enabled", budget_tokens: REASONING_BUDGET },
    maxTokens: REASONING_BUDGET + 4096,
  });
}
