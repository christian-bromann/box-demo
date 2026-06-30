import type { SubAgent } from "deepagents";
import type { StructuredTool } from "@langchain/core/tools";
import {
  CONTRACTS_RESEARCHER_PROMPT,
  POLICY_RESEARCHER_PROMPT,
  SECURITY_RESEARCHER_PROMPT,
} from "./prompts.js";

export function buildSubagents(tools: StructuredTool[]): SubAgent[] {
  return [
    {
      name: "security-researcher",
      description:
        "Researches security, SOC 2, compliance, and data-protection questions against the Box " +
        "knowledge base. Returns findings grounded in specific Box files.",
      systemPrompt: SECURITY_RESEARCHER_PROMPT,
      tools,
    },
    {
      name: "contracts-researcher",
      description:
        "Researches vendor contracts and commercial terms (dates, renewal, liability, pricing) " +
        "against the Box knowledge base. Returns findings grounded in specific Box files.",
      systemPrompt: CONTRACTS_RESEARCHER_PROMPT,
      tools,
    },
    {
      name: "policy-researcher",
      description:
        "Researches HR, company, and general policy questions against the Box knowledge base. " +
        "Returns findings grounded in specific Box files.",
      systemPrompt: POLICY_RESEARCHER_PROMPT,
      tools,
    },
  ];
}
