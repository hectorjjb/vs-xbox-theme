# Reference themes

Decoded snapshots of VS 2026 built-in themes, extracted from the pkgdef binary blobs in `C:\Program Files\Microsoft Visual Studio\18\Insiders\Common7\IDE\CommonExtensions\Platform\` via `scripts/decode-pkgdef.mjs`.

Use these to:
- See every token VS knows about, in every category, with the canonical Light/Dark value.
- Pick the right token to override for a given visual effect.
- Verify our overrides actually differ from the inherited base.

| File | Source pkgdef | Notes |
| --- | --- | --- |
| `bubblegum.json` | `Theme.Bubblegum.pkgdef` | Canonical *tinted* theme — 7 Shell + 10 ShellInternal tokens. The template our flavors follow. |
| `shell-dark.json` | `Shell.Dark.pkgdef` | Full Dark base: 94 Shell, 28 ShellInternal, 106 Decorative, 8 EditorOverride. |
| `shell-light.json` | `Shell.Light.pkgdef` | Full Light base, same structure. |

To regenerate after a VS update:

```powershell
$p = "C:\Program Files\Microsoft Visual Studio\18\Insiders\Common7\IDE\CommonExtensions\Platform"
node scripts/decode-pkgdef.mjs "$p\Theme.Bubblegum.pkgdef"  | Set-Content -Encoding utf8 src/reference/bubblegum.json
node scripts/decode-pkgdef.mjs "$p\Shell.Dark.pkgdef"       | Set-Content -Encoding utf8 src/reference/shell-dark.json
node scripts/decode-pkgdef.mjs "$p\Shell.Light.pkgdef"      | Set-Content -Encoding utf8 src/reference/shell-light.json
```
