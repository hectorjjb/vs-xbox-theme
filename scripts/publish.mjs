#!/usr/bin/env node
// Publishes the most recently built VSIX to the Visual Studio Marketplace
// using VsixPublisher.exe. The PAT must be in $env:VS_MARKETPLACE_PAT.
// See docs/PUBLISHING.md for the one-time setup.

import { existsSync, statSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repo = dirname(dirname(fileURLToPath(import.meta.url)));

// Same search list as build-vsix.mjs — keep in sync.
const PUBLISHER_CANDIDATES = [
  "C:\\Program Files\\Microsoft Visual Studio\\18\\Insiders",
  "C:\\Program Files\\Microsoft Visual Studio\\18\\Preview",
  "C:\\Program Files\\Microsoft Visual Studio\\18\\Enterprise",
  "C:\\Program Files\\Microsoft Visual Studio\\18\\Professional",
  "C:\\Program Files\\Microsoft Visual Studio\\18\\Community",
  "C:\\Program Files\\Microsoft Visual Studio\\2022\\Enterprise",
  "C:\\Program Files\\Microsoft Visual Studio\\2022\\Professional",
  "C:\\Program Files\\Microsoft Visual Studio\\2022\\Community"
];

function findPublisher() {
  for (const root of PUBLISHER_CANDIDATES) {
    const exe = join(root, "VSSDK", "VisualStudioIntegration", "Tools", "Bin", "VsixPublisher.exe");
    if (existsSync(exe)) return exe;
  }
  throw new Error("VsixPublisher.exe not found. Install the 'Visual Studio extension development' workload.");
}

async function findLatestVsix() {
  const dist = join(repo, "dist");
  if (!existsSync(dist)) throw new Error("dist/ not found. Run `npm run package` first.");
  const vsixes = (await readdir(dist))
    .filter(f => f.endsWith(".vsix"))
    .map(f => ({ name: f, path: join(dist, f), mtime: statSync(join(dist, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  if (vsixes.length === 0) throw new Error("No .vsix in dist/. Run `npm run package` first.");
  return vsixes[0].path;
}

async function main() {
  const pat = process.env.VS_MARKETPLACE_PAT;
  if (!pat) {
    console.error("ERROR: $env:VS_MARKETPLACE_PAT not set. See docs/PUBLISHING.md (one-time setup step 2).");
    process.exit(1);
  }

  const publisher = findPublisher();
  console.log(`✓ Found publisher: ${publisher}`);

  const vsix = await findLatestVsix();
  console.log(`✓ Publishing: ${vsix}`);

  const manifest = join(repo, "publish", "publish-manifest.json");
  if (!existsSync(manifest)) throw new Error(`Missing: ${manifest}`);

  // Read & validate publish manifest references exist.
  const m = JSON.parse(await readFile(manifest, "utf8"));
  const overview = join(repo, "publish", m.overview ?? "overview.md");
  if (!existsSync(overview)) throw new Error(`overview file missing: ${overview}`);

  console.log(`→ Calling VsixPublisher.exe publish ...`);
  const r = spawnSync(publisher, [
    "publish",
    "-payload", vsix,
    "-publishManifest", manifest,
    "-personalAccessToken", pat,
    "-ignoreWarnings", "VSIXValidatorWarning01,VSIXValidatorWarning02"
  ], { stdio: "inherit" });

  if (r.status !== 0) {
    console.error(`VsixPublisher exited with code ${r.status}`);
    process.exit(r.status ?? 1);
  }
  console.log(`✓ Published.`);
  console.log(`Marketplace: https://marketplace.visualstudio.com/items?itemName=${m.publisher}.${m.identity.internalName}`);
}

main().catch(e => { console.error(e.message ?? e); process.exit(1); });
