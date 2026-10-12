---
name: frontend-design
description: Use when creating or changing any Haerin Agent UI — layout, components, styling, theming, responsive behavior, accessibility, loading/error/empty states. Establishes the design system first and enforces a calm, minimalist look verified in a real browser.
---

# Frontend Design — Haerin Agent

## Visual direction
Calm, minimalist, understated, modern, thoughtful. Quiet surfaces, generous whitespace, one restrained accent, soft contrast hierarchy. The character is an **original fictional AI**; never copy a real person's photos, name, branding or private identity into the UI.

Avoid generic AI-dashboard looks: purple-blue gradients, glassmorphism everywhere, neon glows, emoji-as-icons, card grids with identical shadows, stat-tile filler. No decoration that harms usability (no animated backgrounds behind text, no low-contrast ornaments).

## Step 1 — Design system before components
Before building more than one or two components, create (or confirm) a single source of truth, e.g. `src/styles/tokens.css` (CSS custom properties) and reference only tokens elsewhere:
- **Color**: semantic tokens (`--bg`, `--surface`, `--surface-raised`, `--border`, `--text`, `--text-muted`, `--accent`, `--danger`, `--success`, `--focus-ring`), light + dark via `prefers-color-scheme` plus a manual override. Text contrast ≥ 4.5:1 (3:1 for large text/UI boundaries).
- **Typography**: one sans family (system stack fallback; verify any webfont supports Thai), a modular scale (e.g. 12/14/16/18/22/28), line-height ≥ 1.5 for body text, Thai text needs extra line height.
- **Spacing**: 4px base scale (4/8/12/16/24/32/48). **Radius**: 3 sizes. **Shadow**: 2–3 subtle levels. **Z-index** and **motion** (durations 120–250ms, honor `prefers-reduced-motion`) as tokens.
- **Layout**: mobile-first; breakpoints ~ 640 / 1024; chat column max ~ 72ch; sidebar collapses to a drawer on mobile; use `dvh` not `vh`; respect safe areas.

No hardcoded hex colors or magic pixel values in components.

## Step 2 — Core components (accessible by default)
- **Buttons**: real `<button>`, visible focus ring, ≥ 44×44px touch target, disabled + loading states, icon-only buttons have `aria-label`.
- **Inputs/textarea**: associated `<label>`, error text linked via `aria-describedby`, Enter to send / Shift+Enter newline (documented), IME-safe (don't send while composing Thai/CJK input).
- **Dialogs**: focus trap, Esc closes, focus restored, `aria-modal`, labelled; use native `<dialog>` or a vetted primitive.
- **Navigation**: semantic landmarks, keyboard reachable, current item indicated.
- **Loading**: skeleton/streaming indicator with `aria-live="polite"`, a Stop/Cancel control while generating.
- **Error**: plain-language message, what failed (provider/model), a retry action; never raw stack traces or keys.
- **Empty**: explain what to do next, with a working primary action.
- Always show the **active provider and model** (see `ai-provider-engineering`) and the Local Only / Cloud / Hybrid mode in a persistent, readable spot.

## Step 3 — Verify in a real browser
Code review is not visual verification. Run the app (see `run` skill / package scripts) and use Playwright (preinstalled Chromium; don't run `playwright install`) or the browser tools to:
1. Load at ~375px, ~768px and ~1280px; check no horizontal scroll, no clipped text, Thai renders correctly.
2. Click every major control: send, stop, new chat, switch provider/mode, open/close dialogs, settings, import/export, delete.
3. Tab through with keyboard only; confirm focus order and visible focus.
4. Trigger loading, error (e.g. provider down), and empty states deliberately.
5. Check dark and light themes and `prefers-reduced-motion`.
Report what was actually exercised and what was not.

## Checklist
- [ ] Tokens exist and components use only tokens
- [ ] Works at mobile and desktop widths
- [ ] Buttons/inputs/dialogs/nav accessible (labels, focus, contrast, touch size)
- [ ] Loading, error, empty states implemented
- [ ] Every visible interactive element does something real (no dead buttons / placeholder handlers)
- [ ] Verified in a real browser; screenshots or notes of what was tested
- [ ] No third-party person's likeness or identity used

## Common failure modes
Dead placeholder buttons; text contrast too low in "calm" palettes; layout breaking with long Thai strings or long code blocks (add `overflow-wrap`, scrollable `pre`); `100vh` jumping on mobile; sending message while IME composing; color-only status indication; adding a UI library when tokens + a few components suffice (see `fullstack-architecture`).
