import { timingSafeEqual } from "node:crypto";
import { Auth, HTTPException } from "@langchain/langgraph-sdk/auth";

// Custom authentication for the deployment (see `langgraph.json` -> `auth`).
// It replaces the platform's default `langsmith` auth so the graph API can be
// reached without a LangSmith API key in the browser.
//
// The browser never calls the graph API directly — it goes through the
// same-origin `/lg` proxy in `app.ts`, which injects this shared secret
// (server-side only, uploaded from `.env`). So:
//   - requests carrying the secret (the proxy hop) are trusted, and
//   - our own custom routes (`/ui`, `/api/*`, `/lg/*`) stay reachable so the
//     browser can load the app and hit the proxy,
//   - everything else (anonymous, direct hits on the core API) is rejected.
const PROXY_SECRET = process.env.UI_PROXY_SECRET?.trim();

const PROXY_USER = {
  identity: "ui-proxy",
  display_name: "UI proxy",
  is_authenticated: true,
  permissions: [] as string[],
};

function secretMatches(provided: string): boolean {
  if (!PROXY_SECRET) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(PROXY_SECRET);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const auth = new Auth().authenticate((request: Request) => {
  const provided = request.headers.get("x-ui-proxy-secret");
  if (provided && secretMatches(provided)) return PROXY_USER;

  const path = new URL(request.url).pathname;
  if (
    path === "/ui" ||
    path.startsWith("/ui/") ||
    path.startsWith("/api/") ||
    path.startsWith("/lg/")
  ) {
    return PROXY_USER;
  }

  throw new HTTPException(401, { message: "Missing or invalid UI proxy credentials." });
});
