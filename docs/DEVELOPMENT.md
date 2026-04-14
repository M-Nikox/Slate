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
| `npm run build` | Build main, preload, and renderer into `out/` |
| `npm run start` | Preview built output |
| `npm run test` | Run test suite (Vitest) |
| `npm run typecheck` | Type-check renderer/shared and main/preload |
| `npm run package` | Build and package installers/artifacts via Electron Builder |

## Before Opening a Pull Request

Run:

```bash
npm run typecheck
npm run test
npm run build
```

## Development Notes

- Keep IPC channel names centralized in shared constants to avoid string drift.
- Avoid duplicate IPC handler registration in edge startup/test paths.
- Prefer strict JSON-compatible formatting in config files to preserve tooling compatibility.
- Keep renderer UI concerns separate from main-process filesystem/rename concerns.

## Testing Guidance

For parser or naming changes, add or update tests for:

- Parse success/failure behavior
- Confidence classification (`high` / `low`)
- Name formatting output (including long episode values where relevant)

## Recommended Workflow

1. Add or update tests
2. Implement feature/fix
3. Validate behavior manually in app
4. Run `typecheck`, `test`, and `build`
5. Update docs and changelog for user-facing changes