---
name: fullstack-architecture
description: Use when creating modules, defining boundaries between UI, app logic, AI providers, storage and backend APIs, adding dependencies, or making structural decisions for Haerin Agent. Keeps a small personal app typed, layered, buildable and extensible.
---

# Fullstack Architecture — Haerin Agent

## Principle
A small personal app: one repo, one frontend, one thin backend. No microservices, queues, Kubernetes, or extra databases unless a documented requirement demands it.

## Layering (dependencies point downward only)
```
UI components  ->  app logic (hooks/services/state)  ->  ports (interfaces)
                                                          ├─ AI providers (Gemini, Ollama, ...)
                                                          ├─ storage (IndexedDB/local, optional sync)
                                                          └─ backend API client
Backend (server/): routes -> validation -> provider adapters -> config
shared/: types + schemas used by both sides (no runtime secrets)
```
- **UI** renders and dispatches intents; it never imports a provider SDK, reads env secrets, or builds prompts.
- **App logic** owns routing, conversation state, memory rules, import/export.
- **Providers** implement one interface (defined in `ai-provider-engineering`).
- **Storage** hides its engine behind a repository interface (`ConversationRepository`, `MemoryRepository`, `SettingsRepository`) so persistence can change without touching UI.
- **Backend API** holds secrets and cloud calls; the browser talks only to it (and to local Ollama only when permitted by mode).

Suggested layout (adapt to what exists; inspect first): `src/ui`, `src/app`, `src/providers`, `src/storage`, `src/shared` (or `shared/`), `server/`, `docs/decisions/`.

## Rules
- TypeScript, `strict` on; no `any` without a comment explaining why. Explicit types on module boundaries.
- Validate every API request **and** response with a schema (e.g. zod) at the boundary; derive TS types from schemas to avoid drift. Parse stored/imported data too.
- Env config: one typed config module that parses and validates env at startup and fails fast with a clear message. Server-only vars stay server-only. `.env.example` lists every variable with placeholder values.
- Components under ~200 lines; extract hooks/helpers rather than duplicating logic. Search for existing helpers before writing new ones.
- Stable interfaces: change an interface deliberately, update all implementers and tests in the same phase.
- Dependencies: add only with a clear benefit over ~30 lines of own code; prefer well-maintained, widely used packages; check license/size; record why in the PR/commit or ADR. Never run unknown install scripts.
- Keep the project **buildable after every phase**: typecheck + build before moving on.
- Document significant decisions as short ADRs in `docs/decisions/NNNN-title.md` (context, decision, alternatives, consequences).

## Checklist
- [ ] Inspected existing structure; extended rather than duplicated
- [ ] UI has no provider/storage/env specifics
- [ ] Interfaces + schemas defined at each boundary
- [ ] Config typed, validated, documented in `.env.example`
- [ ] New dependencies justified
- [ ] Typecheck and build pass (actually run)
- [ ] ADR written for any significant decision

## Common failure modes
Provider logic leaking into components; god components/stores; types duplicated between client and server; validating requests but trusting responses; env read ad hoc across files; premature abstractions (a plugin system for two providers); heavy frameworks/state libraries for trivial state; leaving the build broken between phases.
