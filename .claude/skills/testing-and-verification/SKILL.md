---
name: testing-and-verification
description: Use after implementing or changing behavior in Haerin Agent, or when adding tests, to verify work with real commands. Covers test selection for routing, persistence, import/export and privacy, root-cause debugging, and honest reporting of passed/failed/not-run.
---

# Testing and Verification — Haerin Agent

## Start by inspecting
Read `package.json` scripts, test config, CI files, and existing tests. Use the project's existing runner (add Vitest for a Vite/TS project only if none exists). Don't invent script names — run what is there.

## What must be tested (critical logic, not trivia)
1. **Provider routing**: for each mode (Local Only / Cloud / Hybrid) × provider health matrix → expected decision. Local Only with Ollama down returns an error, **never** a cloud call. No silent switch.
2. **Failure behavior**: timeout, abort/cancel mid-stream, malformed/truncated stream, 401/429/5xx, Ollama model missing — each maps to the right neutral error and a recoverable UI state.
3. **Persistence**: create/rename/delete conversation, reload restores messages in order, schema migration of older stored data, corrupted record handling.
4. **Import/export**: round-trip equality, schema validation rejects malformed/oversized/hostile files, version handling, no script/HTML execution from imported content.
5. **Privacy**: in Local Only, assert no network request leaves to non-local hosts (spy on `fetch`/server-side http client or use Playwright request interception); secrets absent from client bundle and logs; memory not sent to cloud without consent.
6. **Backend**: request validation (reject bad/oversized input), model allow-list, no arbitrary upstream URL, CORS behavior, error mapping without key leakage.
7. **Memory/personality** (with `personality-and-memory`): save rules, delete actually removes, secrets not saved.
8. **UI flows** end-to-end with Playwright for the main journey (send, stop, switch mode, reload) — see `frontend-design` for responsive/a11y checks.

Mock only external boundaries (the Gemini HTTP API, Ollama HTTP) using realistic recorded-shape fixtures; use real routing/persistence/validation code. A test that mocks the thing under test, or asserts a constant, is not a test — don't write it.

## Run the full gate (whichever exist)
typecheck → lint → unit/integration tests → production build → (if relevant) e2e. Use the real script names from `package.json`. Capture actual output.

## Failures
Reproduce, find the root cause, fix the code (or the wrong test with justification). Don't skip, `.only`, loosen assertions, add retries, or catch-and-ignore to get green. Flaky test? Find the race. If something can't be run (no network, missing browser, no API key), say so.

## Reporting format (mandatory honesty)
End every verification with three lists:
- **Passed** (command + result summary)
- **Failed** (command + failure + status of investigation)
- **Not run** (and why: no script, no credentials, environment limits)
Never write "tests pass" for anything not executed in this session. Real Gemini calls need a key: if not available, state the live path is unverified.

## Checklist
- [ ] Scripts/infra inspected
- [ ] Tests added for routing, failures, persistence, import/export, privacy as applicable
- [ ] typecheck, lint, tests, build executed (or listed as not run)
- [ ] Root cause found for every failure
- [ ] Report separates passed / failed / not run

## Common failure modes
Claiming success from reading code; mocking away the router; snapshot tests nobody reviews; tests that need live API keys in CI; leaving `console.log` debugging; fixing the build by disabling strict TS or lint rules; testing only happy paths.
