# AGENTS.md — Cockpit Timeshift Plugin

This file guides agentic coding assistants working in the `/usr/share/cockpit/timeshift-dev/` repository.

## Project Overview

A **Cockpit plugin** providing a web UI for Timeshift snapshot management. Pure static assets (HTML/JS/CSS) with no build system, package manager, or compiled sources. All development happens in the `timeshift-dev` directory; the stable installation at `timeshift/` is read-only during normal development.

**Key files:**
- `index.html` — Cockpit app shell; UI structure, loads `timeshift.js` and `timeshift.css`, registers with Cockpit via `/app` manifest endpoint.
- `timeshift.js` — Main application logic (~1000 lines, strict mode, module pattern). State management, DOM manipulation, Cockpit API calls.
- `timeshift.css` — Stylesheet with CSS custom properties (theming variables) and BEM-like class naming.
- `manifest.json` — Cockpit app manifest; entry point, title, icon, shortcut keys.
- `install.sh` — Installation script (requires root); copies the manifest, HTML,
  CSS, JS and `po.*.js` translation bundles to `/usr/share/cockpit/timeshift/`
  (stable) or `/usr/share/cockpit/timeshift-dev/` (dev).

## Build / Lint / Test

**No build system.** Project consists of static files installed via `sudo ./install.sh`.

### Linting
- ESLint (flat config `eslint.config.js`) lints all JavaScript in the repo.
  Run locally with `npm run lint`; CI runs `npm ci` + `npm run lint`.
- No Prettier or CSS linting configured.
- Code quality maintained through code review and manual inspection.
- JS follows strict mode (`"use strict"`) and the established module pattern.
- CSS uses CSS custom properties and BEM-like class naming.

### Testing
- Unit tests for the pure parsers live in `test/parsers.test.js` and `test/po2js.test.js`
  (Node's `node:test`, no dependencies). Run with `node --test test/parsers.test.js test/po2js.test.js`.
- Translations: `po/*.po` are compiled by `scripts/po2js.js` into per-language
  bundles `po.<lang>.js` (`node scripts/po2js.js`), which are committed and
  shipped with the package. Cockpit serves the bundle matching the selected
  `CockpitLang` as `po.js`; reload the bundles after changing a `.po` file.
- UI testing is manual through the Cockpit UI.
- **Manual test flow** (from `DEVELOPMENT.md`):
  1. Install dev version: `sudo ./install.sh` then refresh Cockpit browser
  2. View snapshots (Overview page)
  3. Create snapshot → enter comment → verify snapshot appears
  4. Restore snapshot → confirm restore operation
  5. Delete snapshot → verify removal
  6. Schedule → configure frequency/time → verify systemd timer creation
- After code changes, re-run `install.sh` or copy files manually to refresh Cockpit.

### Type Checking
- No type checker is used. The project is vanilla JavaScript (no TypeScript).
- JSDoc or Flow are not configured.

### Running checks before committing
```bash
npm run lint
node --check parsers.js timeshift.js po.*.js scripts/po2js.js
node scripts/po2js.js
node --test test/parsers.test.js test/po2js.test.js
sh -n install.sh
```
All should pass with no output errors and exit code 0.

## Code Style Guidelines

### JavaScript (`timeshift.js`)

- **Strict mode**: `"use strict"` at the very top. Applies to the entire file.
- **Module pattern**: Self-invoking anonymous function `(() => { ... })()`. All logic lives inside this closure.
- **Naming conventions**:
  - Constants: `UPPER_SNAKE_CASE` (`TS = "/usr/bin/timeshift"`, `TIMER = "timeshift.timer"`, `SERVICE = "timeshift.service"`; legacy `cockpit-timeshift.*` disabled on save)
  - Functions: `camelCase` (`runSnapshotOperation`, `refreshTimeshift`, `createSnapshot`, `deleteSnapshot`)
  - State object properties: `camelCase` (`snapshots`, `scheduleEnabled`, `timerActive`, `selectedSnapshot`)
  - DOM helpers: `$` prefix for ID selectors (`$('#snapshotSearch')`, `$('snapshotTable')`)
  - Variables: `camelCase` (e.g., `operationTimer`, `isRestoring`, `isDeleting`)
- **Patterns**:
  - `cockpit.spawn()` for running commands with `superuser: "require"` — elevates privileges to interact with `/usr/bin/timeshift`.
  - `cockpit.file()` for writing system files (e.g., `/etc/timeshift-schedule.yaml`).
  - `parseList()` for parsing `--list` output from timeshift.
  - `esc(str)` for HTML escaping — **must** be called on any user-derived content before inserting into DOM.
  - `toast()` for transient notifications — shows temporary success/error messages.
- **Error handling**: `try/catch` blocks with graceful fallback; errors surfaced via `toast()` for user-visible messages and `console.error` for debugging.
- **No external dependencies** — vanilla ES6+ JavaScript only. No `require()`, no `import`, no bundler.
- **Imports**: None. The file is self-contained and assumes `cockpit` is available in the Cockpit runtime.

### CSS (`timeshift.css`)

- **CSS custom properties** (variables) for theming: `--bg:#0f1114`, `--text:#c0c5dd`, `--accent:#06b6d4`, `--warning:#e87940`, `--error:#cc2936`. Defined on `:root` and reused throughout.
- **BEM-like convention**: `.dev-badge`, `.topbar`, `.nav-item`, `.small-button`, `.snapshot-table`, `.warning`, `.error`.
- **Media queries** for responsive design: breakpoint at 900px (tablet layout) and 600px (narrow column).
- **Organized by category**: layout (rows/columns), components (buttons/inputs/modals), typography (font sizes, line heights), states (`.hidden`, `.warning`, `.error`), live operation progress (`.progress-bar`, `.spinner`).
- **No CSS preprocessor** — raw CSS only. No nesting, no variables beyond custom properties.

### HTML (`index.html`)

- Semantic HTML5 structure with `<header>`, `<main>`, `<section>`, `<footer>`.
- Cockpit-specific `<script>` referencing `timeshift.js` with `type="module"` or inline execution context.
- Cockpit-specific `<link>` referencing `timeshift.css`.
- Accessible labels and ARIA where appropriate (e.g., `aria-label="Create snapshot"`, `role="button"` on interactive elements).

### Error Handling

- **JS**: `try/catch` + `toast()` for user-visible messages; `console.error` with stack trace for debugging. Errors from `cockpit.spawn()` are handled via the callback's `error` parameter.
- **CSS**: No structured error handling; use `.warning`/`.error` classes for visual feedback on the UI.
- **General**: Assume external systems (timeshift executable, Cockpit API) may fail at any time; always handle errors gracefully and never leave the UI in an ambiguous loading state.

### What NOT to do

- ❌ Do not add `require()` or `import` statements — the file has no bundler; Cockpit provides its own `cockpit` globals.
- ❌ Do not remove `"use strict"` — it is essential for catching common JS mistakes.
- ❌ Do not rename constants (`TS`, `TIMER`, `SERVICE`) without updating all references across the file.
- ❌ Do not change function signatures without updating all call sites; the module pattern means internal function names are relied upon by other parts of the same file.
- ❌ Do not insert raw user data into `innerHTML` without passing through `esc()` first — this XSS-vulnerability pattern has been caught in code review.
- ❌ Do not forget to refresh Cockpit after code changes: run `sudo ./install.sh` and hard-refresh the browser (Cmd/Ctrl + Shift + R).
- ❌ Do not omit `superuser: "require"` in `cockpit.spawn()` calls that modify system state; the Cockpit API will reject the call.
- ❌ Do not write to `console.log` in production without also surfacing the information via `toast()` for the user.

### OpenCode-Specific Rules (from `docs/OPENCODE_GUIDE.md`)

- NEVER modify `/usr/share/cockpit/timeshift/` (stable). All development happens in `/usr/share/cockpit/timeshift-dev/`.
- Always inspect `git status` and `git branch --show-current` before changing code.
- Do not delete/restore snapshots, modify systemd timers, or execute destructive system commands unless explicitly requested.
- Prefer minimal changes. Do not rewrite working code unnecessarily.
- Before declaring success: run the checks in *Running checks before committing* then verify the application in Cockpit.
- When a change is potentially destructive or affects system configuration, stop and ask for confirmation.
- Do not commit automatically unless explicitly requested. Before suggesting a commit: `git diff` and `git status`.