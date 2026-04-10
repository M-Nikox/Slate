# Changelog

All notable changes to this project are documented in this file.

The format is inspired by [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses semantic versioning tags for releases.

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
