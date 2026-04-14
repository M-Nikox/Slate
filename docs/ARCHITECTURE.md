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

#### Log format (version 2)

Each entry in `operations` records:

| Field         | Description |
|---------------|-------------|
| `original`    | Absolute path of the file **before** the rename |
| `renamed`     | Absolute path of the file **after** the rename |
| `applied`     | `true` once the rename step has been executed |
| `status`      | `pending` / `done` / `skipped` |
| `currentPath` | Transient field set during cycle/swap staging (see below) |
| `lastError`   | Diagnostic string if a step was skipped |

#### Crash-safe cycle/swap staging

When a batch contains a rename cycle (e.g. A → B and B → A), Slate breaks it
by first staging one file to a temporary `.slate-tmp-*` path.  To make this
recoverable across a crash:

1. **Before** the staging rename (`A → temp`) the undo log entry for the
   owning user-facing operation (`A → B`) is updated with
   `currentPath = temp`.  This means "the file may already be at this
   temporary path; use it as the undo source."
2. **After** the final step for that entry (`temp → B`) completes,
   `currentPath` is cleared from the log entry.

If the process crashes between steps, `executeUndo` inspects `currentPath`:
- If `currentPath` exists on disk → use it as the rename source for recovery.
- If `currentPath` does not exist but the file is already at `original` →
  treat as a no-op (staging never ran).
- Otherwise → skip with `lastError: renamed-not-found`.

#### Safe undo-log deletion

`checkUndoLog()` now returns a structured `UndoLogCheckResult`:

```
{ status: 'ok'; pending: number }           // log valid; pending > 0 means work remains
{ status: 'no-log' }                        // file absent
{ status: 'invalid'; error: string }       // JSON parse or schema error
{ status: 'mismatch'; error: string }      // folderPath in log ≠ requested folder
{ status: 'io-error'; error: string }      // transient read error
```

`executeUndo` deletes the log **only** when `status === 'ok' && pending === 0`.
For any other status the log is preserved to allow manual recovery.