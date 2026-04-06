# Build & Release

## Build Pipeline

Slate uses:

- `electron-vite` for app builds
- `electron-builder` for distributables

## Build Locally

```bash
npm run build
```

This compiles:

- main process → `out/main`
- preload script → `out/preload`
- renderer app → `out/renderer`

## Package Locally

```bash
npm run package
```

Equivalent script flow:

```shell
npm run build && electron-builder --publish never --config electron-builder.yml
```

Artifacts are generated in `dist/`.

## Distributable Targets

| Platform | Targets |
|---|---|
| Linux | `AppImage`, `zip` |
| macOS | `dmg`, `zip` |
| Windows | `nsis`, `zip` |

## CI Release Behavior

From `.github/workflows/ci.yml`:

- On PRs: test/build + lightweight Linux packaging
- On `v*` tags: test/build + Linux/macOS/Windows packaging + release asset publish

✅ This keeps PR CI fast while keeping tagged releases complete.

## Versioning

- App version is defined in `package.json` (`version`).
- Use semantic version tags (`vX.Y.Z`) to trigger full release workflows.

## Recommended Release Steps

1. Ensure `npm run test` and `npm run build` pass.
2. Bump `package.json` version.
3. Update `CHANGELOG.md`.
4. Create and push tag `vX.Y.Z`.
5. Verify CI artifacts and published release assets.
