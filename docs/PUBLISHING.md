# Publishing to the Visual Studio Marketplace

Manual publish workflow using `VsixPublisher.exe`. No GitHub Actions — every release is run from a developer machine.

## One-time setup

### 1. Create a Marketplace publisher

1. Sign in at <https://marketplace.visualstudio.com/manage/publishers> with the Microsoft account you want listed as publisher.
2. **Create publisher** → set **Publisher ID** to `hector-jimenez` (must match the same publisher used by the [VS Code Xbox Theme](https://marketplace.visualstudio.com/items?itemName=hector-jimenez.xbox-theme) so both extensions appear under one identity; this value is stamped into `extension.vsixmanifest.template` and `publish/publish-manifest.json`).
3. Set the display name (e.g. "Hector Jimenez") and icon.

### 2. Create a Personal Access Token (PAT)

1. Go to <https://dev.azure.com/> → User Settings (top right) → **Personal access tokens** → **New Token**.
2. **Organization**: All accessible organizations.
3. **Scopes**: **Custom defined** → Marketplace → ✅ **Acquire** + ✅ **Publish** + ✅ **Manage**.
4. **Expiration**: 1 year (max).
5. Copy the token. **Store it somewhere safe — you can't see it again.**

Store the token in a private location outside the repo. Suggested:

```powershell
# One-time, per machine. Never commit this.
[Environment]::SetEnvironmentVariable("VS_MARKETPLACE_PAT", "<paste-token-here>", "User")
```

(Restart your terminal after running the above so `$env:VS_MARKETPLACE_PAT` is visible.)

## Per-release workflow

### 1. Bump version

Edit `package.json` `"version"` (semver). The build script reads from there and stamps both `extension.vsixmanifest` `<Identity Version>` and the pkgdef path.

### 2. Build the VSIX

```powershell
npm run package
```

Produces `dist\hector-jimenez.xbox-theme-<version>.vsix`. Sanity check:
- File size around 1 MB (the bulk is `images/preview.png`).
- Decode any one pkgdef and confirm all 5 categories present:
  ```powershell
  node scripts\decode-pkgdef.mjs dist\vsix-stage\Themes\xbox-series-x.pkgdef
  ```

### 3. Smoke-test locally

Double-click the VSIX, install into VS 2026, restart, switch to each Xbox theme via **Tools → Theme**. Confirm:
- Title bar / menu bar / status bar all green-tinted (active state).
- Solution Explorer row selection = green.
- Editor background, line highlight, selection match the flavor.

### 4. Publish

```powershell
npm run publish
```

That runs `scripts/publish.mjs`, which calls:

```text
VsixPublisher.exe publish \
  -payload  dist\hector-jimenez.xbox-theme-<version>.vsix \
  -publishManifest publish\publish-manifest.json \
  -personalAccessToken $env:VS_MARKETPLACE_PAT
```

The first publish takes ~30 seconds; subsequent updates are faster. Marketplace then takes 5–15 minutes to validate and surface the new version on the gallery.

### 5. Verify

- `https://marketplace.visualstudio.com/items?itemName=hector-jimenez.xbox-theme`
- Inside VS 2026 → Extensions → Manage Extensions → Browse tab → search "Xbox Themes". The list view should show the new version.

### 6. Tag the release

```powershell
git tag v<version>
git push origin v<version>
```

Optionally, create a GitHub Release at `https://github.com/hectorjjb/vs-xbox-theme/releases/new` and attach the `.vsix` as a binary asset for users who don't want to go through the Marketplace.

## Troubleshooting

| Symptom | Likely cause | Fix |
| ------- | ------------ | --- |
| `Unauthorized` from VsixPublisher | PAT expired or missing Marketplace scope | Generate new PAT (one-time setup step 2). |
| `Extension already exists with this version` | Forgot to bump `package.json`'s `version` | Bump and rebuild. |
| Marketplace shows extension but icon/preview missing | `images/icon.png` or `images/preview.png` not staged in VSIX | Re-run `npm run package`; confirm `dist\vsix-stage\images\` contains both. |
| Marketplace tile screenshot wrong | `publish/overview.md` references the wrong image URL | Edit overview.md, re-run `npm run publish` (no need to rebuild VSIX — overview is server-side). |
| `"category"` validation error | `publish/publish-manifest.json` has an unsupported category | Categories must be from <https://learn.microsoft.com/en-us/visualstudio/extensibility/vsix-extension-schema-2-0-reference#categories>. |

## Files involved

```
publish/
  publish-manifest.json     ← Marketplace-only metadata (categories, repo URL, overview)
  overview.md               ← Long-form description rendered on the Marketplace gallery page
scripts/
  publish.mjs               ← npm run publish — locates VsixPublisher.exe, calls it
src/vsix/
  extension.vsixmanifest.template  ← In-VSIX manifest (DisplayName, Description, Tags, Icon, PreviewImage)
```

The Marketplace shows fields from BOTH the in-VSIX manifest and `publish-manifest.json` + `overview.md`. Keep them in sync where they overlap (e.g. publisher ID, internal name).
