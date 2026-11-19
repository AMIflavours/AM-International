// Moves the pictures, videos and PDFs that ship inside the website (public folder) into Vercel Blob,
// and points the admin settings (Images and links) at the new copies. After this, every one of them can be
// replaced from the admin. The files in public/ are not touched or deleted.
//
//   .env.local must have DATABASE_URL and BLOB_READ_WRITE_TOKEN of the NEW account.
//
//   node scripts/upload-site-files.mjs            -> dry run: lists what would be uploaded
//   node scripts/upload-site-files.mjs --apply    -> uploads the files and saves the new links
//
// Safe to run again: it only touches settings that still point at the website files.
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { put } from "@vercel/blob";
import fs from "node:fs";
import path from "node:path";
import { MEDIA_DEFAULTS, mergeMedia, sanitizeMedia } from "../lib/mediaShared.js";

config({ path: ".env.local" });
const APPLY = process.argv.includes("--apply");
const DB = process.env.DATABASE_URL;
if (!DB || (APPLY && !process.env.BLOB_READ_WRITE_TOKEN)) {
  console.error("Put DATABASE_URL" + (APPLY ? " and BLOB_READ_WRITE_TOKEN" : "") + " in .env.local first.");
  process.exit(1);
}
if (APPLY && !/^vercel_blob_rw_[^_\s]+_\S+$/.test(process.env.BLOB_READ_WRITE_TOKEN.trim())) {
  console.error("The BLOB_READ_WRITE_TOKEN in .env.local does not look right.");
  console.error("It must be one line like  BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxx_xxxxxxxx  (copy it again from the Blob store page in Vercel, .env.local tab, Show secret).");
  process.exit(1);
}
const sql = neon(DB);
const PUBLIC = path.join(process.cwd(), "public");

const MIME = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif", pdf: "application/pdf", mp4: "video/mp4", webm: "video/webm" };

const rows = await sql.query("select value from site_content where key = 'media'");
const stored = rows[0]?.value || {};
const media = mergeMedia(stored);

// Every text value in the settings that is a website file path (starts with / and exists in public/).
const found = new Map(); // path -> true
function walk(node) {
  if (typeof node === "string") {
    if (node.startsWith("/") && /\.(jpe?g|png|webp|avif|pdf|mp4|webm)$/i.test(node) && fs.existsSync(path.join(PUBLIC, node))) found.set(node, true);
  } else if (Array.isArray(node)) node.forEach(walk);
  else if (node && typeof node === "object") Object.values(node).forEach(walk);
}
walk(media);

console.log(`Website files used by the settings: ${found.size}`);
let bytes = 0;
for (const f of found.keys()) bytes += fs.statSync(path.join(PUBLIC, f)).size;
console.log(`Total size: ${(bytes / 1024 / 1024).toFixed(1)} MB`);

if (!APPLY) {
  for (const f of found.keys()) console.log("  -", f);
  console.log("\nDry run only. Nothing changed. Run again with --apply.");
  process.exit(0);
}

const map = new Map();
let n = 0;
let failed = 0;
for (const f of found.keys()) {
  n++;
  const abs = path.join(PUBLIC, f);
  try {
    const ext = f.slice(f.lastIndexOf(".") + 1).toLowerCase();
    const out = await put(`site${f}`, fs.readFileSync(abs), { access: "public", addRandomSuffix: false, allowOverwrite: true, contentType: MIME[ext] });
    map.set(f, out.url);
    console.log(`[${n}/${found.size}] ok   ${f}`);
  } catch (e) {
    failed++;
    console.log(`[${n}/${found.size}] FAIL ${f}: ${e.message}`);
  }
}

function swap(node) {
  if (typeof node === "string") return map.get(node) || node;
  if (Array.isArray(node)) return node.map(swap);
  if (node && typeof node === "object") return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, swap(v)]));
  return node;
}

if (map.size === 0) {
  console.log("\nNothing was uploaded, so nothing was saved. Fix the errors above and run again.");
  process.exit(1);
}
const next = sanitizeMedia(swap(media));
await sql.query(
  "insert into site_content (key, value, updated_at) values ('media', $1::jsonb, now()) on conflict (key) do update set value = excluded.value, updated_at = now()",
  [JSON.stringify(next)]
);
console.log(`\nUploaded ${map.size} of ${found.size} files and saved the settings.${failed ? ` ${failed} failed: run again to retry them.` : ""}`);
console.log("Redeploy the site on Vercel (or save once in the admin) so pages refresh.");
