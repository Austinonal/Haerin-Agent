# 0001 — MVP architecture

Date: 2026-10-12 · Status: accepted

## Context
Small personal app: Windows (16 GB RAM) + phone via PWA, free-tier first, Local (Ollama) and Cloud (Gemini) AI, privacy-sensitive, beginner maintainer.

## Decisions
- **One package, three TS projects** (`tsconfig.app/worker/node.json`): React+Vite frontend in `src/`, Cloudflare Worker in `workers/`, shared wire types in `shared/`. No monorepo tooling.
- **Neutral stream protocol** (`shared/protocol.ts`): the Worker converts Gemini SSE into NDJSON `StreamEvent`s, the same shape the Ollama adapter yields. UI only knows `ChatProvider` + `StreamEvent`.
- **Router is pure and has no fallback** (`src/services/ai/router.ts`). Failures surface as error messages with explicit user-chosen retry options; Local Only never offers cloud.
- **Model choice for Gemini lives on the server** (`GEMINI_MODEL` in `wrangler.toml`). The client cannot pick a model or URL → no open proxy, no client-side allow-list drift.
- **Cloud consent per conversation**, stored on the conversation; not restored from imports.
- **Persona is data** composed by `buildSystemPrompt`; provider adapters never contain persona text. Memories go to cloud only if `memoryToCloud` is on.
- **Storage:** raw IndexedDB (2 stores) + localStorage for non-secret settings. Backups exclude settings so an import can never change the AI mode.
- **No extra runtime deps** beyond React: hand-written validators (instead of zod), icons, fence renderer, service worker (instead of vite-plugin-pwa).

## Verified against docs
Ollama `/api/tags` and `/api/chat` shapes were checked against github.com/ollama/ollama/blob/main/docs/api.md on 2026-10-12.
Gemini `streamGenerateContent?alt=sse`, `x-goog-api-key`, `systemInstruction`/`contents` shape and `gemini-flash-latest` alias could **not** be fetched from ai.google.dev from the build environment (DNS blocked); they follow the documented v1beta REST API as known at the time and are covered by unit tests against recorded shapes only. Re-verify on first live run.

## Consequences / known gaps
- No auth on the deployed Worker: relies on CORS + Cloudflare dashboard rate limiting/Access (documented in README).
- No Tauri desktop build yet; no cross-device sync; no Local AI from phone.
- Search is a linear scan of loaded conversations.
