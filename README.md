# Xbox Themes for Visual Studio

[![License](https://img.shields.io/badge/license-Apache--2.0-107c10.svg)](LICENSE)
[![VS Version](https://img.shields.io/badge/Visual%20Studio-2026%20%7C%202022%2017.9%2B-107c10)](https://visualstudio.microsoft.com/)

Six Xbox-inspired color themes for **Visual Studio 2026** (and forward-compatible with VS 2022 17.9+) — a sibling port of [`vs-code-xbox-theme`](https://github.com/hectorjjb/vs-code-xbox-theme) sharing the same canonical palette.

![Xbox console generations](images/preview.png)

## Themes

**Console editions** (chronological)

- **Xbox Original (2001)** — dark, matte-black base with the translucent neon-green "jewel" accent (`#9bf00b`).
- **Xbox 360 (2005)** — clean light variant with classic Xbox green accents.
- **Xbox One (2013)** — the deep-charcoal dashboard look.
- **Xbox Series X (2020)** — 25th Anniversary edition: neutral warm grays with a soft controller-lime accent.

**High Contrast editions** (accessibility)

- **Xbox High Contrast (Dark)** — pure-black background, white text, vivid green accent (`#2ecc40`, ~9.8:1 contrast).
- **Xbox High Contrast (Light)** — pure-white background, black text, deep green/blue contrast borders.

## Install

### Prerequisite (one-time)
This VSIX targets the new VS 2026 modernized theme schema. To build from source, install the **Visual Studio extension development** workload (provides `VsixColorCompiler.exe`):

1. Open **Visual Studio Installer** → **Modify** your VS 2026 install.
2. **Workloads** tab → check **Visual Studio extension development** → **Modify**.

### Install the VSIX

1. Download the latest `.vsix` from [Releases](https://github.com/hectorjjb/vs-xbox-theme/releases) (or build locally — see below).
2. Double-click the `.vsix` to launch **VSIX Installer**, accept, and let it install for VS 2026.
3. Restart Visual Studio.
4. **Tools → Theme → \<pick any Xbox theme\>**.

### Build from source

```powershell
git clone https://github.com/hectorjjb/vs-xbox-theme.git
cd vs-xbox-theme
npm install
npm run package    # → dist\XboxThemes.<guid>-<version>.vsix
```

To regenerate just the XML (no VSIX):

```powershell
npm run build              # all 6 flavors
npm run build:series-x     # one flavor → dist\xbox-series-x.vstheme
```

## How it works (VS 2026 theming model)

VS 2026 ships a [new minimal theme schema](https://learn.microsoft.com/en-us/visualstudio/extensibility/migration/modernize-theme-colors):

- ~229 tokens across **4 categories** (down from ~1,806 across ~34 in VS 2022).
- A `FallbackId` attribute on `<Theme>` inherits everything not overridden from a built-in **Light** or **Dark** theme — we declare only the ~50 tokens that give each flavor its identity.
- **No "Import Theme" UI** in VS 2026. Custom themes ship as a **VSIX**.

Token coverage per flavor:

| Category | Tokens | Drives |
| -------- | -----: | ------ |
| `DecorativeMPF` | 21 | Pivot underlines, decorative tints (Lavender / Purple recolored to flavor green) |
| `Shell` | 20 | Accent fills, surface backgrounds, text-on-accent |
| `ShellInternal` | 10 | Title bar, menu bar, document tabs, status bar (active state) |
| `Text Editor Text Manager Items` | 14 | Editor background, foreground, selection, line highlight, cursor |

Editor syntax colors (the actual `Identifier`/`Keyword`/`String`/etc. tokens) still use the legacy Text Editor system in VS 2026.

## Compatibility

| Version | Status |
| ------- | ------ |
| Visual Studio 2026 (18.x) | ✅ Primary target |
| Visual Studio 2022 17.9+ | ✅ Same VSIX (manifest targets `[17.9, 19.0)`) |
| Visual Studio 2022 < 17.9 | ❌ Modernized schema not available |
| VS Code | Use the [sibling extension](https://github.com/hectorjjb/vs-code-xbox-theme) |

## Repo layout

```
src/
  palette.json                            ← shared with vs-code-xbox-theme (source of truth)
  mapping/vs-key-map.json                 ← VS 2026 token map (DecorativeMPF + Shell + ShellInternal + Editor)
  flavors/*.json                          ← per-flavor metadata (name, GUID, FallbackId, accentFg)
  reference/                              ← decoded built-in theme pkgdefs (for development)
  vsix/
    extension.vsixmanifest.template       ← VSIX manifest with {{TOKEN}} placeholders
    [Content_Types].xml                   ← OPC content type map
images/                                   ← icon.png + preview.png for Extension Manager
scripts/
  build-vstheme.mjs                       ← XML generator (role+alpha syntax, extraRoles merge)
  build-vsix.mjs                          ← VSIX packager (compile, header inject, stage, zip)
  decode-pkgdef.mjs                       ← pkgdef binary blob inspector
dist/                                     ← generated .vstheme, .pkgdef, .vsix (gitignored)
```

## Contributing

Issues and PRs welcome — please file at <https://github.com/hectorjjb/vs-xbox-theme/issues>.

## License

[Apache-2.0](LICENSE) © Hector Jimenez
