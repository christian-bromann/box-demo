import { createDeepAgent } from "deepagents";
import { model } from "./model.js";
import { responsesHistoryFix } from "./middleware.js";
import { ORCHESTRATOR_PROMPT } from "./prompts.js";
import { subagents } from "./subagents.js";
import {
  searchBoxFiles, listBoxFiles, extractBoxFields, askBoxAi,
  createBoxFolder, writeSummaryToBox
} from "./tools.js";

export const agent = createDeepAgent({
  model,
  tools: [
    searchBoxFiles,
    listBoxFiles,
    extractBoxFields,
    askBoxAi,
    createBoxFolder,
    writeSummaryToBox
  ],
  subagents,
  systemPrompt: ORCHESTRATOR_PROMPT,
  middleware: [responsesHistoryFix],
}).withConfig({
  recursionLimit: 1000
});
