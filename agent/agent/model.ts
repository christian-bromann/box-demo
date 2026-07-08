import { ChatAnthropic } from "@langchain/anthropic";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!ANTHROPIC_API_KEY) {
  throw new Error(
    "No LLM API key found. Set ANTHROPIC_API_KEY in your .env file.",
  );
}

/** Token budget for the model's extended thinking. Override via env. */
const THINKING_BUDGET = Number(process.env.THINKING_BUDGET_TOKENS ?? 2048);

export const model = new ChatAnthropic({
  model: process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5",
  thinking: { type: "enabled", budget_tokens: THINKING_BUDGET },
  maxTokens: THINKING_BUDGET + 4096,
});
