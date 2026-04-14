# FAQ

## What files is Slate for?

Slate is built for TV/anime media filename cleanup and episode-format standardization.

## What does “low confidence” mean?

Low confidence means the parser found a plausible match, but the format is ambiguous. Review these rows before renaming.

## When should I use Manual Mode?

Use Manual Mode when source filenames are inconsistent or when you want deterministic episode sequencing. You set show name, season, and start episode directly.

## Can I reorder files before numbering?

Yes. In Manual Mode, you can reorder rows and numbering follows that order.

## Can I edit a single row without changing everything?

Yes. Inline editing lets you override show name/episode per row. Edited rows are marked and can be reverted.

## Is rename reversible?

Yes. Slate writes undo metadata to `.slate-undo.json` in the target folder and supports undoing the latest batch.

## Why didn’t some files parse?

Some names are irregular or missing episode markers. Use Manual Mode or inline edits for those rows.

## Does Slate support long-running series episode numbers?

Yes. Long episode numbers (including 3-digit episodes like `E198`) are supported.
