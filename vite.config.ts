import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// The LangGraph dev server (`langgraphjs dev`) hosts both the agent API and our
// custom `/api/*` routes (see `langgraph.json` -> `http.app`). Vite serves the
// React app and proxies everything else to LangGraph so the browser stays
// single-origin and tokens never reach the client.
// When deploying, the SPA is served behind a custom `/ui` path on the LangGraph
// server (see the `deploy` scripts in package.json and `agent/app.ts`). The
// deploy build sets `UI_BASE=/ui/` so asset URLs carry that prefix; dev keeps `/`.
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };

  const LANGGRAPH_URL = env.LANGGRAPH_URL ?? "http://127.0.0.1:2024";
  const UI_BASE = env.UI_BASE ?? "/";

  return {
    root: "src",
    base: UI_BASE,
    plugins: [react(), tailwindcss()],
    clearScreen: false,
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: {
      port: Number(env.PORT ?? 3000),
      proxy: {
        "/api": LANGGRAPH_URL,
        "/lg": {
          target: LANGGRAPH_URL,
          rewrite: (path) => path.replace(/^\/lg/, ""),
          // The dev server (`langgraphjs dev`) enforces the same custom auth as
          // the deployment (see `agent/auth.ts`), so inject the shared secret
          // here just like the deployed `/lg` proxy does.
          headers: env.UI_PROXY_SECRET
            ? { "x-ui-proxy-secret": env.UI_PROXY_SECRET }
            : undefined,
        },
      },
    },
    build: {
      // Emit next to `app.ts` so the Hono server can serve it from `./ui`.
      // This output is gitignored and excluded from the deploy archive; the
      // deploy build (re)generates it inside the image via `npm run deploy:ui`
      // (see the `deploy` --build-command in package.json), so nothing built
      // ever needs to be committed.
      outDir: "../agent/ui",
      emptyOutDir: true,
    },
  };
});