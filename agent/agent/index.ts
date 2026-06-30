import { createDeepAgent } from "deepagents";
import { buildModel } from "./model.js";
import { ORCHESTRATOR_PROMPT } from "./prompts.js";
import { buildSubagents } from "./subagents.js";
import { buildBoxTools } from "./tools.js";

const tools = buildBoxTools();

export const agent = createDeepAgent({
  model: buildModel(),
  tools,
  subagents: buildSubagents(tools),
  systemPrompt: ORCHESTRATOR_PROMPT,
});
