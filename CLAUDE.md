# Haerin Agent — Project Instructions

Haerin Agent is a small personal AI chat app (original fictional character) with Cloud AI (Gemini), Local AI (Ollama) and Hybrid routing. Detailed procedures live in `.claude/skills/`; this file only holds the rules that always apply.

## Skills — read before specialized work
| Work | Skill |
|---|---|
| UI, styling, components | `frontend-design` |
| Module boundaries, dependencies, structure | `fullstack-architecture` |
| Gemini / Ollama / routing / streaming | `ai-provider-engineering` |
| Tests, verification, reporting results | `testing-and-verification` |
| Secrets, CORS, logging, imports, Local Only | `security-and-privacy` |
| Persona, response style, memory | `personality-and-memory` |
| README, setup docs, release/packaging | `documentation-and-release` |

## Working rules
- Read the relevant Skill(s) first, then inspect existing code before editing.
- Work in small, coherent phases; keep the project buildable after each.
- Prefer implementing over lengthy planning when requirements are clear. Ask only when an important decision cannot reasonably be derived from these docs.
- Keep the MVP small: finish and verify chat + provider selection + persistence before optional features (sync, voice, packaging, etc.).
- Preserve working functionality; do not rewrite what already works without reason.
- Follow the architecture and requirements in the project documentation (`README.md`, `docs/`, Skills). Record significant decisions in `docs/decisions/`.

## Hard rules
- **Never expose secrets**: no keys in the frontend, logs, commits, or `VITE_`/`NEXT_PUBLIC_`-style variables.
- **Never silently change the selected AI provider.** Local Only never falls back to cloud. Any switch is user-visible and user-approved.
- **Never claim a test/build/lint passed unless it was actually run and passed.** Report passed / failed / not run separately.
- Do not fabricate model availability, API responses, or release artifacts.
- Do not impersonate a real person; the character is original and fictional.

## Verification
Before declaring work done, run what exists: typecheck, lint, tests, production build (check `package.json` scripts). Fix root causes, never hide failures.
