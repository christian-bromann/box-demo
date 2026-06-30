import { tool } from "langchain";
import { z } from "zod";
import type { StructuredTool } from "@langchain/core/tools";
import { getBoxService } from "../box/client.js";

function rootFolderId(): string {
  const id = process.env.BOX_ROOT_FOLDER_ID?.trim();
  if (!id) {
    throw new Error("BOX_ROOT_FOLDER_ID is not set. Run `bun run seed` and copy the folder id.");
  }
  return id;
}

export function buildBoxTools(): StructuredTool[] {
  const searchBoxFiles = tool(
    async ({ query }: { query: string }) => {
      const results = await getBoxService().search(query, rootFolderId());
      if (results.length === 0) {
        return `No files in the knowledge base matched "${query}". Try a broader query or use list_box_files.`;
      }
      const lines = results.map((f) => `- ${f.name} (fileId: ${f.id}) — ${f.url}`);
      return `Found ${results.length} matching file(s):\n${lines.join("\n")}`;
    },
    {
      name: "search_box_files",
      description:
        "Search the company knowledge base in Box by keywords. Matches file names AND file " +
        "contents. Returns matching files with their fileId and Box URL. Use this first to " +
        "discover which documents are relevant to the user's question.",
      schema: z.object({
        query: z.string().describe("Keywords to search for, e.g. 'SOC 2 data retention'."),
      }),
    },
  );

  const listBoxFiles = tool(
    async () => {
      const items = await getBoxService().listFolderItems(rootFolderId());
      const files = items.filter((i) => i.type === "file");
      if (files.length === 0) return "The knowledge base folder is empty.";
      const lines = files.map((f) => `- ${f.name} (fileId: ${f.id}) — ${f.url}`);
      return `The knowledge base contains ${files.length} file(s):\n${lines.join("\n")}`;
    },
    {
      name: "list_box_files",
      description:
        "List every file in the company knowledge base folder in Box, with fileId and URL. " +
        "Use this to get an overview of available documents.",
      schema: z.object({}),
    },
  );

  const askBoxAi = tool(
    async ({ fileIds, question }: { fileIds: string[]; question: string }) => {
      const { answer, citations } = await getBoxService().ask(fileIds, question);
      const sources = citations.map((c) => `- [${c.name}](${c.url})`).join("\n");
      return `Box AI answer:\n${answer}\n\nGrounded in:\n${sources}`;
    },
    {
      name: "ask_box_ai",
      description:
        "Ask Box AI a question grounded in the contents of one or more specific Box files. " +
        "Box AI reads the documents (PDF, DOCX, TXT, etc.) and answers from their actual " +
        "content. Always pass the fileIds you discovered via search_box_files or list_box_files. " +
        "Pass multiple fileIds when a question spans several documents.",
      schema: z.object({
        fileIds: z
          .array(z.string())
          .min(1)
          .describe("One or more Box fileIds to ground the answer in."),
        question: z.string().describe("The question to ask about those files."),
      }),
    },
  );

  const extractBoxFields = tool(
    async ({
      fileId,
      fields,
    }: {
      fileId: string;
      fields: { key: string; description: string; type?: string }[];
    }) => {
      const data = await getBoxService().extractStructured([fileId], fields);
      return `Extracted fields from fileId ${fileId}:\n${JSON.stringify(data, null, 2)}`;
    },
    {
      name: "extract_box_fields",
      description:
        "Use Box AI Extract to pull specific structured fields out of a single Box file " +
        "(e.g. effective_date, liability_cap, renewal_term from a contract). Returns a JSON " +
        "object keyed by the field names you request.",
      schema: z.object({
        fileId: z.string().describe("The Box fileId to extract from."),
        fields: z
          .array(
            z.object({
              key: z.string().describe("Field name, e.g. 'liability_cap'."),
              description: z.string().describe("What this field represents."),
              type: z
                .string()
                .optional()
                .describe("One of: string, date, float, multiSelect."),
            }),
          )
          .min(1)
          .describe("The fields to extract."),
      }),
    },
  );

  const writeSummaryToBox = tool(
    async ({ filename, markdown }: { filename: string; markdown: string }) => {
      const safe = filename.endsWith(".md") ? filename : `${filename}.md`;
      const file = await getBoxService().uploadFile(rootFolderId(), safe, markdown);
      return `Wrote summary to Box: [${file.name}](${file.url}) (fileId: ${file.id}).`;
    },
    {
      name: "write_summary_to_box",
      description:
        "Save a Markdown report back to the knowledge base folder in Box so colleagues can " +
        "find it. Use this only when the user asks for a written summary, report, or briefing " +
        "to be saved.",
      schema: z.object({
        filename: z
          .string()
          .describe("File name for the report, e.g. 'security-posture-summary.md'."),
        markdown: z.string().describe("The full Markdown content of the report."),
      }),
    },
  );

  return [searchBoxFiles, listBoxFiles, askBoxAi, extractBoxFields, writeSummaryToBox];
}
