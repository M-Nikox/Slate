<p align="center">
  <img src="assets/icon.png" width="160" alt="Slate Logo">
</p>

<h1 align="center">Slate</h1>
<h3 align="center">TV/Anime Bulk Media File Renamer</h3>

<p align="center">
  <a href="https://github.com/M-Nikox/Slate/actions/workflows/ci.yml">
    <img src="https://img.shields.io/github/actions/workflow/status/M-Nikox/Slate/ci.yml?branch=master&label=build" alt="Build">
  </a>
  <a href="https://github.com/M-Nikox/Slate/releases">
    <img src="https://img.shields.io/github/v/release/M-Nikox/Slate?color=7c3aed" alt="Version">
  </a>
  <a href="./LICENSE">
    <img src="https://img.shields.io/badge/license-GPL--3.0--only-16a34a.svg" alt="License: GPL-3.0">
  </a>
  <a href="https://github.com/M-Nikox/Slate/releases">
    <img src="https://img.shields.io/badge/downloads-releases-0ea5e9" alt="Downloads">
  </a>
</p>

---

### Fast, clean desktop app for renaming TV/anime media files into consistent episode formats.

Slate is a production-ready desktop app for cleaning up messy TV and anime filenames into consistent, library-friendly episode names.  
It combines robust auto-parsing with manual tools, preview-first workflows, and safe bulk rename operations with undo.

---

## ✨ Why Slate

- Parse real-world filename patterns across TV and anime releases
- Handle bracket-heavy anime naming styles cleanly
- Preview all rename output before applying any file operation
- Edit individual rows inline when parser output needs a quick correction
- Use Manual Mode for full control over show/season/episode sequencing
- Batch rename safely with undo support

---

## ✅ Core Features

### Smart Parsing
- Supports common episode formats like:
  - `S01E02`
  - `1x02`
  - `Season 1 Episode 2`
  - `Episode 2` / `Ep 2`
  - Long episode numbers (e.g. `S01E198`)
- Includes confidence tagging:
  - **High confidence** for structured matches
  - **Low confidence** badges for ambiguous patterns requiring review

### Manual Mode
- Toggle Manual Mode when you want deterministic numbering
- Provide:
  - Show name
  - Season
  - Starting episode
- Reorder files with drag-and-drop, then apply sequential assignment
- Great for incomplete, messy, or non-standard source names

### Review & Editing UX
- Rename preview table before commit
- Inline per-row editing of show name + episode
- Edited rows are clearly marked
- “Select low confidence” helper to bulk-select uncertain rows for review
- Keyboard shortcuts for faster batch workflows

### Safe File Operations
- Main-process validated rename execution
- Undo last batch via per-folder `.slate-undo.json`
- Folder refresh support for fast iteration

### Desktop & Release Quality
- Built with Electron + React + TypeScript
- Cross-platform packaging for Linux/macOS/Windows
- Platform-specific desktop + installer icons
- CI-backed build/test/release workflow

---

## 🚀 Quick Start

```bash
npm ci
npm run dev
```

Then open a folder, review previews, and rename selected files.

💡 **Tip:** Use `npm run start` to preview the built app from `out/renderer`.

---

## ⌨️ Useful Shortcuts

- **Ctrl+A / Cmd+A**: Select all parsed rows  
- **Enter**: Trigger rename for selected rows  
- **Space**: Toggle focused row selection

---

## 🛠️ Scripts

| Script | Command | Purpose |
|---|---|---|
| `dev` | `electron-vite dev` | Run app in development mode |
| `build` | `electron-vite build` | Build main, preload, and renderer into `out/` |
| `start` | `electron-vite preview` | Run preview from built output |
| `preview` | `electron-vite preview` | Alias for preview |
| `test` | `vitest run --config vitest.config.ts` | Run unit tests |
| `typecheck` | `tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.main.json` | Type-check renderer/shared + main/preload |
| `package` | `npm run build && electron-builder --publish never --config electron-builder.yml` | Build and package installers/artifacts |
| `make` | `npm run package` | Packaging alias used by CI |

---

## ⚙️ Build / Packaging Config

| Area | Value |
|---|---|
| App ID | `com.mnikox.slate` |
| Product name | `Slate` |
| Build output | `dist/` |
| Build resources | `build/` |
| Included app files | `out/**`, `package.json` |
| Linux targets | `AppImage`, `zip` |
| macOS targets | `dmg`, `zip` |
| Windows targets | `nsis`, `zip` |

⚠️ **Warning:** Packaging in headless CI/sandbox environments may hit GUI/sandbox limits; local desktop packaging is the reference path.

---

## 📚 Documentation

- [Getting Started](./docs/GETTING_STARTED.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Development Guide](./docs/DEVELOPMENT.md)
- [Build & Release](./docs/BUILD_AND_RELEASE.md)
- [Contributing](./docs/CONTRIBUTING.md)
- [FAQ](./docs/FAQ.md)
- [Changelog](./CHANGELOG.md)

---

## Attribution

Logo vectors/icons by [Mohira](https://dribbble.com/mohira_artist?ref=svgrepo.com) (PD License), via [SVG Repo](https://www.svgrepo.com/).

---

> Note: GitHub Copilot was used to assist with configuring and interpreting CodeQL results, as well as for pull request review assistance and minor comment suggestions.
