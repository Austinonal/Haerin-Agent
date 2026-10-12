---
name: personality-and-memory
description: Use when defining or changing the Haerin assistant's persona, response-style settings, system prompts, or the persistent memory feature (storage, inspect/edit/delete UI, save rules). Keeps persona configurable and separate from provider code, and memory user-controlled.
---

# Personality and Memory — Haerin Agent

## Character
"Haerin" is an **original fictional AI character** with a calm, observant, understated, concise manner — inspired by an aesthetic, not a person. Never claim to be, speak as, or invent facts about any real person; no private details, no fabricated quotes or biography. If asked, state plainly that it is an AI character.

## Persona is data, not code
- Persona lives in editable files/settings (e.g. `config/persona.default.md` or a typed JSON/YAML profile) plus user overrides in settings — changing tone must not need a source change.
- Provider adapters never contain persona text. A `PromptBuilder` in app logic composes: base persona → user style settings → (consented) memory → conversation. Providers receive the already-built messages.
- Style settings: tone (e.g. concise/warm/formal), verbosity, language (default Thai/English following the user), emoji on/off, custom instructions. Validate with a schema; ship sensible defaults; provide "reset to default".
- Persona must not override safety, honesty, or the rule that the app never lies about provider/model or memory.

## Context vs memory
- **Conversation context**: messages in the current chat (bounded by window/truncation policy). Disappears with the conversation.
- **Persistent memory**: separate store of short, user-approved items (`id, text, createdAt, updatedAt, source`). 
- The assistant may only say it remembers things that are actually in context or in memory. If unavailable: "I don't have that." Never invent memories.

## Memory rules
- Opt-in, off or ask-first by default. **Do not persist every message.** Save only when the user asks ("remember…") or approves a proposed item (show exactly what will be saved).
- Never save credentials, API keys, passwords, tokens, payment/ID numbers, or other detected secrets; run a secret/PII heuristic and refuse with an explanation. Sensitive categories need explicit confirmation.
- User control UI: list all memories, search, edit, delete one, delete all, export; toggle memory on/off per chat; deletion is real (removed from storage, not just hidden).
- Show when memory was used in a reply (e.g. "used 2 memories") with a way to see which.
- Memory is sent to a provider like any other prompt content: in Local Only it stays local; for cloud it falls under the consent rules in `ai-provider-engineering` / `security-and-privacy`.

## Cross-provider consistency
Different models follow persona differently. Don't assume identical behavior: keep persona prompt short, explicit, and model-agnostic; write a small set of persona scenarios (greeting, refusal to impersonate, asked-about-memory with none stored, long-form question, Thai input) and run them against each available provider (see `testing-and-verification`). Record differences and adjust the prompt; only report providers you actually ran. Automated tests can check prompt construction (persona + memory included/excluded correctly); response tone checks are manual/review-based and must be labeled so.

## Checklist
- [ ] Persona and style stored as editable data, outside provider code
- [ ] PromptBuilder composes layers; unit-tested
- [ ] Memory CRUD UI works; delete verified in storage
- [ ] No auto-save of all messages; secret filter active
- [ ] Assistant never claims nonexistent memories
- [ ] Scenarios run on each real provider (or noted not run)
- [ ] No real-person impersonation

## Common failure modes
Persona string pasted inside the Gemini adapter; memory silently growing; "remembering" via hidden chat-history stuffing; memory sent to cloud in Local Only; deleting from the UI list but not from storage/exports; long persona prompts that small local models ignore.
