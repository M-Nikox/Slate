# Contributing

Thanks for contributing to Slate.

## Setup

```bash
npm ci
npm run dev
```

## Before You Open a PR

Run:

```bash
npm run typecheck
npm run test
npm run build
```

## Contribution Standards

- Keep changes focused and well-scoped.
- Add tests for parser/rename behavior changes.
- Update docs when UX/flow changes (especially Manual Mode, confidence behavior, shortcuts).
- Add changelog entries for user-visible changes.

## PR Guidelines

- Use clear, descriptive PR titles.
- Explain user impact and implementation details.
- Include screenshots/GIFs for UI changes when useful.
- Link related issues if applicable.

## Code Style / Architecture Notes

- Keep IPC constants centralized (avoid duplicated channel strings).
- Prefer safe path validation and main-process checks for file operations.
- Preserve clear separation between renderer UI concerns and main-process filesystem logic.