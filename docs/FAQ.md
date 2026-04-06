# FAQ

## Why are some files skipped?

Slate only scans supported media extensions:

`.mkv`, `.mp4`, `.avi`, `.mov`, `.m4v`, `.wmv`, `.flv`, `.webm`.

## Why wasn’t a filename parsed?

Some filenames do not match current parser patterns (for example missing season/episode signals or unusual naming conventions).

## Can I undo a rename?

Yes. Slate writes a `.slate-undo.json` file in the folder before renaming. If present, use the **Undo** action in the app.

## Why can’t I select any folder path over IPC?

Main-process handlers validate that paths are:

- non-empty strings
- absolute paths
- existing directories

This is intentional for safety.

## `npm run test` fails with `vitest: not found`

Install dependencies first:

```bash
npm ci
```

Then run:

```bash
npm run test
```

## Why does packaging fail in headless Linux environments?

Electron packaging/runtime may require desktop/Chromium sandbox capabilities that are limited in some headless environments.

💡 Use a local desktop environment for final packaging verification when needed.
