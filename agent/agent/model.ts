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

export function buildModel(): BaseChatModel {
  const info = describeModel();
  if (info.provider === "openai") {
    return new ChatOpenAI({ model: info.model });
  }
  return new ChatAnthropic({ model: info.model });
}
