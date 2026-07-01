import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
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

// ── LangGraph API proxy (`/lg/*`) ───────────────────────────────────────────
// The browser talks to the graph API through this same-origin proxy so the
// LangSmith API key never reaches the client. On LangGraph Platform the API
// key is enforced at the gateway in front of the container; custom HTTP routes
// (like this one and `/api/*`) reach the server directly, so forwarding to the
// internal server on `127.0.0.1:$PORT` bypasses that gateway. We still attach
// `x-api-key` when a key is present, so this also works if the server itself
// enforces auth. In dev, Vite proxies `/lg` straight to the dev server and
// this route is never hit.
const INTERNAL_API_URL =
  process.env.LANGGRAPH_API_URL?.trim() ||
  `http://127.0.0.1:${process.env.PORT?.trim() || "8000"}`;
const LG_API_KEY =
  process.env.LANGSMITH_API_KEY?.trim() || process.env.LANGGRAPH_API_KEY?.trim();

// Response headers that must not be copied verbatim: `fetch` already decodes
// the body, so a stale content-encoding/length would corrupt the stream.
const STRIPPED_RESPONSE_HEADERS = [
  "content-encoding",
  "content-length",
  "transfer-encoding",
  "connection",
];

app.all("/lg/*", async (c) => {
  const incoming = new URL(c.req.url);
  const target = new URL(INTERNAL_API_URL);
  target.pathname = incoming.pathname.replace(/^\/lg/, "") || "/";
  target.search = incoming.search;

  const headers = new Headers(c.req.raw.headers);
  headers.delete("host");
  headers.delete("content-length");
  if (LG_API_KEY) headers.set("x-api-key", LG_API_KEY);

  const method = c.req.method;
  const body =
    method === "GET" || method === "HEAD" ? undefined : await c.req.arrayBuffer();

  const upstream = await fetch(target, { method, headers, body, redirect: "manual" });

  const responseHeaders = new Headers(upstream.headers);
  for (const h of STRIPPED_RESPONSE_HEADERS) responseHeaders.delete(h);

  // Stream the (possibly SSE) body straight through without buffering.
  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
});

// ── Frontend (SPA) ──────────────────────────────────────────────────────────
// `bun run deploy` builds the React app into `agent/ui` (with base `/ui/`)
// before `langgraphjs deploy` bakes it into the image. It lives next to this
// file (not in a gitignored `dist/`) so the deploy archive — which honors
// `.gitignore` — actually ships it. We serve those assets here so a single
// deployment hosts both the agent API and its UI at `/ui`.
const UI_DIR = fileURLToPath(new URL("./ui", import.meta.url));

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

async function serveUiAsset(relPath: string): Promise<Response> {
  // Strip any `../` segments so a request can never escape the UI directory.
  const safe = normalize(relPath).replace(/^(\.\.(\/|\\|$))+/, "");
  let filePath = join(UI_DIR, safe);

  try {
    if ((await stat(filePath)).isDirectory()) {
      filePath = join(filePath, "index.html");
    }
    const body = await readFile(filePath);
    const ext = extname(filePath);
    const immutable = safe.startsWith("assets/");
    return new Response(body, {
      headers: {
        "content-type": MIME_TYPES[ext] ?? "application/octet-stream",
        "cache-control": immutable
          ? "public, max-age=31536000, immutable"
          : "no-cache",
      },
    });
  } catch {
    // SPA fallback: serve index.html for unknown (client-routed) paths.
    try {
      const html = await readFile(join(UI_DIR, "index.html"));
      return new Response(html, {
        headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache" },
      });
    } catch {
      return new Response(
        "UI assets not found. Run `bun run build` (or `bun run deploy`) to build the frontend.",
        { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } },
      );
    }
  }
}

app.get("/ui", (c) => c.redirect("/ui/"));
app.get("/ui/*", (c) => serveUiAsset(c.req.path.replace(/^\/ui\/?/, "")));
