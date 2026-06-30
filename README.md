# Enterprise Knowledge Assistant — Box + LangChain Deep Agents

A live-demo-ready **enterprise RAG agent** that answers employee questions grounded in a
**Box** knowledge base. It plans its approach, searches Box, reads documents with **Box AI**,
delegates broad questions to specialist **subagents**, and streams its answer with **inline
citations** back to a polished React UI.

Built with **[Bun](https://bun.com)**, **[LangChain Deep Agents](https://github.com/langchain-ai/deepagents)**,
the **[Box Node SDK](https://github.com/box/box-node-sdk)**, and **React + Tailwind**, with
streaming powered by the LangGraph dev server and the `@langchain/react` `useStream` hook.

---

## What it shows

- **Agentic planning** — the agent writes a to-do plan before doing multi-step work.
- **Box-grounded answers** — every claim comes from a document read via Box AI Ask / Extract.
- **Subagents** — broad questions ("summarize our security posture") fan out to
  `security-researcher`, `contracts-researcher`, and `policy-researcher`.
- **Live activity panel** — plan, Box tool calls (with inputs/outputs), and subagent progress
  stream in real time.
- **Citations** — answers end with Box file links, rendered as clickable source chips.
- **No tokens in the browser** — the SPA talks only to the Vite dev server, which proxies to the
  LangGraph server that holds all Box / LLM credentials server-side.

---

## Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│ Browser (React SPA)                                                  │
│   useStream(apiUrl: /lg)  →  chat · sidebar · activity · citations   │
└───────────────┬────────────────────────────────────────────────────┘
                │ same-origin HTTP
┌───────────────▼────────────────────────────────────────────────────┐
│ Vite dev server  (vite, :3000)                                      │
│   • serves the React SPA (src/) with HMR                            │
│   • proxies /api/*  ──▶  LangGraph custom routes                    │
│   • proxies /lg/*   ──▶  LangGraph agent API (strips /lg prefix)    │
└───────────────┬────────────────────────────────────────────────────┘
                │
┌───────────────▼────────────────────────────────────────────────────┐
│ LangGraph dev server  (langgraphjs dev, :2024)                      │
│   graph: knowledge-assistant  =  createDeepAgent(...)               │
│     model · ORCHESTRATOR_PROMPT · subagents · Box tools             │
│   http.app: agent/app.ts (Hono)                                     │
│     • GET /api/config   model + Box status + suggestions            │
│     • GET /api/files    lists the Box knowledge-base folder         │
└───────────────┬────────────────────────────────────────────────────┘
                │ Box Node SDK
┌───────────────▼────────────────────────────────────────────────────┐
│ Box  —  Search · AI Ask · AI Extract · Folder list · Upload         │
└────────────────────────────────────────────────────────────────────┘
```

`bun run dev` launches the LangGraph dev server and the Vite dev server together in parallel
(via `run-p` from `npm-run-all2`). The `/api/*` endpoints are served by LangGraph via a custom
Hono app (`langgraph.json` → `http.app`), so Box / LLM credentials stay server-side.

---

## Prerequisites

- **Bun** ≥ 1.1 — https://bun.com
- A **Box** account with **Box AI** enabled (Enterprise / Enterprise Plus, or a Developer
  account with AI access).
- An **OpenAI** or **Anthropic** API key.

---

## Setup

### 1. Install

```bash
bun install
```

### 2. Configure credentials

```bash
cp .env.example .env
```

Fill in `.env`:

**Box auth — pick one:**

- **Developer Token** (easiest for a webinar): in the
  [Box Developer Console](https://app.box.com/developers/console), open your app and click
  *Generate Developer Token* (valid 60 min). Set `BOX_DEVELOPER_TOKEN`.
- **Client Credentials Grant** (server-to-server, auto-refreshing): set `BOX_CLIENT_ID`,
  `BOX_CLIENT_SECRET`, and one of `BOX_USER_ID` (act as a user) or `BOX_ENTERPRISE_ID` (act as
  the service account). The app must be authorized in the Admin Console.

**Model — set one key:** `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`. Override the model with
`OPENAI_MODEL` / `ANTHROPIC_MODEL` if needed.

> **Model note:** the default `OPENAI_MODEL` is `gpt-5.5-mini`. If that model is not yet
> available on your account, set `OPENAI_MODEL=gpt-5-mini` (or another model you have access to).

### 3. Verify Box access (optional)

```bash
bun run whoami
```

Prints the authenticated Box user, and the knowledge-base files if `BOX_ROOT_FOLDER_ID` is set.

### 4. Seed the knowledge base

Uploads the seven Acme Corp fixture documents (`fixtures/`) into a new Box folder:

```bash
bun run seed
```

Copy the printed folder id into `.env`:

```
BOX_ROOT_FOLDER_ID=123456789
```

### 5. Run

```bash
bun run dev
```

Then open **http://localhost:3000**.

---

## Scripts

| Script | What it does |
| --- | --- |
| `bun run dev` | Start the LangGraph dev server (:2024) **and** the Vite dev server (:3000) |
| `bun run dev:web` | Vite dev server only (`vite`) |
| `bun run dev:agent` | LangGraph dev server only (`langgraphjs dev`) |
| `bun run build` | Build the SPA for production (`vite build` → `dist/`) |
| `bun run preview` | Preview the production build (`vite preview`) |
| `bun run seed` | Upload the fixture docs to Box and print the folder id |
| `bun run whoami` | Verify Box credentials and list the knowledge-base files |
| `bun run typecheck` | `tsc --noEmit` |

---

## Demo talk track (~5 minutes)

1. **Frame it.** "This is an enterprise knowledge assistant. The content lives in Box, and the
   brains is a LangChain Deep Agent. Nothing is answered from the model's memory — only from our
   documents."

2. **Simple, grounded lookup.** Click *"How many vacation days do employees get, and what is the
   remote-work policy?"*
   Point at the **activity panel**: the agent searches Box, reads the handbook with Box AI, and
   the answer ends with a **source chip** linking straight to the Box file.

3. **Structured extraction.** Ask *"When does the CloudVault vendor contract renew, and what is
   the liability cap?"*
   Highlight that it pulls exact terms (renewal date **2027-03-01**, liability cap **the greater
   of $500k or trailing-12-month fees**) — show the tool call input/output and the citation.

4. **The "wow" — multi-agent research.** Click *"Summarize our overall security posture across
   SOC 2, the security questionnaire, and our policies."*
   Watch the **plan** appear, then **subagents** spin up in parallel (security / contracts /
   policy), each reporting back before the lead agent synthesizes one cited answer.

5. **Close the loop (optional).** Ask it to *"save that as a summary to Box."* The
   `write_summary_to_box` tool writes a Markdown report back into the knowledge base — refresh the
   sidebar to show the new file.

6. **The point.** Governance and access live in Box; the agent only ever sees what it's allowed
   to, and every answer is traceable to a source.

---

## Project structure

```
box-demo/
├── agent/
│   ├── app.ts              Hono app: /api/* custom routes (langgraph http.app)
│   ├── box/client.ts       Box Node SDK wrapper (auth, search, AI, upload)
│   ├── agent/
│   │   ├── index.ts        createDeepAgent → exported as the LangGraph graph
│   │   ├── model.ts        provider selection (OpenAI / Anthropic)
│   │   ├── prompts.ts      orchestrator + subagent system prompts
│   │   ├── subagents.ts    security / contracts / policy researchers
│   │   └── tools.ts        Box tools as LangChain tools
│   └── suggestions.ts      starter questions for the UI
├── src/                    React SPA (useStream), components, Tailwind theme
├── scripts/
│   ├── seed.ts             upload fixtures to Box
│   └── whoami.ts           verify Box auth
├── fixtures/               7 Acme Corp sample documents
├── vite.config.ts          Vite dev server + /api and /lg proxies
├── langgraph.json          graph + http.app + env config for LangGraph
└── .env.example
```

---

## Troubleshooting

- **"BOX_ROOT_FOLDER_ID is not set"** — run `bun run seed` and copy the folder id into `.env`.
- **Box 401 / token expired** — Developer Tokens last 60 minutes; regenerate it, or switch to
  Client Credentials Grant for a long session.
- **Box AI errors** — confirm Box AI is enabled for your account and that the service
  account/user has access to the knowledge-base folder.
- **"LangGraph server not reachable"** — the agent server (`:2024`) is still starting; give it a
  few seconds, or run `bun run dev:agent` in its own terminal to watch its logs.
- **Model errors** — make sure the `OPENAI_MODEL` / `ANTHROPIC_MODEL` you set is one your key can
  access (see the model note above).
