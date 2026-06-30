import { Hono } from "hono";
import { getBoxService } from "./box/client.js";
import { describeModel } from "./agent/model.js";
import { SUGGESTED_QUESTIONS } from "./suggestions.js";

// Custom HTTP routes mounted alongside the LangGraph dev server (see
// `langgraph.json` -> `http.app`). They run in the same process as the graph,
// so Box / LLM credentials stay server-side and never reach the browser.
export const app = new Hono();

app.get("/api/config", (c) => {
  let model: { provider: string; model: string } | null = null;
  let modelError: string | null = null;
  try {
    model = describeModel();
  } catch (err) {
    modelError = err instanceof Error ? err.message : String(err);
  }

  const folderId = process.env.BOX_ROOT_FOLDER_ID?.trim() ?? "";
  const boxConfigured = Boolean(
    process.env.BOX_DEVELOPER_TOKEN?.trim() ||
      (process.env.BOX_CLIENT_ID?.trim() &&
        process.env.BOX_CLIENT_SECRET?.trim() &&
        (process.env.BOX_USER_ID?.trim() || process.env.BOX_ENTERPRISE_ID?.trim())),
  );

  return c.json({
    model,
    modelError,
    folderId,
    boxConfigured,
    assistantId: "knowledge-assistant",
    suggestions: SUGGESTED_QUESTIONS,
  });
});

app.get("/api/files", async (c) => {
  try {
    const folderId = process.env.BOX_ROOT_FOLDER_ID?.trim();
    if (!folderId) {
      return c.json({ files: [], error: "BOX_ROOT_FOLDER_ID is not set." });
    }
    const items = await getBoxService().listFolderItems(folderId);
    const files = items
      .filter((f) => f.type === "file")
      .map((f) => ({ id: f.id, name: f.name, url: f.url, extension: f.extension }));
    return c.json({ files });
  } catch (err) {
    return c.json({
      files: [],
      error: err instanceof Error ? err.message : String(err),
    });
  }
});
