# Slate

[![Build](https://img.shields.io/github/actions/workflow/status/M-Nikox/Slate/ci.yml?branch=master&label=build)](https://github.com/M-Nikox/Slate/actions/workflows/ci.yml)
[![Version](https://img.shields.io/badge/version-0.1.0-7c3aed)](https://github.com/M-Nikox/Slate/releases)
[![License: GPL-3.0](https://img.shields.io/badge/license-GPL--3.0--only-16a34a.svg)](./LICENSE)
[![Downloads](https://img.shields.io/badge/downloads-releases-0ea5e9)](https://github.com/M-Nikox/Slate/releases)

### Fast, clean desktop app for renaming TV/anime media files into consistent episode formats.

Currently a proof of concept, you can download and try it out, it works for most, but doesn't parse everything yet. My goal for future versions up until I hit v1.0.0 is to be able to be 100% fully catch every type of name. For now, it will catch most of them. Slate is best for dealing with more Anime focused titles that use brackets.

---

## ✨ Why Slate

- Parse messy filenames (TV and anime patterns)
- Preview rename results before applying
- Batch rename safely with undo support
- Native desktop UX with Electron + React + TypeScript

## 🚀 Quick Start

```bash
npm ci
npm run dev
```

Then open a folder, review previews, and rename selected files.

💡 **Tip:** Use `npm run start` to preview the built app from `out/renderer`.

## 🛠️ Scripts

| Script | Command | Purpose |
|---|---|---|
| `dev` | `electron-vite dev` | Run app in development mode |
| `build` | `electron-vite build` | Build main, preload, and renderer into `out/` |
| `start` | `electron-vite preview` | Run preview from built output |
| `preview` | `electron-vite preview` | Alias for preview |
| `test` | `vitest run --config vitest.config.ts` | Run unit tests |
| `package` | `npm run build && electron-builder --publish never --config electron-builder.yml` | Build and package installers/artifacts |
| `make` | `npm run package` | Packaging alias used by CI |

## ✅ Feature Snapshot

| Feature | Status | Notes |
|---|---|---|
| Folder picker + drag/drop | ✅ | Renderer + preload bridge |
| Filename parsing | ✅ | Shared parser supports TV + anime styles |
| Rename preview table | ✅ | Computed in `usePreviews` |
| Bulk rename execution | ✅ | Main-process validated operations |
| Undo last batch | ✅ | `.slate-undo.json` log per folder |
| Update check | ✅ | `electron-updater`-backed check |

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

## 📚 Documentation

- [Getting Started](./docs/GETTING_STARTED.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Development Guide](./docs/DEVELOPMENT.md)
- [Build & Release](./docs/BUILD_AND_RELEASE.md)
- [Contributing](./docs/CONTRIBUTING.md)
- [FAQ](./docs/FAQ.md)
- [Changelog](./CHANGELOG.md)
