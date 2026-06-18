# Changelog

## 0.1.0 (unreleased)

- Initial scaffold targeting **Visual Studio 2026**'s new modernized theme schema.
- All 6 Xbox flavors shipping in a single VSIX:
  - **Xbox Original** — dark, neon-green accent (2001 hardware)
  - **Xbox 360** — light, classic green (Light fallback)
  - **Xbox One** — dark, Monokai-inspired
  - **Xbox Series X** — dark, lime accent (25th Anniversary translucent green)
  - **Xbox High Contrast (Dark)** — pure black + vivid green
  - **Xbox High Contrast (Light)** — pure white + deep green
- Each flavor: 20 Shell + 10 ShellInternal + 14 Editor tokens (full accent family + Bubblegum chrome pattern), inheriting the rest from VS's built-in Light or Dark base via `FallbackId`.
- Generator (`npm run build`), packager (`npm run package`), pkgdef decoder (`scripts/decode-pkgdef.mjs`), and decoded built-in references in `src/reference/`.
- Generator supports `$role:alphaHex` syntax (e.g. `$green:e5`) and per-flavor `extraRoles` so palette additions like `accentFg` (text drawn on accent surfaces) get readable contrast per flavor.
- VSIX targets `[17.9, 19.0)` for VS 2022 17.9+ and VS 2026 (18.x), both amd64 and arm64.
