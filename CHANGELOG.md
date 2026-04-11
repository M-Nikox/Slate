# Changelog

All notable changes to this project are documented in this file.

The format is inspired by [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses semantic versioning tags for releases.

## [0.4.0] - 2026-04-11

### Added
- UI: drag to reorder files in manual mode — a drag handle column appears when manual mode is active, allowing files to be reordered before episode numbers are assigned.
- UI: keyboard shortcuts — Ctrl+A (Cmd+A on Mac) selects all parsed rows; Enter triggers rename when files are selected; Space toggles the focused row's checkbox.
- UI: footer now shows edited row count — e.g. `12 recognised · 3 edited · 2 skipped`.
- UI: "Select low confidence" button in the footer — appears when low-confidence rows exist in auto mode, selects all of them for review in one click.
- Build/dev: added explicit `typecheck` script for renderer/shared and main/preload TypeScript projects.
- Build/dev: added Node engine constraint (`>=20.19.0`) to reduce environment mismatch across local/CI builds.

### Changed
- Drag-and-drop overlay behavior hardened: app-level folder drop overlay now only activates for external file drags, and no longer appears during internal table row reordering in manual mode.
- App loading flow hardened against async race conditions when switching folders quickly (stale scan results no longer overwrite newer loads).
- Keyboard Enter shortcut now ignores key-repeat to prevent accidental repeated rename triggers while key is held.
- IPC contract cleanup: `set-title` moved to shared IPC channel constants (`IPC.SET_TITLE`) to avoid string drift between main/preload.
- Main-process IPC handler registration hardened by removing existing handlers before re-registering, preventing duplicate handler errors in edge startup/test paths.
- Path safety checks improved in file operations by using safer subpath checks for folder containment validation.
- Preload bridge hardened with lightweight runtime guards for `setTitle` and `getPathForFile` inputs.
- Build config cleanup and hardening:
  - TypeScript config cleaned for strict JSON compatibility.
  - Electron Vite config explicitly externalizes update/versioning runtime deps used in main process.
  - Electron Builder config explicitly sets `asar`, `extraMetadata.main`, and includes README/LICENSE in packaged artifacts.

### Fixed
- Fixed TypeScript temporal-dead-zone error in `App.tsx` (`handleRename` used before declaration) by reordering callback/effect usage safely.
- Fixed manual mode row drag UX issue where "Drop folder to scan" overlay appeared during internal row drag operations.
- Fixed callback dependency risk for dropped-folder loading path by making folder-drop handler reference the current load function.
- Fixed potential stale load-state update when multiple folder loads happen back-to-back.
- Fixed JSONC-style comment in `tsconfig.main.json` that could break strict JSON tooling.

## [0.3.0] - 2026-04-11

### Added
- Parser: long episode number support — all patterns now accept up to 3-digit episodes (`S01E198`, `1x198`, `Season 1 Episode 198`). Covers long-running shows like One Piece.
 - Parser: NNN compact format — bare 3-digit numbers like `307` are parsed as S03E07 at `low` confidence. First digit is season, last two are episode. Marked low-confidence because this compact form can be ambiguous.
 - UI: inline row editing — clicking the proposed name on any parsed row opens an inline editor with two fields: show name and episode number, pre-filled from the currently displayed values. Enter or click away to save, Escape to cancel, `×` to revert to the original parser result. Works on all rows regardless of confidence.
- UI: edited rows render in blue with an `✎ edited ×` badge. Clicking `×` on the badge clears the override without entering edit mode.
- UI: pencil hint (`✎`) appears on hover for high-confidence rows to indicate editability.
- Platform: Intel Mac (x64) support — macOS builds now produce both `arm64` and `x64` artifacts.
- Docs: README version badge is now dynamic, pulling the latest release tag from GitHub automatically.

### Changed
- `build-name.ts`: episode padding now uses 3 digits for episodes above 99 (e.g. `E07` stays `E07`, but `E198` is correctly rendered as `E198` rather than being padded to 2 digits).
- `usePreviews`: accepts a new `rowOverrides: Map<string, RowOverride>` argument. Per-row overrides take precedence over both the parser result and the global show name field.
- `PreviewRow`: new `overridden: boolean` field.
- `types.ts`: new `RowOverride` interface `{ showName: string; episode: number }`.
- Override map clears on folder load and refresh.

### Tests
- Added 4 long episode number tests.
- Added 3 NNN compact format tests.
- Added 2 `buildName` episode padding tests.
- Added 1 NNN confidence test.
- Parser test count: 53 → 63.

## [0.2.1] - 2026-04-10

### Added
- Parser: confidence tags (`high` | `low`) on every `ParseResult`. All structured patterns (SxxExx, 1x01, verbose, Ep X) are `high`. The anime dash pattern (`- 07`) is `low`.
- UI: low-confidence rows render with a yellow tint and a `⚠ low confidence` badge on the proposed name. High-confidence rows are visually unchanged.
- Manual mode: a checkbox toggle in the toolbar activates manual mode. When on, the user provides a show name, season number, and starting episode — Slate assigns episode numbers sequentially based on file sort order. The auto-parser and show name editor are hidden while manual mode is active.
- UI: Refresh button in the header — re-scans the current folder without having to use Browse Folder again. Only visible when a folder is already loaded.

### Fixed
- Parser: `Ep`/`Episode` pattern now has the `/i` flag — `EP 7` and `EPISODE 7` are correctly matched.
- Strip-junk: `HDR10+` is now stripped correctly. It was previously inside a `\b...\b` group where the trailing `+` prevented the word boundary from matching.
- Tests: HDR, Dolby Vision, and curly brace test inputs were repositioned so the tags fall in the show name slice (before the episode marker), meaning the tests now actually exercise the stripping patterns they claim to cover.
- CI: release notes were being duplicated (three copies) because all three platform jobs called `softprops/action-gh-release` with `generate_release_notes: true` on the same tag. Fixed by introducing a dedicated `create-release` job that runs once; platform jobs now only upload assets.
- CI: auto-generated release notes (which pulled in dependabot as a contributor) replaced with a Python script that extracts the relevant section from `CHANGELOG.md` for the current tag. A missing changelog entry will now fail the workflow loudly rather than publishing an empty release.
- Build: artifact filenames are now consistent and descriptive across all platforms (e.g. `slate-0.2.1-linux-x64.AppImage`, `slate-0.2.1-mac-arm64.dmg`, `slate-0.2.1-windows-x64-setup.exe`). The Windows installer name was previously broken due to NSIS ignoring the top-level `artifactName`.
- Manual mode: when enabled with a blank show name, rows now return unparsed (no proposed name, rename button disabled) instead of silently falling back to the auto-parser. Manual mode is now authoritative — the parser never runs while it is active.
- Manual mode: enabling the toggle now seeds `manualConfig` with sensible defaults (`season: 1`, `startEpisode: 1`) and pre-fills the show name from the current override name or detected name if available, so the input isn't blank on first open.

### Changed
- `ParseResult` type now includes a required `confidence: Confidence` field.
- `PreviewRow` now includes `confidence: Confidence | null`.
- `usePreviews` accepts two new arguments: `manualMode: boolean` and `manualConfig: ManualModeConfig | null`.

### Tests
- Added 7 confidence tests covering all pattern types.
- Added 2 uppercase `EP X` / `EPISODE X` tests.
- Parser test count: 44 → 53.

## [0.2.0] - 2026-04-08

### Added
- Parser: `Episode X` / `Ep X` pattern (no season prefix) — defaults to season 1. Covers fansubs and standalone episode files.
- Strip-junk: curly brace tags (`{tag}`) are now stripped alongside square and round brackets.
- Strip-junk: HDR/dynamic range tags (`HDR`, `HDR10`, `DV`, `DoVi`, `SDR`, `8K`) are now stripped from show names.

### Fixed
- Parser: non-consecutive double episode patterns (e.g. `S01E01E03`) no longer return `null`. The parser now falls through to the standard `S01E01` pattern and returns the first episode cleanly.

### Tests
- Updated non-consecutive double-episode test to reflect new fallback behaviour.
- Added test cases for HDR stripping, Dolby Vision stripping, curly brace stripping, `Episode X`, and `Ep X` patterns.

## [0.1.0] - 2026-04-06

### Added
- Electron + React + TypeScript desktop app foundation.
- Folder scanning for common media extensions.
- Filename parsing for TV/anime episode patterns.
- Rename preview and batch rename execution.
- Undo support via per-folder `.slate-undo.json`.
- Update check wiring via `electron-updater`.
- Vitest test suite for parser and renderer utility behavior.
- CI workflow for tests/builds and tagged multi-platform packaging.

### Changed
- Initial documentation package with getting started, architecture, development, build/release, and contribution guides.
