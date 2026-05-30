# Getting Started

This guide gets you from install to first successful rename quickly.

## Requirements

- Node.js `>=20.19.0`
- npm

## Install

```bash
npm ci
```

## Run in Development

```bash
npm run dev
```

## First Rename (Auto Mode)

1. Open Slate.
2. Choose a folder (or drag/drop a folder into the app).
3. Review parsed rows in the preview table.
4. Select the rows you want to rename.
5. Click **Rename**.

## Confidence Indicators

Slate marks parser confidence per row:

- **High confidence**: strongly structured match (e.g. `S01E02`, `1x02`)
- **Low confidence**: potentially valid but ambiguous format, review recommended

Use **Select low confidence** to quickly select and review uncertain rows.

## Manual Mode (Full Control)

Use Manual Mode when filenames are inconsistent or parsing is ambiguous.

1. Enable **Manual Mode**.
2. Set:
   - Show name
   - Season number
   - Starting episode
3. Optionally reorder rows via drag handle.
4. Rename selected rows.

In Manual Mode, episode numbering is sequential by the current row order.

When Manual Mode is enabled, parser output is not used for naming.

## Template Mode (Custom Format)

Template Mode lets you customize how Slate formats renamed files.

1. Enable **Template Mode** in the mode bar.
2. Edit the **Format** field or click token chips to insert placeholders.
3. Use any of the supported tokens:
   - `{Show}` (show name)
   - `{Season}` / `{SeasonZ}` (season number, padded)
   - `{Episode}` / `{EpisodeZ}` (episode number, padded; ranges for double episodes)
   - `{EpisodeTitle}` (if provided)
   - `{OriginalName}` (original filename without extension)
4. Check the live preview for the first parsed row.

Template Mode applies in both Auto Mode and Manual Mode.
If the format is cleared, Slate falls back to the default template: `{Show} - S{SeasonZ}E{EpisodeZ}`.

## Inline Row Editing

You can override parser output per row:

- Click proposed name
- Edit show name and/or episode number
- Save with Enter/click-away
- Cancel with Escape
- Revert via the row’s clear/revert control

Edited rows are visually marked.

## Undo Last Batch

Slate stores undo metadata per folder in `.slate-undo.json`.

Use **Undo Rename** to restore the most recent rename operation for that folder.

## Keyboard Shortcuts

- `Ctrl+A` / `Cmd+A`: Select all parsed rows
- `Enter`: Trigger rename (when valid selection exists)
- `Space`: Toggle focused row selection