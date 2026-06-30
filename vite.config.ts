import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const LANGGRAPH_URL = process.env.LANGGRAPH_URL ?? "http://127.0.0.1:2024";

// The LangGraph dev server (`langgraphjs dev`) hosts both the agent API and our
// custom `/api/*` routes (see `langgraph.json` -> `http.app`). Vite serves the
// React app and proxies everything else to LangGraph so the browser stays
// single-origin and tokens never reach the client.
export default defineConfig({
  root: "src",
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: Number(process.env.PORT ?? 3000),
    proxy: {
      "/api": LANGGRAPH_URL,
      "/lg": {
        target: LANGGRAPH_URL,
        rewrite: (path) => path.replace(/^\/lg/, ""),
      },
    },
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
});
