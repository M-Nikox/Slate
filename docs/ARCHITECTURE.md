# Architecture

Slate uses Electron + React + TypeScript with clear process boundaries.

## Stack Rationale

- **Electron**: cross-platform desktop shell with native file access
- **React**: fast, component-based UI for previews and interactions
- **TypeScript**: shared typing across main, preload, renderer, and parser logic
- **electron-vite**: modern build pipeline for Electron apps

## Runtime Boundaries

| Layer | Responsibility | Key Files |
|---|---|---|
| Main process | Window lifecycle, IPC handlers, file operations, updater | `src/main/index.ts`, `src/main/ipc/handlers.ts` |
| Preload | Secure bridge between renderer and IPC | `src/preload/preload.ts` |
| Renderer | UI, user interaction, preview state, drag/drop | `src/renderer/App.tsx` |
| Shared | Types, parser logic, IPC channel constants | `src/shared/types.ts`, `src/shared/parser/*`, `src/shared/ipc-channels.ts` |

## Folder Structure

```text
src/
  main/
    file-ops/
    ipc/
    undo/
    index.ts
  preload/
    preload.ts
  renderer/
    components/
    hooks/
    App.tsx
    main.tsx
  shared/
    parser/
    ipc-channels.ts
    types.ts
tests/
  parser/
  renderer/
```

## Data Flow

```text
Renderer UI
  -> preload bridge (contextBridge)
  -> IPC channels
  -> main handlers
  -> scanner/parser/renamer/undo/update logic
  -> result back to renderer
  -> UI refresh
```

## Rename Flow (High-Level)

1. Renderer requests folder scan.
2. Main validates absolute directory path.
3. Scanner returns media files.
4. Renderer uses shared parser to generate preview names.
5. Renderer sends selected rename operations.
6. Main validates operations and writes undo log.
7. Main renames files and returns success/failure summary.

✅ Safety-first details:
- absolute path checks
- “inside target folder” checks
- no overwrite of existing destination files
- undo log written before mutation

## Build Outputs

- Main bundle: `out/main/index.js`
- Preload bundle: `out/preload/index.cjs`
- Renderer bundle: `out/renderer/index.html`
