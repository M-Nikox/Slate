# Build and Release

## Local Build

```bash
npm run build
npm run start
```

## Package Artifacts

```bash
npm run package
```

This builds and packages installers/artifacts using `electron-builder.yml`.

## Platform Icons / Branding

Slate uses platform-specific icon assets:

- macOS: `assets/icon.icns`
- Windows: `assets/icon.ico`
- Linux/general: `assets/icon.png`

NSIS installer branding also uses Windows icon assets configured in builder settings.

## Release Notes

`CHANGELOG.md` is the source of truth for release notes.

For each release tag:

1. Ensure a matching version section exists in `CHANGELOG.md`
2. Ensure content is complete and user-facing
3. Publish tag/release via CI flow

Missing changelog sections should fail release-note generation workflows by design.

## CI Notes

- CI validates build/test/release flow.
- Desktop packaging can differ in headless environments; local desktop packaging is the reference path for final artifact sanity checks.