#!/usr/bin/env node
// Decodes a VS pkgdef theme file into a JSON {category: {token: {bg, fg}}} map.
// Use to inspect built-in themes (Theme.Dark, Theme.Light, Theme.Bubblegum, etc.)
// for reference when expanding src/mapping/vs-key-map.json.
//
// Usage: node scripts/decode-pkgdef.mjs <path-to-pkgdef> [category-filter]

import { readFile } from "node:fs/promises";

// Reverse the category GUID we encounter to a human-readable name.
const KNOWN_CATEGORIES = {
  "73708ded-2d56-4aad-b8eb-73b20d3f4bff": "Shell",
  "5af241b7-5627-4d12-bfb1-2b67d11127d7": "ShellInternal",
  "75a05685-00a8-4ded-bae5-e7a50bfa929a": "Text Editor Text Manager Items",
  "624ed9c3-bdfd-41fa-96c3-7c824ea32e3d": "Environment",
};

function guidFromBytes(b) {
  // GUID stored as: Data1 (4 LE) + Data2 (2 LE) + Data3 (2 LE) + Data4 (8 BE).
  const d1 = (b[3] << 24 | b[2] << 16 | b[1] << 8 | b[0]) >>> 0;
  const d2 = (b[5] << 8 | b[4]) >>> 0;
  const d3 = (b[7] << 8 | b[6]) >>> 0;
  const tail = [...b.slice(8, 16)].map(x => x.toString(16).padStart(2, "0")).join("");
  const hex = (n, w) => n.toString(16).padStart(w, "0");
  return `${hex(d1, 8)}-${hex(d2, 4)}-${hex(d3, 4)}-${tail.slice(0, 4)}-${tail.slice(4)}`;
}

function parseBlock(buf) {
  // Header: 12 bytes (size + flags), then GUID (16), then color count (4 LE).
  const guid = guidFromBytes(buf.subarray(12, 28));
  const count = buf.readUInt32LE(28);
  let off = 32;
  const colors = {};
  for (let i = 0; i < count; i++) {
    const nameLen = buf.readUInt32LE(off); off += 4;
    const name = buf.subarray(off, off + nameLen).toString("utf8"); off += nameLen;
    const bgFlag = buf[off++]; let bg = null;
    if (bgFlag === 0x01) { bg = [buf[off], buf[off+1], buf[off+2], buf[off+3]]; off += 4; }
    const fgFlag = buf[off++]; let fg = null;
    if (fgFlag === 0x01) { fg = [buf[off], buf[off+1], buf[off+2], buf[off+3]]; off += 4; }
    const toArgb = c => c ? "#" + c.slice(0, 3).map(x => x.toString(16).padStart(2, "0")).join("") + c[3].toString(16).padStart(2, "0") : null;
    colors[name] = { bg: toArgb(bg), fg: toArgb(fg) };
  }
  return { guid, count, colors };
}

async function main() {
  const path = process.argv[2];
  const filter = process.argv[3];
  if (!path) { console.error("Usage: decode-pkgdef.mjs <path> [category-filter]"); process.exit(1); }

  const text = await readFile(path, "utf8");
  // Match: [$RootKey$\Themes\{guid}\<Category>]\r\n"Data"=hex:<bytes>
  const re = /\[\$RootKey\$\\Themes\\\{[^}]+\}\\([^\]]+)\][\s\S]*?"Data"=hex:([0-9a-f,\s]+)/gi;
  const out = {};
  let m;
  while ((m = re.exec(text)) !== null) {
    const cat = m[1];
    if (filter && !cat.toLowerCase().includes(filter.toLowerCase())) continue;
    const hex = m[2].replace(/[\s,]/g, "");
    const buf = Buffer.from(hex, "hex");
    const parsed = parseBlock(buf);
    const knownName = KNOWN_CATEGORIES[parsed.guid] || `?${parsed.guid}`;
    out[cat] = { categoryGuid: parsed.guid, categoryName: knownName, colorCount: parsed.count, colors: parsed.colors };
  }
  console.log(JSON.stringify(out, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
