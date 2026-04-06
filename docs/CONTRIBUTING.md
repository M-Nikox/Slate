# Contributing

Thanks for helping improve Slate. Keep contributions focused, tested, and easy to review.

## Workflow

1. Fork and create a branch from `master`.
2. Make focused changes.
3. Run tests and build locally.
4. Open a PR with clear context.

## Branching Strategy

Use short, descriptive branch names:

- `feat/parser-anime-patterns`
- `fix/undo-log-validation`
- `docs/readme-refresh`

## Commit Guidelines

- Prefer concise, imperative messages
- Keep one logical change per commit

Examples:

- `feat: add update-check status UI`
- `fix: validate IPC folder path before scan`
- `docs: refresh architecture guide`

## Local Validation

```bash
npm run test
npm run build
```

For packaging-related work:

```bash
npm run package
```

## Pull Request Checklist

- [ ] Change is scoped and intentional
- [ ] Tests added/updated when behavior changes
- [ ] `npm run test` passes
- [ ] `npm run build` passes
- [ ] Docs updated if user-facing or dev-facing behavior changed
- [ ] PR description includes motivation and verification steps

⚠️ If your change touches IPC or file operations, explicitly document safety/validation considerations in the PR.
