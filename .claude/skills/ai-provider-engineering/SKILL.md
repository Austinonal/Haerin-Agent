---
name: ai-provider-engineering
description: Use when implementing or changing Cloud AI (Gemini), Local AI (Ollama) or Hybrid routing, streaming, cancellation, timeouts, provider errors, or the provider/model indicator in Haerin Agent. Enforces a common provider interface and no silent provider switching.
---

# AI Provider Engineering — Haerin Agent

## Modes (user-selected, explicit)
- **Local Only**: Ollama only. Zero cloud calls, ever — including fallback, title generation, embeddings, telemetry.
- **Cloud AI**: Gemini via the project backend.
- **Hybrid**: routing rules the user can see and configure. Any use of cloud for a request must be visible, and for sensitive content requires prior user authorization (below).

## Verify against official docs first
Model IDs, API formats, streaming formats and quotas change. Before coding or updating, check the official docs (Gemini API docs at ai.google.dev; Ollama docs/API reference at github.com/ollama/ollama/blob/main/docs/api.md and ollama.com) using WebFetch/WebSearch. Do not rely on memory for model names. Store model IDs in config/settings, not scattered literals; list local models from Ollama's own `/api/tags`. If docs cannot be reached, say so and mark values as unverified.

## Common provider interface
Define once in `src/providers/types.ts` (names illustrative):
```ts
interface AIProvider {
  id: 'gemini' | 'ollama';
  listModels(signal?: AbortSignal): Promise<ModelInfo[]>;
  health(signal?: AbortSignal): Promise<ProviderHealth>;
  streamChat(req: ChatRequest, signal: AbortSignal): AsyncIterable<ChatChunk>; // yields text deltas, final usage, typed errors
}
```
`ChatChunk`/`ProviderError` are provider-neutral (`kind`: `unavailable | timeout | auth | rate_limit | bad_request | malformed_response | cancelled | unknown`). UI and routing code depend only on this. Provider-specific payloads, headers, and SDKs stay inside the adapter.

## Gemini (cloud)
- Called only from the backend; key from server env; never sent to or readable by the browser.
- Backend endpoint accepts a validated request (message list, mode, model from an allow-list). **No user-supplied upstream URL, host, or headers.** Allow-list models and cap token/message/size limits.
- Stream to the client (SSE or chunked fetch), forward client aborts upstream, set timeouts, map upstream errors to neutral kinds without leaking raw upstream bodies or keys.

## Ollama (local)
- Default to `http://localhost:11434`; configurable host restricted to loopback/LAN by explicit user setting, never an open proxy.
- Browser-direct vs backend-mediated: decide and document (CORS/`OLLAMA_ORIGINS` requirements, mixed content on HTTPS). Local Only traffic must stay on the local machine/network.
- Handle: Ollama not running, model not pulled (offer the `ollama pull` command, don't pretend it exists), newline-delimited JSON streaming with partial lines, slow first token (model load).
- Not supported on every platform/browser setup (e.g. hosted HTTPS page to localhost); detect and explain instead of failing silently.

## Routing & transparency
- Router is a pure, unit-testable function: `(mode, settings, request, providerHealth) -> RouteDecision | Refusal`.
- **Never silently switch providers.** If the chosen provider fails, surface the error and offer an explicit "try with <other provider>" action. Local Only can never offer cloud as a one-click fallback without first changing the mode.
- Always show the **actual provider + model** used for each assistant message (store it in message metadata) — from what the provider reported/was configured, not guessed.
- Before sending anything flagged sensitive (user-defined rules, memory contents, imported files) to cloud, require explicit consent for that scope; remember choice only if the user opts in; cloud-bound content preview available.
- Never fabricate: no fake "available" models, no canned responses presented as model output, no mock success in production paths. Mock providers only in tests/dev and clearly labeled.

## Reliability
Per-request `AbortController`; Stop button wired end-to-end (client → backend → upstream); request timeouts plus a first-token timeout; no retry of non-idempotent partial streams without user action; bounded retry with backoff only for clearly transient errors, and visible when it happens; handle malformed/empty/truncated streams and safety-blocked responses distinctly; do not leave UI in a perpetual "loading" state.

## Checklist
- [ ] Docs consulted (record date/links in an ADR or code comment)
- [ ] Adapter implements the common interface; UI has no provider specifics
- [ ] Gemini key server-side only; no arbitrary upstream URLs
- [ ] Streaming, cancel, timeout, malformed-response, error paths implemented
- [ ] Router pure and tested; Local Only provably never calls cloud
- [ ] Provider + model shown per message; fallback is explicit and user-approved
- [ ] Consent flow for sensitive data to cloud

## Common failure modes
Hard-coded stale model names; fallback to cloud "for reliability"; abort not propagated upstream; parsing NDJSON/SSE by splitting chunks naively; swallowing errors into empty replies; sending the system prompt/memory to cloud in Local-Only-adjacent features (titles, summaries); CORS fixed by an open proxy.
