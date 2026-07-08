import type { SubAgent } from "deepagents";
import { responsesHistoryFix } from "./middleware.js";
import {
  searchBoxFiles, listBoxFiles, extractBoxFields, askBoxAi,
  createBoxFolder, writeSummaryToBox
} from "./tools.js";
import {
  CONTRACTS_RESEARCHER_PROMPT,
  POLICY_RESEARCHER_PROMPT,
  SECURITY_RESEARCHER_PROMPT,
} from "./prompts.js";

const tools = [
  searchBoxFiles, listBoxFiles, extractBoxFields, askBoxAi,
  createBoxFolder, writeSummaryToBox
];

export const subagents: SubAgent[] = [
  {
    name: "security-researcher",
    description:
      "Researches security, SOC 2, compliance, and data-protection questions against the Box " +
      "knowledge base. Returns findings grounded in specific Box files.",
    systemPrompt: SECURITY_RESEARCHER_PROMPT,
    tools,
    middleware: [responsesHistoryFix],
  },
  {
    name: "contracts-researcher",
    description:
      "Researches vendor contracts and commercial terms (dates, renewal, liability, pricing) " +
      "against the Box knowledge base. Returns findings grounded in specific Box files.",
    systemPrompt: CONTRACTS_RESEARCHER_PROMPT,
    tools,
    middleware: [responsesHistoryFix],
  },
  {
    name: "policy-researcher",
    description:
      "Researches HR, company, and general policy questions against the Box knowledge base. " +
      "Returns findings grounded in specific Box files.",
    systemPrompt: POLICY_RESEARCHER_PROMPT,
    tools,
    middleware: [responsesHistoryFix],
  },
];
