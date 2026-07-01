import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { Hono } from "hono";
import { proxy } from "hono/proxy";
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
// The browser talks to the graph API through this same-origin proxy so no
// credential ever reaches the client. This route is a custom HTTP route, so it
// reaches the server directly; we forward to the internal graph server on
// `127.0.0.1:$PORT` and inject a server-only shared secret that our custom auth
// handler (`auth.ts`) trusts. Direct, anonymous hits on the core API are
// rejected. In dev, Vite proxies `/lg` straight to the dev server (which has no
// auth) and this route is never hit.
const INTERNAL_API_URL =
  process.env.LANGGRAPH_API_URL?.trim() ||
  `http://127.0.0.1:${process.env.PORT?.trim() || "8000"}`;
const UI_PROXY_SECRET = process.env.UI_PROXY_SECRET?.trim();

app.all("/lg/*", (c) => {
  const target = new URL(INTERNAL_API_URL);
  target.pathname = c.req.path.replace(/^\/lg/, "") || "/";
  target.search = new URL(c.req.url).search;

  // Inject the shared secret onto a copy of the original request. Hono's
  // `proxy` then forwards it verbatim — streaming the body and stripping
  // hop-by-hop headers (transfer-encoding, etc.) from both request and
  // response — so we keep the browser's headers (content-type) without
  // hand-rolling any of that. Passing `headers` directly would replace them all.
  const headers = new Headers(c.req.raw.headers);
  if (UI_PROXY_SECRET) headers.set("x-ui-proxy-secret", UI_PROXY_SECRET);

  return proxy(target, { raw: new Request(c.req.raw, { headers }) });
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
