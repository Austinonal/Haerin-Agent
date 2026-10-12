---
name: documentation-and-release
description: Use when writing or updating the README, setup/env/troubleshooting docs, PWA or Windows packaging instructions, or describing release artifacts for Haerin Agent. Produces beginner-friendly Thai docs verified against the real scripts.
---

# Documentation and Release — Haerin Agent

## README (Thai, beginner-friendly)
Maintain `README.md` in Thai (short English terms for commands/technical names are fine). Assume the reader has never used Node or a terminal. Suggested sections:
1. แอปนี้คืออะไร (what it is; Local vs Cloud vs Hybrid in plain words)
2. สิ่งที่ต้องติดตั้งก่อน (Node version, Git, optional Ollama) with where to download
3. ติดตั้งและรันครั้งแรก (clone → install → copy `.env.example` → run), each step a copyable command with expected result
4. ตัวแปรสภาพแวดล้อม — table: name, required?, server-only?, example placeholder, purpose
5. ตั้งค่า Cloud AI (Gemini) — separate section: getting a key, putting it in server env, never in frontend
6. ตั้งค่า Local AI (Ollama) — separate section: install, `ollama pull <model>`, check it is running, origin/CORS settings
7. คำสั่งสำหรับพัฒนา / ทดสอบ / build production
8. ติดตั้งเป็น PWA vs แพ็กเกจเป็นแอป Windows (below)
9. แก้ปัญหาที่พบบ่อย (troubleshooting)
10. ความเป็นส่วนตัวและข้อจำกัด

## PWA vs Windows desktop
- **PWA**: the web app installed from the browser (Chrome/Edge "Install"), needs HTTPS or localhost, uses a manifest + service worker, updates via the web, no `.exe`. Local Ollama from a hosted HTTPS page may be blocked (mixed content/CORS) — document it.
- **Windows desktop packaging** (e.g. Electron/Tauri): a separate build producing an installer/`.exe`, bundles its own runtime, needs its own toolchain, signing (otherwise SmartScreen warnings), and update mechanism. Only document it as available if it is implemented; otherwise label it "planned/not implemented".

## Troubleshooting entries to cover
Port in use; missing/invalid Gemini key (401/403); quota/rate limit (429); Ollama not running or connection refused; model not pulled; CORS/`OLLAMA_ORIGINS`; mixed content; blank page after build (base path); Node version mismatch; failed `npm install`; PWA not offering install; Thai text/font issues. Each: symptom → cause → fix → how to confirm.

## Verification rules
- Every command in docs must match `package.json` scripts and actual files — open them, and run the commands where possible (install/dev/test/build). Note any not run.
- Do not write version numbers, model names, URLs or limits from memory; check official sources or omit.
- **Never claim a release artifact exists** (installer, `.exe`, deployed URL, GitHub Release) unless generated and its path/URL confirmed. State what was built, with which command, on which OS.
- Document limitations honestly: platforms tested, features requiring external setup (Gemini key, Ollama install, GPU/RAM for local models), what is unverified.
- Update docs in the same phase as the code change (env vars, scripts, ports, features). Keep `.env.example`, README, and `docs/decisions/` consistent.

## Checklist
- [ ] README Thai, beginner-oriented, all sections present
- [ ] Commands verified against actual scripts (list which were executed)
- [ ] Env var table matches `.env.example` and config module
- [ ] Cloud and Local setup documented separately
- [ ] PWA vs Windows packaging distinguished and accurate
- [ ] Troubleshooting covers common errors
- [ ] No unbuilt artifact claimed; limitations stated

## Common failure modes
Docs describing scripts that don't exist; stale env variable names; wall-of-text instructions; claiming Windows installer support when only a web build exists; telling users to put keys in frontend `.env`; forgetting to update docs after changing ports or scripts.
