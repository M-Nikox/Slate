# Getting Started

This guide gets you from install to first successful rename in a few minutes.

## Requirements

- Node.js `>=20.19.0`
- npm

## Install & Run

```bash
npm ci
npm run dev
```

## First Rename (Auto Mode)

1. Launch Slate
2. Open a folder (or drag/drop a folder into the app)
3. Review parsed rows in the preview table
4. Select rows you want to rename
5. Click **Rename**

### Confidence Indicators

- **High confidence**: structured match patterns (safe by default)
- **Low confidence**: ambiguous patterns; review before renaming

Use **Select low confidence** in the footer to quickly review uncertain rows.

## Manual Mode (Deterministic Numbering)

Use Manual Mode when filenames are inconsistent or parser confidence is low.

1. Enable **Manual Mode**
2. Set:
   - Show name
   - Season number
   - Starting episode number
3. (Optional) Reorder rows via drag handle
4. Rename selected rows

Manual Mode assigns episode numbers sequentially by current row order.

## Inline Edits

You can click a proposed name row and edit:

- Show name
- Episode number

Edited rows are marked as edited and can be reverted per row.

## Undo

Slate writes a per-folder undo log at:

- `.slate-undo.json`

Use **Undo last batch** to revert the most recent rename set for that folder.

## Keyboard Shortcuts

- `Ctrl+A` / `Cmd+A`: Select all parsed rows
- `Enter`: Trigger rename (when selection is valid)
- `Space`: Toggle focused row selection
