# SOSU — Developer Guide

This document is for contributors and maintainers working on the SOSU codebase.

## Repo Layout (important folders)
- `electron/` — main process and preload scripts for Electron.
- `src/` — React application source:
  - `src/components/` — UI components
  - `src/hooks/` — custom React hooks
  - `src/main/` — platform-specific helpers
- `resources/` — icons, entitlements and other assets
- `scripts/` — utilities (e.g., `sync-version.js`)

## Quick Setup
```bash
git clone https://github.com/Adivise/sosu.git
cd sosu
npm install
npm run dev
```
- `npm run dev` starts the React dev server and launches Electron with hot reload.
- Build: `npm run build` (frontend) then `npm run build:electron -- --<platform>` to package.

## Useful Commands
- `npm run dev` - development mode
- `npm run build` - build static UI
- `npm run build:electron` - package for target platform
- `npm run sync-version` - sync package.json version with `src/version.js`

## Contributing Guidelines
- Keep PRs small and focused (one feature or fix per PR).
- Include short testing steps and screenshots when applicable.
- Use descriptive commit messages and link related issues.

## Testing & Debugging
- Use DevTools in the renderer window for console logs and UI inspection.
- Many features log useful debug messages under `console.debug` when DevTools is open.

## Coding Style
- UI is built with React functional components and hooks.
- Prefer small, testable components and keep side effects in `useEffect` hooks.

## Notes for Maintainers
- User preferences are persisted with `useLocalStorageState` for most UI settings.
- The audio visualizer/analyser is created in `PlayerBar.jsx` and dispatched via custom events for decoupling.
- Large library handling is optimized via metadata caching (`saveSongsCache`).

---

If you need a developer checklist (lint, tests, CI) added here, tell me which tools you want included (ESLint, Prettier, GitHub Actions) and I will add a template and example workflow.
