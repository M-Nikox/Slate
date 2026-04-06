# Development Guide

## Local Workflow

```bash
npm ci
npm run test
npm run dev
```

Before opening a PR:

```bash
npm run test
npm run build
```

## Daily Commands

| Task | Command |
|---|---|
| Run tests | `npm run test` |
| Start dev app | `npm run dev` |
| Build app | `npm run build` |
| Preview built app | `npm run start` |
| Package app | `npm run package` |

## Conventions

- TypeScript-first modules
- Keep process boundaries explicit (main vs preload vs renderer)
- Keep IPC payloads validated in main handlers
- Reuse shared types from `src/shared/types.ts`

⚠️ Never bypass preload by enabling Node integration in renderer.

## Testing (Vitest)

- Config: `vitest.config.ts`
- Pattern: `tests/**/*.test.ts`
- Current coverage areas include parser and renderer utility logic.

Run:

```bash
npm run test
```

## Debugging Tips

- `npm run dev` opens DevTools in development mode.
- Main process logs appear in terminal output.
- Renderer issues appear in DevTools console.

💡 If preview/start fails to load dev URL, verify you are using `dev` vs `start` appropriately.

## Adding a New Feature

1. Define/extend shared types if needed.
2. Add/update IPC channels.
3. Implement validated handler in `src/main/ipc/handlers.ts`.
4. Expose API in preload.
5. Consume API in renderer components/hooks.
6. Add/update Vitest tests.
7. Run test + build locally.

## Security Practices

- Validate all file-system inputs in main process.
- Resolve paths and enforce folder boundaries.
- Avoid direct renderer file-system access.
- Keep context isolation enabled.
