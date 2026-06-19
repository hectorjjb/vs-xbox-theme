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

- ~159 tokens across **12 categories** we override (Microsoft's built-ins span ~1,242 tokens across 34+ categories).
- A `<Theme FallbackId="...">` attribute inherits everything not overridden from a built-in **Light** (`{de3dbbcd-f642-433c-8353-8f1df4370aba}`) or **Dark** (`{1ded0138-47ce-435e-84ef-9ec1f439b749}`) theme.
- We **do not** ship a full theme — we ship the ~159 tokens that give each flavor its identity. Everything else inherits.
- See `docs/COVERAGE.md` for the full coverage matrix + rationale for intentionally-skipped categories.

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
  build-vstheme.mjs                  ← .vstheme XML generator (role+alpha resolution, extraRoles merge, XML validation)
  build-vsix.mjs                     ← VSIX packager (compile, header inject, stage, zip)
  decode-pkgdef.mjs                  ← pkgdef binary blob decoder for inspection
  publish.mjs                        ← Marketplace publisher (calls VsixPublisher.exe)
docs/
  COVERAGE.md                        ← Per-category token coverage matrix + add-a-category workflow
  PUBLISHING.md                      ← Manual Marketplace publish workflow
dist/                                ← .vstheme, .pkgdef, .vsix output (gitignored)
```

## Token coverage per flavor

| Category | GUID | Tokens | Drives |
| -------- | ---- | -----: | ------ |
| `DecorativeMPF` | `{0c37665d-8581-4451-8394-6f4d5abd88b1}` | 21 | Lavender + Purple + LightPurple families recolored to flavor green |
| `Shell` | `{73708ded-2d56-4aad-b8eb-73b20d3f4bff}` | 20 | Accent fills, surface backgrounds, text-on-accent |
| `ShellInternal` | `{5af241b7-5627-4d12-bfb1-2b67d11127d7}` | 10 | Title bar, menu bar, document tabs, status bar |
| `TreeView` | `{92ecf08e-8b13-4cf4-99e9-ae2692382185}` | 14 | Solution Explorer / Test Explorer selection, chevron, drag-over |
| `Text Editor Text Manager Items` | `{58e96763-1d3b-4e05-b6ba-ff7115fd0b7b}` | 5 | Editor canvas: Plain Text, Selected Text variants, Indicator Margin |
| `Text Editor MEF Items` | `{75a05685-00a8-4ded-bae5-e7a50bfa929a}` | 44 | Modern syntax, rainbow brackets, Peek, inline diff/merge, breakpoint fills, Current Statement, ref highlights |
| `Text Editor Language Service Items` | `{e0187991-b458-4f7e-8ca9-42c9a573b56c}` | 18 | Legacy classifier syntax (duplicates MEF) + `User Types(Value types/Interfaces/Delegates/Enums/Type parameters)` |
| `Text Editor Text Marker Items` | `{ff349800-ea43-46c1-8c98-878e78f46501}` | 11 | Squiggles, snippet fields, Definition Window backdrop, Edit-and-Continue |
| `Output Window` | `{9973efdf-317d-431c-8bc1-5e88cbfd4f7f}` | 6 | Build/Debug output backdrop + OutputError/Heading/Verbose runs |
| `Find Results` | `{5c48b2cb-0366-4fbf-9786-0bb37e945687}` | 4 | Find-in-Files results panel |
| `Editor Tooltip` | `{a9a5637f-b2a8-422e-8fb5-dfb4625f0111}` | 1 | Hover QuickInfo panel backdrop |
| `CodeSense` | `{fc88969a-cbed-4940-8f48-142a503e2381}` | 5 | CodeLens "N references" indicators |

**Total: ~159 tokens overridden per flavor across 12 categories.** Editor syntax (Keyword/Comment/String/etc.) IS now overridden — duplicated across `Text Editor MEF Items` (modern classifier) and `Text Editor Language Service Items` (legacy classifier) so colors apply regardless of which classifier the language service emits through. See `docs/COVERAGE.md` for the full coverage matrix including categories we intentionally inherit from FallbackId.

**⚠️ Category GUID caveat**: `Text Editor Text Manager Items` and `Text Editor MEF Items` *share* GUID `{75a05685-…}` in MS's own pkgdefs but appear under different registry keys. VS routes by category NAME, not GUID. Our `Text Editor Text Manager Items` uses the standalone GUID `{58e96763-…}` (verified by decoding `EditorColors.pkgdef`).

## Generator role syntax

In `src/mapping/vs-key-map.json`, color values use:

- `$role` — resolves from the flavor's palette (e.g. `$green`, `$bg`, `$fg`).
- `$role:alphaHex` — same role with overridden alpha byte (e.g. `$green:e5` = green at 0xE5 alpha).
- `#rrggbb` or `#rrggbbaa` — literal color.
- Per-flavor `extraRoles` in `src/flavors/*.json` add palette entries (e.g. `accentFg` = readable text drawn on the green accent surface; varies per flavor).

Roles are resolved by `resolveRole()` in `scripts/build-vstheme.mjs`. Extra roles are merged via `buildPalette()`. The generated XML is then run through `validateThemeXml()` which catches duplicate names, duplicate GUIDs, missing Background+Foreground, bad ARGB sources, and tag mismatch — fails the build before `VsixColorCompiler.exe` silently emits a no-op pkgdef.

To add a new category, see the workflow in `docs/COVERAGE.md` (decode → add to map → build → verify).

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

6. **Manifest `<Identity Id>` mirrors the VS Code extension ID** —
   `hector-jimenez.vs-xbox-theme` (lowercase, kebab, `publisher.name` format).
   This matches `marketplace.visualstudio.com/items?itemName=…` and the VS
   Code listing for cross-marketplace consistency. The constant lives at the
   top of `build-vsix.mjs` as `IDENTITY_ID`. NEVER change it post-publish —
   doing so orphans every existing install (no update path) and requires a
   brand-new Marketplace listing. The output `.vsix` filename matches the Id:
   `hector-jimenez.vs-xbox-theme-<version>.vsix`.

7. **Pkgdef binary blob format** (one per category, after the `Data=hex:` prefix):
   - 12-byte header
   - 16-byte category GUID (Data1 LE, Data2 LE, Data3 LE, Data4 BE)
   - 4-byte little-endian color count
   - Then per-color: `nameLen(4 LE) + name(utf8) + bgFlag(1) + [4 bytes if bgFlag≠0] + fgFlag(1) + [4 bytes if fgFlag≠0]`
   - Color stored as R, G, B, A (one byte each).
   - **Flag values**: `0x00` = no color, `0x01` = raw RGBA. Microsoft's `EditorColors.pkgdef` also uses `0x02`–`0x05` for VsColor *reference* tokens (the 4 trailing bytes are an index, not an RGB). The decoder treats any non-zero flag as "4 bytes follow" so it can keep parsing past reference tokens.

   The decoder in `scripts/decode-pkgdef.mjs` implements this; use it whenever
   you want to verify what a pkgdef actually contains.

8. **Editor categories share GUIDs but route by NAME.** `Text Editor Text Manager Items` (5 tokens) and `Text Editor MEF Items` (153 tokens) both use GUID `{75a05685-…}` in Microsoft's own pkgdefs but appear under separate `[$RootKey$\Themes\{theme-guid}\<Category Name>]` registry keys. VS looks them up by the bracketed name, not the GUID. Our map uses GUID `{58e96763-…}` for Text Editor Text Manager Items (the standalone GUID from the Light/Dark theme's own block) which works equivalently and avoids ambiguity. **Syntax tokens belong in `Text Editor MEF Items` + `Text Editor Language Service Items`, NOT in `Text Editor Text Manager Items`** — the latter only holds 5 base tokens (Plain Text, Selected Text + variants, Indicator Margin).

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
- **Extension Manager pivot underline.** Was confirmed purple in v0.1 across
  every theme (including MS built-ins). After expanding DecorativeMPF to
  recolor the Lavender family (`LavenderPrimaryAlt` → flavor green), this MAY
  now pick up the accent — needs visual verification in a fresh VS install.
- **Environment category (773 tokens, currently inherited).** Targeted overrides
  for status-bar accent / dialog chrome could be added later without exploding
  scope. See `docs/COVERAGE.md` for the full intentional-skip list.

## Sibling repo

`C:\Users\hectorj\Sites\vs-code-xbox-theme` (or
[`hectorjjb/vs-code-xbox-theme`](https://github.com/hectorjjb/vs-code-xbox-theme))
is the original VS Code theme. The two repos share `src/palette.json` byte-for-
byte — if you change the canonical palette, copy the file across both.
