# Copilot Instructions — Xbox Themes for Visual Studio

> Repo-scoped context. Travels with the repo so any contributor (including
> future-Hector on a different machine) gets the full picture immediately.
> User preferences and personal workflow live in `~/.copilot/` instead.

## What this repo is

A **Visual Studio 2026 theme extension** packaged as a single VSIX containing
six Xbox-flavored themes. Sibling repo to
[`vs-code-xbox-theme`](https://github.com/hectorjjb/vs-code-xbox-theme) — same
canonical palette, different IDE.

The 6 flavors:

| ID | Name | Type | Fallback |
| -- | ---- | ---- | -------- |
| `xbox-original` | Xbox Original | dark | Dark |
| `xbox-360` | Xbox 360 | light | Light |
| `xbox-one` | Xbox One | dark | Dark |
| `xbox-series-x` | Xbox Series X | dark | Dark |
| `xbox-hc-dark` | Xbox High Contrast (Dark) | dark | Dark |
| `xbox-hc-light` | Xbox High Contrast (Light) | light | Light |

## Architecture (read this first)

VS 2026 uses a **new modernized theme schema** ([Microsoft docs](https://learn.microsoft.com/en-us/visualstudio/extensibility/migration/modernize-theme-colors)):

- ~229 tokens across **5 categories** we override (Microsoft's built-ins span 34+ categories).
- A `<Theme FallbackId="...">` attribute inherits everything not overridden from a built-in **Light** (`{de3dbbcd-f642-433c-8353-8f1df4370aba}`) or **Dark** (`{1ded0138-47ce-435e-84ef-9ec1f439b749}`) theme.
- We **do not** ship a full theme — we ship the ~80 tokens that give each flavor its identity. Everything else inherits.

VS 2026 has **no "Import Theme" UI** — custom themes must be packaged as a VSIX.

## File layout

```
src/
  palette.json                       ← shared with vs-code-xbox-theme; SOURCE OF TRUTH
  mapping/vs-key-map.json            ← which VS tokens we override and how (role+alpha syntax)
  flavors/*.json                     ← 6 per-flavor metadata files (name, GUID, FallbackId, accentFg)
  reference/                         ← decoded built-in theme pkgdefs for development reference
                                       (bubblegum.json, shell-dark.json, shell-light.json)
  vsix/
    extension.vsixmanifest.template  ← VSIX manifest with {{TOKEN}} placeholders
    [Content_Types].xml              ← OPC content type map
publish/
  publish-manifest.json              ← Marketplace-only metadata (categories, repo URL)
  overview.md                        ← Long-form description rendered on Marketplace gallery page
images/
  icon.png, preview.png              ← shipped IN the VSIX (icon = 128x128, preview = console gens)
  xbox-*.jpg (6 files)               ← README screenshots, NOT shipped in the VSIX
scripts/
  build-vstheme.mjs                  ← .vstheme XML generator (role+alpha resolution, extraRoles merge)
  build-vsix.mjs                     ← VSIX packager (compile, header inject, stage, zip)
  decode-pkgdef.mjs                  ← pkgdef binary blob decoder for inspection
  publish.mjs                        ← Marketplace publisher (calls VsixPublisher.exe)
docs/
  PUBLISHING.md                      ← Manual Marketplace publish workflow
  MODERNIZATION.md                   ← (in sibling vs-code-xbox-theme; not relevant here)
dist/                                ← .vstheme, .pkgdef, .vsix output (gitignored)
```

## Token coverage per flavor

| Category | GUID | Tokens | Drives |
| -------- | ---- | -----: | ------ |
| `DecorativeMPF` | `{0c37665d-8581-4451-8394-6f4d5abd88b1}` | 21 | Lavender + Purple + LightPurple families recolored to flavor green so accent-tinted decorative surfaces match |
| `Shell` | `{73708ded-2d56-4aad-b8eb-73b20d3f4bff}` | 20 | Accent fills, surface backgrounds, text-on-accent (full accent family: Default/Secondary/Tertiary/Alt/Senary/SelectedText*/Disabled, AccentTextFill*, TextOnAccentFill*) |
| `ShellInternal` | `{5af241b7-5627-4d12-bfb1-2b67d11127d7}` | 10 | Title bar, menu bar, document tabs, status bar (Bubblegum-style chrome pattern) |
| `TreeView` | `{92ecf08e-8b13-4cf4-99e9-ae2692382185}` | 14 | Solution Explorer / Test Explorer row selection, expand chevron, drag-over highlight, search-result span, focus border |
| `Text Editor Text Manager Items` | `{75a05685-00a8-4ded-bae5-e7a50bfa929a}` | 14 | Editor background, foreground, selection, line highlight, cursor, indent guides |

**Total: ~79 tokens overridden per flavor.** Editor SYNTAX colors (Identifier/Keyword/String/etc.) still use the legacy Text Editor system in VS 2026 — out of scope for this extension.

## Generator role syntax

In `src/mapping/vs-key-map.json`, color values use:

- `$role` — resolves from the flavor's palette (e.g. `$green`, `$bg`, `$fg`).
- `$role:alphaHex` — same role with overridden alpha byte (e.g. `$green:e5` = green at 0xE5 alpha).
- `#rrggbb` or `#rrggbbaa` — literal color.
- Per-flavor `extraRoles` in `src/flavors/*.json` add palette entries (e.g. `accentFg` = readable text drawn on the green accent surface; varies per flavor).

Roles are resolved by `resolveRole()` in `scripts/build-vstheme.mjs`. Extra roles are merged via `buildPalette()`.

## Build / package / publish commands

```powershell
npm run build              # generate all 6 .vstheme XML files in dist/
npm run build:series-x     # generate only Xbox Series X
npm run package            # full pipeline: build → compile → stage → zip → dist/*.vsix
npm run publish            # upload latest dist/*.vsix to Marketplace (needs $env:VS_MARKETPLACE_PAT)
```

Inspect a compiled pkgdef:

```powershell
node scripts/decode-pkgdef.mjs dist\vsix-stage\Themes\xbox-series-x.pkgdef
node scripts/decode-pkgdef.mjs dist\vsix-stage\Themes\xbox-series-x.pkgdef TreeView   # filter
```

Decode a built-in VS theme for reference (when expanding the map):

```powershell
node scripts/decode-pkgdef.mjs "C:\Program Files\Microsoft Visual Studio\18\Insiders\Common7\IDE\CommonExtensions\Platform\Theme.Dark.pkgdef" TreeView
```

## VSIX gotchas (learned the hard way)

These are NOT obvious from Microsoft docs — they were figured out by comparing
against working third-party VSIXes (notably MadsKristensen/BlueSteel) and by
binary-decoding the built-in theme pkgdefs.

1. **`VsixColorCompiler.exe` doesn't write the theme registration header.**
   It only emits the per-category color blobs. Without
   `[$RootKey$\Themes\{guid}]` + `@="Name"` + `"Name"="..."` + `"FallbackId"="..."`
   prepended, VS displays the theme as a raw GUID and may fail to load. The
   compiler also writes a UTF-8 BOM that must be stripped before prepending.
   See the post-process step in `scripts/build-vsix.mjs` (~lines 120–135).

2. **VS 2026 needs `manifest.json` + `catalog.json`** at the VSIX root in addition
   to `extension.vsixmanifest`. VSIXInstaller reads these to determine extension
   directory and dependencies. Without them, install fails with "not a valid VSIX
   package". Generated by `build-vsix.mjs` step 4b.

3. **OPC zip entries MUST use forward slashes.** PowerShell's
   `[ZipFile]::CreateFromDirectory` writes backslashes which VS rejects. We zip
   entry-by-entry with `/` separators in `build-vsix.mjs` step 5.

4. **`[Content_Types].xml` must declare `json`.** Otherwise the manifest.json /
   catalog.json files break the package validation.

5. **Per-architecture `<InstallationTarget>` blocks are required** with
   `<ProductArchitecture>amd64</ProductArchitecture>` (also `arm64`). The single-
   target form fails on VS 2026.

6. **Manifest `<Identity Id>` should include a stable GUID suffix** (e.g.
   `XboxThemes.8c1f4d2e-3a5b-4c6d-9e7f-1b2a3c4d5e6f`) for global uniqueness
   independent of publisher namespace. The constant lives at the top of
   `build-vsix.mjs`. The output `.vsix` filename is the cleaner
   `<publisher>.XboxThemes-<version>.vsix` (no GUID) — the GUID belongs in
   the manifest, not the filename.

7. **Pkgdef binary blob format** (one per category, after the `Data=hex:` prefix):
   - 12-byte header
   - 16-byte category GUID (Data1 LE, Data2 LE, Data3 LE, Data4 BE)
   - 4-byte little-endian color count
   - Then per-color: `nameLen(4 LE) + name(utf8) + bgFlag(1) + [RGBA(4)] + fgFlag(1) + [RGBA(4)]`
   - Color stored as R, G, B, A (one byte each).

   The decoder in `scripts/decode-pkgdef.mjs` implements this; use it whenever
   you want to verify what a pkgdef actually contains.

## Tooling locations

VS 2026 SDK tools (paths verified on Hector's machine):

```
VsixColorCompiler.exe   →  C:\Program Files\Microsoft Visual Studio\18\Insiders\VSSDK\VisualStudioIntegration\Tools\Bin\VsixColorCompiler.exe
VsixPublisher.exe       →  same directory, alongside VsixColorCompiler.exe
Built-in theme pkgdefs  →  C:\Program Files\Microsoft Visual Studio\18\Insiders\Common7\IDE\CommonExtensions\Platform\Theme.*.pkgdef
```

Both build scripts (`build-vsix.mjs`, `publish.mjs`) probe a list of standard
install roots so they work on Insiders / Preview / Enterprise / Pro / Community.

## Workflow conventions

- Branch naming: `hectorj/<feature-name>` (matches user's general pref).
- Commits: clear imperative mood, focused single-logical-change.
- **Do not bump `package.json` version** before a Marketplace publish. Hector's
  rule: "I won't bump versions even minor till I publish package."
- Before any visible change, **commit the working state first** so it can be
  reverted with `git reset --hard <sha>` if the change doesn't land well.
- After visible changes, ask Hector to test (he installs the VSIX in his real
  VS 2026 install) before committing.
- **Always test by uninstalling the previous VSIX, restarting VS, then
  installing fresh.** VS aggressively caches pkgdefs by version; reinstalling
  the same version often skips the update entirely.

## Open ideas / not yet done

- **Folder-glyph recoloring (Option B).** Would require a sibling
  `.imagemanifest` shipped in the same VSIX with green-tinted folder open/closed
  SVGs. Doable without C# code. Skipped for v0.1 to keep scope tight.
- **File-type icons (Option C).** Would require a real C#/MEF VS extension
  registering `IVsImageService` monikers. Out of scope.
- **CI build + auto-publish.** Hector explicitly wants manual publish only — do
  not add GitHub Actions for releases.
- **Extension Manager pivot underline still purple.** Confirmed to be a
  hardcoded brush — every theme (including Microsoft's own built-ins) shows the
  same purple. Cannot be fixed from a theme pkgdef.

## Sibling repo

`C:\Users\hectorj\Sites\vs-code-xbox-theme` (or
[`hectorjjb/vs-code-xbox-theme`](https://github.com/hectorjjb/vs-code-xbox-theme))
is the original VS Code theme. The two repos share `src/palette.json` byte-for-
byte — if you change the canonical palette, copy the file across both.
