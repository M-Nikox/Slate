# Getting Started

Quick setup for running Slate locally.

## Prerequisites

- Node.js (CI uses Node 20)
- npm
- macOS, Linux, or Windows desktop environment

## Install

```bash
npm ci
```

## Run in Dev Mode

```bash
npm run dev
```

This starts Electron with the Vite-powered renderer.

## Run Tests

```bash
npm run test
```

Vitest is configured via `vitest.config.ts` and runs tests in `tests/**/*.test.ts`.

## Build

```bash
npm run build
```

Build output goes to:

- `out/main`
- `out/preload`
- `out/renderer`

## First Run from Build Output

```bash
npm run start
```

`start` runs `electron-vite preview` and loads the built renderer.

## Package Installers / Artifacts

```bash
npm run package
```

Artifacts are emitted to `dist/`.

## First App Workflow

1. Open Slate.
2. Click **Browse Folder** or drag/drop a folder.
3. Review proposed rename preview.
4. Optionally override show name.
5. Select files and click **Rename**.
6. Use **Undo** if needed.

💡 Tip: Slate only renames supported media file extensions and skips non-media files.
