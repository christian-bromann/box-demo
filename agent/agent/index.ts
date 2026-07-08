import { createDeepAgent } from "deepagents";
import { model } from "./model.js";
import { responsesHistoryFix } from "./middleware.js";
import { ORCHESTRATOR_PROMPT } from "./prompts.js";
import { subagents } from "./subagents.js";
import { backend } from "./backend.js";
import {
  searchBoxFiles, listBoxFiles, extractBoxFields, askBoxAi
} from "./tools.js";

export const agent = createDeepAgent({
  /** The model to use for the orchestrator agent. */
  model,
  /** Give agent access to the Box knowledge base. */
  backend,
  /** Give agent access to the Box tools. */
  tools: [
    searchBoxFiles,
    listBoxFiles,
    extractBoxFields,
    askBoxAi
  ],
  /** Give agent access to the subagents. */
  subagents,
  /** The system prompt to use for the orchestrator agent. */
  systemPrompt: ORCHESTRATOR_PROMPT,
  /** The middleware to use for the orchestrator agent. */
  middleware: [responsesHistoryFix],
}).withConfig({
  recursionLimit: 1000
});
