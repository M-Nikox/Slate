# Development Guide

## Prerequisites

- Node.js `>=20.19.0`
- npm

## Setup

```bash
npm ci
```

## Common Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start app in development mode |
| `npm run build` | Build main, preload, renderer into `out/` |
| `npm run start` | Preview built output |
| `npm run test` | Run test suite (Vitest) |
| `npm run typecheck` | Type-check renderer/shared + main/preload |
| `npm run package` | Build + package via Electron Builder |

## Code Quality Expectations

Before opening a PR, run:

```bash
npm run typecheck
npm run test
npm run build
```

## Implementation Notes

- Keep IPC channel names centralized in shared constants to avoid string drift.
- Avoid duplicate IPC handler registration in edge startup/test paths.
- Prefer strict JSON-compatible config formatting to maintain tooling compatibility.
- For parser changes, include tests for:
  - successful parsing behavior
  - confidence classification (`high` / `low`)
  - naming output (`build-name`) where relevant

## Suggested Workflow for Feature Changes

1. Add/adjust tests
2. Implement feature
3. Verify parser/UI behavior manually
4. Run typecheck/test/build
5. Update docs and changelog for user-facing changes
