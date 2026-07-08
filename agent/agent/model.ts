import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!OPENAI_API_KEY && !ANTHROPIC_API_KEY) {
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
const REASONING_EFFORT = (process.env.REASONING_EFFORT ?? "medium") as
  | "minimal"
  | "low"
  | "medium"
  | "high";

export const model = OPENAI_API_KEY
  ? new ChatOpenAI({
    model: "gpt-5-mini",
    useResponsesApi: true,
    reasoning: { effort: REASONING_EFFORT, summary: "detailed" },
  })
  : new ChatAnthropic({
    model: "claude-sonnet-5",
    thinking: { type: "enabled", budget_tokens: REASONING_BUDGET },
    maxTokens: REASONING_BUDGET + 4096,
  });
