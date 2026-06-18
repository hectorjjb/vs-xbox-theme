#!/usr/bin/env node
// Packages all generated .vstheme files into a single double-clickable VSIX.
//
// Steps:
//   1. Locate VsixColorCompiler.exe (from the VS "extension development" workload).
//   2. Run the XML generator to refresh dist/*.vstheme.
//   3. Compile each .vstheme → .pkgdef.
//   4. Stage the VSIX layout (manifest + Content_Types + LICENSE + pkgdef files).
//   5. Zip the staging dir → dist/<id>-<version>.vsix.
//
// Install: double-click the resulting .vsix. Theme appears under Tools → Theme.

import { readFile, writeFile, mkdir, rm, readdir, copyFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, basename } from "node:path";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..");

const PUBLISHER = "hector-jimenez";
// Stable per-extension GUID. NEVER change this — it's the extension's identity
// across all versions on a user's machine and on the Marketplace.
const EXT_GUID = "8c1f4d2e-3a5b-4c6d-9e7f-1b2a3c4d5e6f";
const IDENTITY_ID = `XboxThemes.${EXT_GUID}`;
const DISPLAY_NAME = "Xbox Themes";
const DESCRIPTION = "Six Xbox-inspired color themes for Visual Studio 2026 (and 2022 17.9+): Xbox Original, Xbox 360, Xbox One, Xbox Series X, plus High Contrast Dark and Light. Pick one from Tools \u2192 Theme.";
const MORE_INFO_URL = "https://github.com/hectorjjb/vs-xbox-theme";
// 8.3 short-name for the install folder under Common7\IDE\Extensions\.
// Must be unique per extension; derived deterministically from EXT_GUID.
const EXT_DIR_SHORTNAME = "xboxthme.001";

const VS_INSTALL_ROOTS = [
  "C:\\Program Files\\Microsoft Visual Studio\\18\\Insiders",
  "C:\\Program Files\\Microsoft Visual Studio\\18\\Preview",
  "C:\\Program Files\\Microsoft Visual Studio\\18\\Enterprise",
  "C:\\Program Files\\Microsoft Visual Studio\\18\\Professional",
  "C:\\Program Files\\Microsoft Visual Studio\\18\\Community",
  "C:\\Program Files\\Microsoft Visual Studio\\2022\\Enterprise",
  "C:\\Program Files\\Microsoft Visual Studio\\2022\\Professional",
  "C:\\Program Files\\Microsoft Visual Studio\\2022\\Community",
];

const COMPILER_REL = "VSSDK\\VisualStudioIntegration\\Tools\\Bin\\VsixColorCompiler.exe";

function findCompiler() {
  for (const root of VS_INSTALL_ROOTS) {
    const candidate = join(root, COMPILER_REL);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

async function readJson(p) {
  return JSON.parse(await readFile(p, "utf8"));
}

async function loadVersion() {
  return (await readJson(join(repo, "package.json"))).version;
}

async function listFlavors() {
  const dir = join(repo, "src", "flavors");
  const files = await readdir(dir);
  const out = [];
  for (const f of files.filter(f => f.endsWith(".json"))) {
    out.push(await readJson(join(dir, f)));
  }
  return out;
}

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: "inherit", ...opts });
  if (r.status !== 0) throw new Error(`Command failed: ${cmd} ${args.join(" ")} (exit ${r.status})`);
}

async function main() {
  const compiler = findCompiler();
  if (!compiler) {
    console.error(`
[error] VsixColorCompiler.exe was not found.

This tool ships with the "Visual Studio extension development" workload.
Install it via the Visual Studio Installer:

  1. Open "Visual Studio Installer".
  2. Click "Modify" on your VS 2026 (or 2022) install.
  3. Workloads tab → check "Visual Studio extension development".
  4. Click "Modify" to install.

Expected location after install:
${VS_INSTALL_ROOTS.map(r => "  " + join(r, COMPILER_REL)).join("\n")}
`);
    process.exit(2);
  }
  console.log(`✓ Found compiler: ${compiler}`);

  // 1. Regenerate .vstheme files
  console.log("→ Generating .vstheme files");
  run(process.execPath, [join(repo, "scripts", "build-vstheme.mjs")]);

  // 2. Compile each .vstheme → .pkgdef
  const flavors = await listFlavors();
  const version = await loadVersion();
  const dist = join(repo, "dist");
  const stage = join(dist, "vsix-stage");
  // Filename: clean publisher.name-version (no GUID). The GUID still lives
  // inside IDENTITY_ID for the manifest's <Identity Id>, where it provides
  // global uniqueness independent of publisher namespace.
  const vsixName = `${PUBLISHER}.XboxThemes-${version}.vsix`;
  const vsixPath = join(dist, vsixName);
  await rm(stage, { recursive: true, force: true });
  await mkdir(join(stage, "Themes"), { recursive: true });

  const assetLines = [];
  for (const flavor of flavors) {
    const xml = join(dist, `${flavor.id}.vstheme`);
    const pkgdef = join(stage, "Themes", `${flavor.id}.pkgdef`);
    if (!existsSync(xml)) throw new Error(`Missing: ${xml}. Run npm run build first.`);
    console.log(`→ Compiling ${basename(xml)} → ${basename(pkgdef)}`);
    run(compiler, [xml, pkgdef]);
    // VsixColorCompiler emits only the per-category color data; it does NOT
    // write the theme registration header (theme name + FallbackId). Without
    // that header VS displays the theme as a raw GUID and may fail to load
    // colors. Inject it manually — matches the format used by working themes
    // (e.g. MadsKristensen/BlueSteel).
    const existing = (await readFile(pkgdef, "utf8")).replace(/^\uFEFF/, "");
    const header = [
      `[$RootKey$\\Themes\\${flavor.guid.toLowerCase()}]`,
      `@="${flavor.name}"`,
      `"Name"="${flavor.name}"`,
      flavor.fallbackId ? `"FallbackId"="${flavor.fallbackId.toLowerCase()}"` : null,
      ``,
      ``
    ].filter(l => l !== null).join("\r\n");
    await writeFile(pkgdef, header + existing, "utf8");
    assetLines.push(`    <Asset Type="Microsoft.VisualStudio.VsPackage" Path="Themes/${flavor.id}.pkgdef" />`);
  }

  // 3. Render manifest
  const tpl = await readFile(join(repo, "src", "vsix", "extension.vsixmanifest.template"), "utf8");
  const manifest = tpl
    .replace(/{{IDENTITY_ID}}/g, IDENTITY_ID)
    .replace(/{{VERSION}}/g, version)
    .replace(/{{PUBLISHER}}/g, PUBLISHER)
    .replace(/{{DISPLAY_NAME}}/g, DISPLAY_NAME)
    .replace(/{{DESCRIPTION}}/g, DESCRIPTION)
    .replace(/{{MORE_INFO_URL}}/g, MORE_INFO_URL)
    .replace(/{{ASSETS}}/g, assetLines.join("\n"));
  await writeFile(join(stage, "extension.vsixmanifest"), manifest, "utf8");

  // 4. Copy [Content_Types].xml and LICENSE
  await copyFile(join(repo, "src", "vsix", "[Content_Types].xml"), join(stage, "[Content_Types].xml"));
  await copyFile(join(repo, "LICENSE"), join(stage, "LICENSE.txt"));

  // 4a. Copy marketing images referenced by the manifest (icon + preview only).
  // The 6 per-flavor screenshots in images/*.jpg are README-only and would
  // bloat the VSIX by ~2 MB without being displayed anywhere in the IDE.
  const imagesSrc = join(repo, "images");
  const imagesStage = join(stage, "images");
  const MANIFEST_IMAGES = ["icon.png", "preview.png"];
  if (existsSync(imagesSrc)) {
    await mkdir(imagesStage, { recursive: true });
    for (const f of MANIFEST_IMAGES) {
      const src = join(imagesSrc, f);
      if (existsSync(src)) await copyFile(src, join(imagesStage, f));
    }
  }

  // 4b. Generate manifest.json and catalog.json (required by VS 2026 installer).
  const stageFiles = [];
  async function collect(dir, prefix = "") {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const abs = join(dir, entry.name);
      const rel = prefix + entry.name;
      if (entry.isDirectory()) await collect(abs, rel + "/");
      else stageFiles.push("/" + rel.replace(/\\/g, "/"));
    }
  }
  await collect(stage);
  const extensionDir = `[installdir]\\Common7\\IDE\\Extensions\\${EXT_DIR_SHORTNAME}`;
  const manifestJson = {
    id: IDENTITY_ID,
    version,
    type: "Vsix",
    vsixId: IDENTITY_ID,
    extensionDir,
    files: stageFiles.filter(f => f !== "/manifest.json" && f !== "/catalog.json").map(fileName => ({ fileName, sha256: null })),
    installSizes: { targetDrive: 0 },
    dependencies: { "Microsoft.VisualStudio.Component.CoreEditor": "17.0" }
  };
  await writeFile(join(stage, "manifest.json"), JSON.stringify(manifestJson), "utf8");

  const catalogJson = {
    manifestVersion: "1.1",
    info: { id: `${IDENTITY_ID},version=${version}`, manifestType: "Extension" },
    packages: [
      {
        id: `Component.${IDENTITY_ID}`,
        version,
        type: "Component",
        extension: true,
        automaticallyAddedByExtensionPack: false,
        dependencies: { [IDENTITY_ID]: version, "Microsoft.VisualStudio.Component.CoreEditor": "17.0" },
        localizedResources: [{ language: "en-US", title: DISPLAY_NAME, description: DESCRIPTION }]
      },
      {
        id: IDENTITY_ID,
        version,
        type: "Vsix",
        payloads: [{ fileName: vsixName, size: 0 }],
        vsixId: IDENTITY_ID,
        extensionDir,
        installSizes: { targetDrive: 0 }
      }
    ]
  };
  await writeFile(join(stage, "catalog.json"), JSON.stringify(catalogJson), "utf8");

  // 5. Zip → .vsix. OPC packages REQUIRE forward-slash entry names; PowerShell's
  //    ZipFile.CreateFromDirectory on Windows writes backslashes, which makes
  //    VSIXInstaller reject the file as "not a valid VSIX package". Build the
  //    zip entry-by-entry with normalized paths instead.
  if (existsSync(vsixPath)) await rm(vsixPath);
  const ps = [
    `Add-Type -AssemblyName System.IO.Compression`,
    `Add-Type -AssemblyName System.IO.Compression.FileSystem`,
    `$stage = '${stage.replace(/'/g, "''")}'`,
    `$out = '${vsixPath.replace(/'/g, "''")}'`,
    `$zip = [System.IO.Compression.ZipFile]::Open($out, 'Create')`,
    `try {`,
    `  Get-ChildItem -Recurse -File -LiteralPath $stage | ForEach-Object {`,
    `    $rel = $_.FullName.Substring($stage.Length + 1) -replace '\\\\', '/'`,
    `    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $rel, 'Optimal') | Out-Null`,
    `  }`,
    `} finally { $zip.Dispose() }`
  ].join("; ");
  run("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps]);

  const st = await stat(vsixPath);
  console.log(`\n✓ ${vsixPath} (${(st.size / 1024).toFixed(1)} KB)`);
  console.log(`\nInstall: double-click the .vsix, restart VS, then Tools → Theme → Xbox Series X.`);
}

main().catch(e => { console.error(e); process.exit(1); });
