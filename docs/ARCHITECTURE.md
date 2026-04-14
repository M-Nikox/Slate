# Architecture

Slate is an Electron desktop app with a React renderer and TypeScript across renderer/shared/main.

## High-Level Structure

- **Renderer (React)**
  - Folder selection and drag/drop UX
  - Preview table and selection state
  - Manual Mode controls
  - Inline row editing (overrides)
  - Confidence-aware review actions

- **Preload Bridge**
  - Safe, minimal API exposure from main to renderer
  - Runtime guards on exposed methods

- **Main Process**
  - Folder scanning
  - Rename planning and execution
  - Path validation and safety checks
  - Undo log persistence (`.slate-undo.json`)
  - Window/app lifecycle and shell integration

- **Shared Layer**
  - Parser logic and confidence tagging
  - Name-building utilities
  - Shared types and IPC channel constants

## Core Data Concepts

### Parse Confidence

Each parse result includes confidence metadata:

- `high`: strongly structured patterns
- `low`: ambiguous patterns that should be reviewed

Confidence drives row styling and review helpers.

### Row Overrides

Inline edits are stored as per-row overrides and take precedence over parser-derived values in preview and execution.

### Manual Mode Authority

When Manual Mode is enabled:

- parser output does not drive naming
- show/season/start episode plus row order become the naming source
- row order directly affects assigned episode sequence

### Undo Model

After a successful batch rename, Slate writes undo data to a per-folder `.slate-undo.json` file. Undo uses this file to restore the latest batch.