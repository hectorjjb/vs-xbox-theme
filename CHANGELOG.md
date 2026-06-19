# Changelog

## 0.1.1 — 2026-06-19

Display-name patch — no token or theme functionality changed.

- **Brand styling:** "Xbox" → **"XBOX"** (all-caps) everywhere it appears in user-visible prose: the Marketplace display name, the per-flavor theme names shown in **Tools → Theme** (`XBOX Original`, `XBOX 360`, `XBOX One`, `XBOX Series X`, `XBOX High Contrast (Dark)`, `XBOX High Contrast (Light)`), the README, the gallery overview, and the in-VSIX description. Matches the casing used by the sibling VS Code extension's theme labels and aligns both Marketplace listings.
- Extension ID (`hector-jimenez.vs-xbox-theme`), Marketplace URL, flavor file names, and all internal identifiers remain unchanged. Existing installs receive this as a normal update.

## 0.1.0 — 2026-06-19

First public release on the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=hector-jimenez.vs-xbox-theme).

### Themes (6)

All six XBOX flavors shipping in a single VSIX, each declaring a `FallbackId` so unspecified tokens inherit from VS's built-in Light or Dark base theme:

- **XBOX Original** — dark, neon-green accent (2001 hardware translucent jewel)
- **XBOX 360** — light, classic XBOX green (Light fallback)
- **XBOX One** — dark, dashboard-charcoal look
- **XBOX Series X** — dark, 25th Anniversary lime accent
- **XBOX High Contrast (Dark)** — pure black + vivid green (~9.8:1 contrast)
- **XBOX High Contrast (Light)** — pure white + deep green

### Token coverage

**159 tokens overridden per flavor across 12 categories** of the VS 2026 modernized theme schema:

| Category | Tokens | Role |
| -------- | -----: | ---- |
| `DecorativeMPF` | 21 | Lavender / Purple decorative tints → flavor green |
| `Shell` | 20 | Accent fills, surface backgrounds, text-on-accent |
| `ShellInternal` | 10 | Title bar, menu bar, document tabs, status bar |
| `TreeView` | 14 | Solution Explorer / Test Explorer row selection, chevron, focus |
| `Text Editor Text Manager Items` | 5 | Plain text + selection + indicator margin |
| `Text Editor MEF Items` | 50 | Editor background + syntax (keywords, strings, comments, types, operators), Peek, merge conflict, breakpoints, Current Statement |
| `Text Editor Language Service Items` | 9 | User Types (Value, Interface, Delegate, Enum, Type Param) |
| `Text Editor Text Marker Items` | 9 | Inactive code, brace matching, hot reload markers |
| `Output Window` | 4 | Foreground, error, warning, informational |
| `Find Results` | 7 | Search results window text + active match |
| `Editor Tooltip` | 5 | Hover quick-info backdrop + text + border |
| `CodeSense` | 5 | IntelliSense list backdrop + suggestion text |

### Generator features

- `npm run build` (XML only) and `npm run package` (full VSIX pipeline)
- Role syntax with alpha override (`$green:e5`) and per-flavor `extraRoles` for context-sensitive colors like `accentFg`
- `scripts/decode-pkgdef.mjs` decodes compiled binary blobs (including VsColor flag values `0x02–0x05`)
- `scripts/build-vstheme.mjs` validates each generated XML for missing role resolutions

### Marketplace identity

- Publisher: `hector-jimenez`
- Extension ID: `hector-jimenez.vs-xbox-theme`
- Internal name: `vs-xbox-theme`
- Installation target: `[17.14,)` for VS Community / Pro / Enterprise on `amd64`

### Known limitations

- VS 2022 (< 17.14) is not a supported target — the modernized theme schema is VS 2026-only.
- arm64 not yet published (single-payload-per-entry; multi-arch is a VS 18+ Marketplace capability).
- Editor syntax overrides are partial — token names that don't match the legacy classifier may fall back to the base theme.
