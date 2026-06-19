# Publishing to the Visual Studio Marketplace

Manual publish workflow using `VsixPublisher.exe`. No GitHub Actions — every release is run from a developer machine.

## Prerequisites checklist (this machine)

Before your first publish, confirm all of these:

- [ ] **Node.js 18+** on `PATH` (`node --version`).
- [ ] **VS 2026 SDK** installed — provides `VsixPublisher.exe` at `C:\Program Files\Microsoft Visual Studio\18\<Edition>\VSSDK\VisualStudioIntegration\Tools\Bin\VsixPublisher.exe`. Install via the VS Installer → "Visual Studio extension development" workload. If `npm run package` succeeds, this is already in place.
- [ ] **Marketplace publisher** `hector-jimenez` exists at <https://marketplace.visualstudio.com/manage/publishers>. (Already exists — it's the same publisher used for the VS Code `xbox-theme` extension. VS Marketplace and the VS Code Marketplace share one publisher namespace at `marketplace.visualstudio.com`.)
- [ ] **PAT** (Personal Access Token) with Marketplace **Manage** scope stored in `$env:VS_MARKETPLACE_PAT` for your user.
- [ ] A built VSIX in `dist\` — run `npm run package` if none.
- [ ] Working tree on `main` is clean and committed.

## One-time setup

### 1. Marketplace publisher (already done if you publish the VS Code theme)

1. Sign in at <https://marketplace.visualstudio.com/manage/publishers> with the Microsoft account that owns `hector-jimenez`.
2. Confirm the publisher ID is exactly `hector-jimenez` (lowercase, hyphen). This value is stamped into `extension.vsixmanifest.template`, `publish/publish-manifest.json`, and `scripts/build-vsix.mjs` as the `PUBLISHER` constant.
3. No second publisher needed — both the VS Code extension and this VS extension live under the same publisher and will appear together on the gallery page (`marketplace.visualstudio.com/publishers/hector-jimenez`).

### 2. Create a Personal Access Token (PAT)

1. Go to <https://dev.azure.com/> → User Settings (top right) → **Personal access tokens** → **New Token**.
2. **Organization**: All accessible organizations.
3. **Scopes**: **Custom defined** → Marketplace → ✅ **Acquire** + ✅ **Publish** + ✅ **Manage**.
4. **Expiration**: 1 year (max).
5. Copy the token. **Store it somewhere safe — you can't see it again.**

> **Tip**: If you already have a `VSCE_PAT` for publishing the VS Code theme with the same Marketplace scopes, you can reuse the same token — just set it under `VS_MARKETPLACE_PAT` as well. Both `vsce` (VS Code) and `VsixPublisher.exe` (VS) authenticate against the same `marketplace.visualstudio.com` endpoint and accept the same PAT format.

Store the token in a private location outside the repo:

```powershell
# One-time, per machine. Never commit this.
[Environment]::SetEnvironmentVariable("VS_MARKETPLACE_PAT", "<paste-token-here>", "User")
```

Restart your terminal after running the above so `$env:VS_MARKETPLACE_PAT` is visible. Verify:

```powershell
$env:VS_MARKETPLACE_PAT.Length    # should print a number around 84
```

### 3. (Optional) Verify VS SDK tooling

```powershell
Test-Path "C:\Program Files\Microsoft Visual Studio\18\Insiders\VSSDK\VisualStudioIntegration\Tools\Bin\VsixPublisher.exe"
```

Should print `True`. If `False`, install the "Visual Studio extension development" workload from the VS Installer. `scripts/publish.mjs` probes Insiders / Preview / Enterprise / Pro / Community so any of those editions works.

## Per-release workflow

### 1. (Maybe) bump version

Edit `package.json` `"version"` (semver). The build script reads from there and stamps both `extension.vsixmanifest` `<Identity Version>` and the pkgdef path.

> **Hector's rule**: don't bump the version until you're actually about to publish. Multiple commits at the same version are fine during development.

### 2. Build the VSIX

```powershell
npm run package
```

Produces `dist\hector-jimenez.vs-xbox-theme-<version>.vsix`. Sanity check:

- File size around **1.05 MB** (the bulk is `images/preview.png`).
- Decode any one pkgdef and confirm all **12 categories** present (DecorativeMPF, Shell, ShellInternal, TreeView, Text Editor Text Manager Items, Text Editor MEF Items, Text Editor Language Service Items, Text Editor Text Marker Items, Output Window, Find Results, Editor Tooltip, CodeSense):
  ```powershell
  node scripts\decode-pkgdef.mjs dist\vsix-stage\Themes\xbox-series-x.pkgdef
  ```
- Validate the staged manifest identity (must be `hector-jimenez.vs-xbox-theme`):
  ```powershell
  Select-String -Path dist\vsix-stage\extension.vsixmanifest -Pattern "Identity Id"
  ```

### 3. Smoke-test locally

Uninstall any previously-installed Xbox Themes from VS first (VS aggressively caches pkgdefs by version — reinstalling over the same version usually no-ops). Then:

1. Double-click the `.vsix`
2. Restart VS
3. Switch to each Xbox theme via **Tools → Theme**

Confirm:
- Title bar / menu bar / status bar all green-tinted (active state).
- Solution Explorer row selection = green.
- Editor background, line highlight, selection match the flavor.
- Hover tooltip backdrop matches the flavor (not the parent theme's grey).
- CodeLens "N references" text is muted (`fgDim`).

### 4. Publish

```powershell
npm run publish
```

That runs `scripts/publish.mjs`, which:
1. Probes for `VsixPublisher.exe` across all VS install editions.
2. Picks the most recently-mtime'd `.vsix` in `dist\`.
3. Reads `publish/publish-manifest.json` and verifies `overview.md` exists.
4. Invokes:
   ```text
   VsixPublisher.exe publish ^
     -payload dist\hector-jimenez.vs-xbox-theme-<version>.vsix ^
     -publishManifest publish\publish-manifest.json ^
     -personalAccessToken $env:VS_MARKETPLACE_PAT ^
     -ignoreWarnings VSIXValidatorWarning01,VSIXValidatorWarning02
   ```
5. Prints the gallery URL.

The first publish takes ~30 seconds; subsequent updates are faster. Marketplace then takes **5–15 minutes** to validate and surface the new version on the gallery.

### 5. Verify

- Gallery: <https://marketplace.visualstudio.com/items?itemName=hector-jimenez.vs-xbox-theme>
- Inside VS 2026 → Extensions → Manage Extensions → **Browse** tab → search "Xbox Themes". The list should show the new version with the full overview pane (publisher badge, "From Visual Studio Marketplace", "View In Browser", "Report Abuse"). A side-loaded install only shows the short `<Description>` — the rich pane only renders for Marketplace installs.

### 6. Tag the release

```powershell
git tag v<version>
git push origin v<version>
```

Optionally, create a GitHub Release at <https://github.com/hectorjjb/vs-xbox-theme/releases/new> and attach the `.vsix` as a binary asset for users who don't want to go through the Marketplace.

## Troubleshooting

| Symptom | Likely cause | Fix |
| ------- | ------------ | --- |
| `"category"` validation error (`VsixPub0006`) | `publish-manifest.json` has an unsupported category | Categories must come from the [vsix-publish schema enum](https://json.schemastore.org/vsix-publish) — **lowercase**, themes use `"theme"` (singular). NOT `"Themes"` or `"tools"`. |
| `VsixPub0023: tag is too large` | Tags in `extension.vsixmanifest` are **comma-separated** | Use **semicolons** instead: `<Tags>theme;color theme;...</Tags>`. The Marketplace treats the entire comma-delimited string as one tag. |
| `VsixPub0029: Cannot determine the extension deployment technology` | First-time publish via CLI fails | **First publish must be via the web portal** at <https://marketplace.visualstudio.com/manage/publishers/hector-jimenez> → New extension → Visual Studio. Subsequent updates work via `npm run publish`. |
| `API version of 18.0 as the lower bound ... not allowed` | `<InstallationTarget Version="[18.0,...">` | Use `[17.14,)` per the [VS 2026 compat model](https://aka.ms/vs2026extensioncompat). Lower bound = API version; upper bound is ignored. |
| `Publisher display name (X) and Author name (Y) need to be the same` | `<Identity Publisher="slug">` in manifest doesn't match the registered publisher display name | Set `<Identity Publisher>` to the **display name** (e.g. `"Hector Jimenez"`, not `"hector-jimenez"`). See `PUBLISHER_NAME` constant in `scripts/build-vsix.mjs`. |
| `specifies 'x86' as the target product architecture` | Missing `<ProductArchitecture>` element under `<InstallationTarget>` | Add `<ProductArchitecture>amd64</ProductArchitecture>`. VS 2022+ doesn't support x86 (the default when omitted). |
| `Upload failed: The extension already exists` | `internalName` slug collides with an existing extension (including VS Code listings — the namespace is shared) | Pick a different `internalName` in `publish-manifest.json` and `IDENTITY_ID` in `scripts/build-vsix.mjs`. |
| `ERROR: $env:VS_MARKETPLACE_PAT not set` | Token not exported, or new terminal session hasn't picked it up | Re-run the `[Environment]::SetEnvironmentVariable(..., "User")` line; open a fresh terminal. |
| `Unauthorized` from VsixPublisher | PAT expired or missing Marketplace scope | Generate new PAT (one-time setup step 2). |
| `Extension already exists with this version` | Forgot to bump `package.json`'s `version` | Bump and rebuild. |
| `The extension identifier does not match` | `publish-manifest.json` `internalName` ≠ Identity Id name segment | Both must be `vs-xbox-theme`. Check `publish/publish-manifest.json` `identity.internalName` and `scripts/build-vsix.mjs` `IDENTITY_ID`. |
| Marketplace shows extension but icon/preview missing | `images/icon.png` or `images/preview.png` not staged in VSIX | Re-run `npm run package`; confirm `dist\vsix-stage\images\` contains both. |
| Marketplace tile screenshot wrong | `publish/overview.md` references the wrong image URL | Edit overview.md, re-run `npm run publish` (no need to rebuild VSIX — overview is server-side metadata). |
| `VsixPublisher.exe not found` | VS extension development workload not installed | Install via VS Installer → Workloads → "Visual Studio extension development". |
| Side-loaded install shows only short description, no overview pane | Working as intended — see step 5 | Publish to Marketplace and reinstall via Browse tab to get the rich pane. |

## Files involved

```
publish/
  publish-manifest.json     ← Marketplace-only metadata (categories, repo URL, overview)
  overview.md               ← Long-form description rendered on the Marketplace gallery page (~5 KB max)
scripts/
  publish.mjs               ← `npm run publish` — locates VsixPublisher.exe, calls it
src/vsix/
  extension.vsixmanifest.template  ← In-VSIX manifest (DisplayName, Description, Tags, Icon, PreviewImage)
images/
  icon.png                  ← 128×128, in-VSIX, shown in Extension Manager + Marketplace tile
  preview.png               ← 1MB, in-VSIX, hero image at top of overview pane
  xbox-*.jpg                ← Screenshots, NOT in-VSIX — served from raw.githubusercontent.com via overview.md
```

The Marketplace shows fields from BOTH the in-VSIX manifest and `publish-manifest.json` + `overview.md`. Keep them in sync where they overlap (publisher ID, internal name, version).

## Identity fields cheat sheet

These four strings must all agree. Mismatches are the #1 reason a first publish fails.

| Field | Location | Value |
| ----- | -------- | ----- |
| Publisher (slug) | `scripts/build-vsix.mjs` `PUBLISHER_ID`, `publish-manifest.json` `publisher` | `hector-jimenez` |
| Publisher (display name) | `scripts/build-vsix.mjs` `PUBLISHER_NAME`, `extension.vsixmanifest` `<Identity Publisher>` | `Hector Jimenez` |
| Identity Id | `scripts/build-vsix.mjs` `IDENTITY_ID`, `extension.vsixmanifest` `<Identity Id>` | `hector-jimenez.vs-xbox-theme` |
| Internal name | `publish-manifest.json` `identity.internalName` | `vs-xbox-theme` |
| Marketplace URL slug | derived | `hector-jimenez.vs-xbox-theme` |

Once published, **Identity Id is permanent** — changing it orphans every existing install. See gotcha #6 in `.github/copilot-instructions.md`.

