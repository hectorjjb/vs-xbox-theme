#!/usr/bin/env node
// Generates Visual Studio .vstheme XML files from src/palette.json + src/mapping/vs-key-map.json.
// Output: dist/<flavor>.vstheme
//
// Import into Visual Studio:
//   1. Install "Color Theme Editor for Visual Studio" from the Marketplace.
//   2. Tools → Customize Colors → Import Theme... → pick dist/<flavor>.vstheme
//   3. Apply via Tools → Options → Environment → General → Color Theme.

import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..");

// Category GUIDs are read from the "_guid" field on each category in vs-key-map.json
// to keep mapping data and schema constants together. See VS 2026 modernized theme docs.

const HEX = /^#?([0-9a-f]{6})([0-9a-f]{2})?$/i;

function toARGB(hex) {
  const m = HEX.exec(hex.trim());
  if (!m) throw new Error(`Bad hex: ${hex}`);
  const rgb = m[1].toUpperCase();
  const alpha = (m[2] ?? "FF").toUpperCase();
  return alpha + rgb;
}

function resolveRole(token, palette) {
  if (!token) return null;
  // Optional alpha suffix: "$green:e5" or "#ffffff:10" overrides the alpha byte.
  let alphaOverride = null;
  const colon = token.indexOf(":");
  if (colon !== -1) {
    alphaOverride = token.slice(colon + 1).toLowerCase();
    if (!/^[0-9a-f]{2}$/.test(alphaOverride)) throw new Error(`Bad alpha suffix: ${token}`);
    token = token.slice(0, colon);
  }
  let argb;
  if (token.startsWith("$")) {
    const role = token.slice(1);
    const value = palette[role];
    if (!value) throw new Error(`Undefined palette role: $${role}`);
    argb = toARGB(value);
  } else {
    argb = toARGB(token);
  }
  if (alphaOverride) argb = alphaOverride.toUpperCase() + argb.slice(2);
  return argb;
}

function xmlEscape(s) {
  return s.replace(/[<>&"']/g, c => ({ "<":"&lt;",">":"&gt;","&":"&amp;","\"":"&quot;","'":"&apos;" }[c]));
}

function buildThemeXml(flavor, map, palette) {
  const cats = [];
  for (const [catName, entries] of Object.entries(map)) {
    if (catName.startsWith("_")) continue;
    const catGuid = entries._guid;
    if (!catGuid) throw new Error(`Category "${catName}" missing "_guid" in vs-key-map.json`);
    const colors = [];
    for (const [colorName, def] of Object.entries(entries)) {
      if (colorName.startsWith("_")) continue;
      const bg = resolveRole(def.background, palette);
      const fg = resolveRole(def.foreground, palette);
      const parts = [];
      parts.push(`      <Color Name="${xmlEscape(colorName)}">`);
      if (bg) parts.push(`        <Background Type="CT_RAW" Source="${bg}" />`);
      if (fg) parts.push(`        <Foreground Type="CT_RAW" Source="${fg}" />`);
      parts.push(`      </Color>`);
      colors.push(parts.join("\n"));
    }
    cats.push(
      `    <Category Name="${xmlEscape(catName)}" GUID="${catGuid}">\n` +
      colors.join("\n") +
      `\n    </Category>`
    );
  }
  const fallback = flavor.fallbackId ? ` FallbackId="${flavor.fallbackId}"` : "";
  return [
    `<?xml version="1.0" encoding="utf-8"?>`,
    `<Themes>`,
    `  <Theme Name="${xmlEscape(flavor.name)}" GUID="${flavor.guid}"${fallback}>`,
    cats.join("\n"),
    `  </Theme>`,
    `</Themes>`,
    ``
  ].join("\n");
}

async function loadFlavor(name) {
  const path = join(repo, "src", "flavors", `${name}.json`);
  return JSON.parse(await readFile(path, "utf8"));
}

// Build the per-flavor palette by merging flavor-local roles (extraRoles)
// over the canonical palette[paletteKey]. Lets a flavor declare values the
// shared palette doesn't carry, e.g. accentFg (text drawn on accent surfaces,
// where readable contrast depends on whether the flavor's green is bright or dark).
function buildPalette(flavor, palette) {
  const base = palette[flavor.paletteKey];
  if (!base) throw new Error(`Palette key not found: ${flavor.paletteKey}`);
  return { ...base, ...(flavor.extraRoles || {}) };
}

async function main() {
  const requested = process.argv[2];
  const palette = JSON.parse(await readFile(join(repo, "src", "palette.json"), "utf8"));
  const map = JSON.parse(await readFile(join(repo, "src", "mapping", "vs-key-map.json"), "utf8"));
  await mkdir(join(repo, "dist"), { recursive: true });

  const flavorNames = requested
    ? [requested === "seriesX" ? "series-x" : requested]
    : (await readdir(join(repo, "src", "flavors"))).filter(f => f.endsWith(".json")).map(f => f.replace(/\.json$/, ""));

  for (const name of flavorNames) {
    const flavor = await loadFlavor(name);
    const pal = buildPalette(flavor, palette);
    const xml = buildThemeXml(flavor, map, pal);
    const out = join(repo, "dist", `${flavor.id}.vstheme`);
    await writeFile(out, xml, "utf8");
    console.log(`✓ ${out}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
