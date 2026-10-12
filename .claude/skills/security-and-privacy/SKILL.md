---
name: security-and-privacy
description: Use when handling secrets, env files, backend endpoints, CORS, input validation, logging, file import, Local Only traffic, or any cloud sync/auth/database access in Haerin Agent. Protects credentials, conversation data and trust boundaries without overclaiming security.
---

# Security and Privacy — Haerin Agent

## Secrets
- Provider keys live only in server-side env. Never in `VITE_*`, `NEXT_PUBLIC_*`, `PUBLIC_*`, client code, localStorage, URLs, logs, error messages, or committed files.
- `.gitignore` must cover `.env`, `.env.*` (except `.env.example`), `*.pem`, `*.key`, build output, local DB/data dirs. Review it when scaffolding.
- `.env.example` contains variable names and fake placeholders only, with comments on which are server-only.
- Before commits: `git diff --cached` scan for key patterns (e.g. `AIza`, `sk-`, `Bearer `, private keys). If a secret was committed, tell the user to rotate it — removing from history is not enough.
- After building, grep the frontend bundle for the key/prefix to confirm absence.

## Backend boundary
- Validate all input server-side with schemas (types, lengths, enums, allow-listed models). Reject, don't coerce.
- Request body size limits, per-IP/rate limiting, upstream timeouts, bounded concurrency; cap message count/tokens.
- CORS: explicit origin allow-list (no `*` with credentials); bind dev servers to localhost by default; security headers (CSP, `X-Content-Type-Options`, `Referrer-Policy`).
- No open proxy: never forward user-supplied URLs/hosts/headers (SSRF). Ollama host comes from trusted config only.
- If the backend is publicly reachable it needs authentication before it spends the owner's Gemini quota; otherwise bind to localhost and say so.

## Conversation data & logging
- Don't log message contents, memory, prompts or file contents by default; log IDs, provider, model, status, latency, error kind. Any debug logging of content is opt-in, local, and off by default.
- Local data stays in the user's browser/device unless sync is explicitly enabled. Offer export + delete-all.
- Render model output and imported content as text/sanitized markdown; never `dangerouslySetInnerHTML` unsanitized; no inline script execution from messages.

## Local Only
When Local Only is selected: no cloud requests of any kind (chat, titles, summaries, analytics, fonts/CDN scripts at runtime if avoidable). Ollama must not be exposed beyond loopback/LAN without protection; if the user sets `OLLAMA_HOST=0.0.0.0`, warn that it has no authentication and recommend a firewall or authenticated reverse proxy. Test with network interception (see `testing-and-verification`).

## Imports
Treat import files as hostile: size cap, MIME/extension check, parse with a strict schema, bounded depth, no prototype pollution (reject `__proto__`), no HTML/script execution, no auto-fetching URLs inside. Failed import must not corrupt existing data (validate fully before writing, ideally transactionally).

## Cloud sync/auth (only if added)
Use a vetted auth provider; deny-by-default database rules (per-user row/document ownership, e.g. RLS or security rules) and test them with a second user; encrypt in transit; document what is stored; make sync opt-in.

## Honesty
Never claim the app is "secure" or "private" absolutely. In handoffs, list residual risks, e.g.: prompts sent to Gemini are subject to Google's terms; browser storage is readable by anyone with device access and not encrypted by default; no auth on a local backend means any local process can use it; dependency vulnerabilities (`npm audit` results to be reported as run/not run).

## Checklist
- [ ] `.gitignore` and `.env.example` reviewed
- [ ] No secrets in client env/bundle/logs/repo (checked)
- [ ] Server-side validation, size limits, rate limits, CORS allow-list
- [ ] No arbitrary upstream URLs
- [ ] Logging excludes private content
- [ ] Local Only verified to make no cloud calls
- [ ] Import hardening in place
- [ ] Residual risks listed

## Common failure modes
Putting the Gemini key in a `VITE_` var "temporarily"; wildcard CORS; logging full request bodies; trusting client-sent model names or URLs; assuming localhost = safe (any web page can hit localhost services unless CORS/origin is checked); sanitizing on import but not on render.
