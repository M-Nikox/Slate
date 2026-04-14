# FAQ

## What does “low confidence” mean?

Low confidence means Slate found a potentially valid parse, but the pattern is ambiguous compared to strongly structured formats like `S01E02`. You should review these rows before renaming.

## When should I use Manual Mode?

Use Manual Mode when:
- Source filenames are inconsistent
- You want strict sequential numbering
- You prefer explicit show/season/start-episode control

## Can I reorder files before assigning episode numbers?

Yes. In Manual Mode, drag rows to reorder before rename. Sequence assignment follows the current row order.

## Can I edit parser output per file?

Yes. Click a proposed row to edit show name and episode. Edited rows are marked and can be reverted.

## Is renaming reversible?

Yes. Slate records the last batch in `.slate-undo.json` (per folder). Use Undo to revert the most recent batch.

## What filename patterns are supported?

Slate supports common TV/anime patterns including:
- `S01E02`
- `1x02`
- `Season 1 Episode 2`
- `Episode 2` / `Ep 2`
- long episode values (e.g., `E198`)

## Why are some files not parsed?

Some release names are highly irregular or missing episode signals. Use Manual Mode or inline edits for those rows.
