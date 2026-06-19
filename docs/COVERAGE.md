# Token Coverage Matrix

> Snapshot of which Visual Studio 2026 theme categories the XBOX Themes extension overrides, and how much of each category is overridden. Anything we don't override is inherited from the **FallbackId** theme (`Microsoft Visual Studio Dark` for the dark flavors, `Microsoft Visual Studio Light` for `xbox-360` and `xbox-hc-light`).
>
> Token counts come from decoding the shipping VS 2026 pkgdef files (`Theme.Dark.pkgdef`, `EditorColors.pkgdef`, `Shell.Dark.pkgdef`) with `scripts/decode-pkgdef.mjs`. Override counts come from the compiled pkgdef of `xbox-series-x.pkgdef`. The numbers are identical across the six flavors — only the palette resolves differently.
>
> Last updated: 2026-06-19. Re-decode after any VS 2026 SDK update with:
> ```powershell
> node scripts/decode-pkgdef.mjs dist\vsix-stage\Themes\xbox-series-x.pkgdef
> ```

## Summary

| Bucket | Overridden | Available | Coverage |
| ------ | ---------: | --------: | -------: |
| Chrome (Shell, ShellInternal, Decorative) | 51 | 213 | 24% |
| Tool windows (TreeView, Output, Find, Tooltip, CodeSense) | 30 | 41 | 73% |
| Editor (Text Manager + MEF + Language Service + Text Marker) | 78 | 215 | 36% |
| Environment (status bar, dialogs, badges, search, etc.) | 0 | 773 | 0% (inherited) |
| **Total** | **159** | **1,242** | **13%** |

## Per-category detail

| Category | GUID | Overridden | Available | Coverage | Purpose |
| -------- | ---- | ---------: | --------: | -------: | ------- |
| `DecorativeMPF` | `{0c37665d-…d88b1}` | 21 | 91 | 23% | Recolors the Lavender/Purple/LightPurple families to the flavor green so any UI that pulls from "lavender" picks up green (e.g. Extension Manager pivot underline). Red/Orange/Yellow/Teal/Blue/Grape/Grey are left alone — they're semantic. |
| `Shell` | `{73708ded-…f4bff}` | 20 | 94 | 21% | Accent family (Default/Secondary/Tertiary/Alt/Senary/SelectedText*), surface backgrounds, TextOnAccent. Drives the title-bar underline, focused link, accent button fill. |
| `ShellInternal` | `{5af241b7-…11127d7}` | 10 | 28 | 36% | Title bar, menu bar, document tab strip, status bar, environment logo. Matches the Bubblegum-style chrome pattern. |
| `TreeView` | `{92ecf08e-…2382185}` | 14 | 18 | 78% | Solution Explorer / Test Explorer row selection, expand chevron, drag-over highlight, search-result span. |
| `Text Editor Text Manager Items` | `{58e96763-…0b7b}` | 5 | 5 | 100% | Editor canvas (Plain Text, Selected Text variants, Indicator Margin gutter). |
| `Text Editor MEF Items` | `{75a05685-…929a}` | 44 | 153 | 29% | Modern (MEF) syntax + rainbow brackets + Peek + inline diff/merge + breakpoint fills + Current Statement + reference highlights. Shares its GUID with Text Editor Text Manager Items but VS routes by category name. |
| `Text Editor Language Service Items` | `{e0187991-…b56c}` | 18 | 45 | 40% | Legacy classifier — duplicates the syntax tokens so VS picks up colors regardless of which classifier fires. Adds `User Types(Value types/Interfaces/Delegates/Enums/Type parameters)` subtype overrides for C# semantic coloring. |
| `Text Editor Text Marker Items` | `{ff349800-…6501}` | 11 | 12 | 92% | Squiggle layer — compiler errors/warnings, hinted suggestions, snippet fields, Definition Window backdrop, Edit-and-Continue strip. |
| `Output Window` | `{9973efdf-…4f7f}` | 6 | 9 | 67% | Build/Debug/General output tool window — backdrop, selection, plus OutputError / OutputHeading / OutputVerbose colored runs. |
| `Find Results` | `{5c48b2cb-…5687}` | 4 | 8 | 50% | Find-in-Files results window — backdrop, selection, current result row. |
| `Editor Tooltip` | `{a9a5637f-…0111}` | 1 | 1 | 100% | Hover (QuickInfo) panel backdrop. |
| `CodeSense` | `{fc88969a-…2381}` | 5 | 5 | 100% | CodeLens "N references" / git-blame / test-status indicator above each method. |

## Intentionally not overridden

These categories exist in VS 2026 and are inherited from the FallbackId theme. We don't override them because either (a) the fallback is fine, (b) overriding would clash with VS's information design (Red/Orange/Yellow semantic colors), or (c) the surface is so rarely-seen that the maintenance cost outweighs the visual win.

| Category | Tokens | Reason |
| -------- | -----: | ------ |
| `Environment` | 773 | Status bar variants, dialog chrome, badge fills, search affordances — covered well enough by the FallbackId theme. Targeted overrides could be added later for status bar accent. |
| `CommonControls` | 92 | Button / list / progress-bar primitives. Fallback styling is consistent enough. |
| `CommonDocument` | 100 | Tab document chrome (mostly the dirty-dot indicator, modified borders). |
| `Cider` | 184 | XAML designer surface — out of scope. |
| `NewProjectDialog` | 32 | Modal dialog only seen at project create time. |
| `StartPage` | 65 | Hidden in VS 2026 — replaced by the Start Window. |
| `InfoBar`, `NotificationBubble`, `UserNotifications` | 134 | Notification chrome — semantic (info=blue, warning=orange) by design. |
| `SearchControl`, `VSSearch`, `NavigateTo` | 92 | Search field internals. |
| `Diagnostics`, `IntelliTrace` | 39 | Debugger timeline + history. |
| `ThemedDialog`, `ThemedAcceleratedDialog`, `ThemedUtilityDialog`, `UnthemedDialog` | 83 | Stock dialog chrome. |
| `ProgressBar`, `Header`, `InformationBadge`, `Promotion`, `Find`, `CodeAnalysis`, `ListViewGrid`, `ManifestDesigner`, `ProjectDesigner`, `SharePointTools`, `UserInformation`, `VisualStudioInstaller`, `GraphicsDebugger`, `ACDCOverview` | 248 | Niche surfaces; fallback is fine. |

## Adding a new category

1. Decode the relevant pkgdef to confirm the category exists, find its GUID, and see what tokens it ships:
   ```powershell
   node scripts/decode-pkgdef.mjs "C:\Program Files\Microsoft Visual Studio\18\Insiders\Common7\IDE\CommonExtensions\Platform\EditorColors.pkgdef" "Category Name"
   ```
2. Add a new top-level entry to `src/mapping/vs-key-map.json` with `_guid`, `_doc`, and your token overrides (using `$role` references).
3. If a token needs a color the palette doesn't carry yet, either add the role to `src/palette.json` for every flavor that uses it, or add a per-flavor `extraRoles` entry in `src/flavors/<flavor>.json`.
4. Run `npm run build` — the validator will catch duplicate names, missing GUIDs, and malformed ARGB.
5. Run `npm run package` and verify with `node scripts/decode-pkgdef.mjs dist/vsix-stage/Themes/xbox-series-x.pkgdef "Category Name"`.
6. Update this file's counts.
