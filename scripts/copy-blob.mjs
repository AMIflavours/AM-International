// Moves every uploaded file the website uses into the Vercel Blob store of the CURRENT project,
// and switches the links in the database to the new copies. Nothing is deleted from the old stores.
//
//   .env.local must have:
//     DATABASE_URL=...            (the database of the new account)
//     BLOB_READ_WRITE_TOKEN=...   (the Blob store of the new Vercel project)
//
//   node scripts/copy-blob.mjs            -> dry run: lists the files and where they are now
//   node scripts/copy-blob.mjs --apply    -> copies the files, then updates the database links
//
// Safe to run again: files already in the new store are skipped.
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { put } from "@vercel/blob";

config({ path: ".env.local" });
const APPLY = process.argv.includes("--apply");
const DB = process.env.DATABASE_URL;
const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
if (!DB || !TOKEN) {
  console.log("Put DATABASE_URL and BLOB_READ_WRITE_TOKEN in .env.local first.");
  process.exit(1);
}

// vercel_blob_rw_<storeId>_<secret>  ->  <storeid>.public.blob.vercel-storage.com
const TOKEN_OK = /^vercel_blob_rw_[^_\s]+_\S+$/.test(TOKEN.trim());
const storeId = TOKEN_OK ? TOKEN.trim().split("_")[3] : "";
const OWN_HOST = `${storeId.toLowerCase()}.public.blob.vercel-storage.com`;
const BLOB_RE = /^https:\/\/([a-z0-9]+)\.public\.blob\.vercel-storage\.com\/(.+)$/i;
const sql = neon(DB);

const isForeign = (v) => {
  const m = typeof v === "string" ? BLOB_RE.exec(v) : null;
  return Boolean(m) && m[1].toLowerCase() !== storeId.toLowerCase();
};

function collect(node, set) {
  if (typeof node === "string") {
    if (isForeign(node)) set.add(node);
  } else if (Array.isArray(node)) node.forEach((v) => collect(v, set));
  else if (node && typeof node === "object") Object.values(node).forEach((v) => collect(v, set));
}

function swap(node, map) {
  if (typeof node === "string") return map.get(node) || node;
  if (Array.isArray(node)) return node.map((v) => swap(v, map));
  if (node && typeof node === "object") return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, swap(v, map)]));
  return node;
}

async function main() {
  console.log("copy-blob started.");
  if (!TOKEN_OK) {
    console.log("The BLOB_READ_WRITE_TOKEN in .env.local does not look right.");
    console.log("It must be one line starting with vercel_blob_rw_ (copy it again from the Blob store page in Vercel, .env.local tab, Show secret).");
    process.exitCode = 1;
    return;
  }
  console.log(`Token found. New store: ${OWN_HOST}`);
  console.log("Reading the database...");
  const content = await sql.query("select key, value from site_content");
  const posts = await sql.query("select id, image_url, data from posts");
  const events = await sql.query("select id, image_url, data from events");

  const urls = new Set();
  for (const r of content) collect(r.value, urls);
  for (const r of [...posts, ...events]) {
    collect(r.data, urls);
    if (isForeign(r.image_url)) urls.add(r.image_url);
  }

  const byHost = {};
  for (const u of urls) {
    const h = BLOB_RE.exec(u)[1];
    byHost[h] = (byHost[h] || 0) + 1;
  }
  console.log(`New store: ${OWN_HOST}`);
  console.log(`Files still on another store: ${urls.size}`);
  for (const [h, n] of Object.entries(byHost)) console.log(`  ${h}.public.blob.vercel-storage.com : ${n}`);

  if (!APPLY) {
    for (const u of urls) console.log("  -", decodeURIComponent(BLOB_RE.exec(u)[2]));
    console.log("\nDry run only. Nothing changed. Run again with --apply to copy.");
    return;
  }

  const map = new Map();
  let failed = 0;
  let n = 0;
  for (const url of urls) {
    n++;
    const pathname = decodeURIComponent(BLOB_RE.exec(url)[2].split("?")[0]);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buffer = Buffer.from(await res.arrayBuffer());
      const contentType = res.headers.get("content-type") || undefined;
      const out = await put(pathname, buffer, { access: "public", addRandomSuffix: false, allowOverwrite: true, contentType });
      map.set(url, out.url);
      console.log(`[${n}/${urls.size}] ok   ${pathname} (${(buffer.length / 1024).toFixed(0)} KB)`);
    } catch (e) {
      failed++;
      console.log(`[${n}/${urls.size}] FAIL ${pathname}: ${e.message}`);
    }
  }

  let changed = 0;
  for (const r of content) {
    const next = swap(r.value, map);
    if (JSON.stringify(next) !== JSON.stringify(r.value)) {
      await sql.query("update site_content set value = $1::jsonb where key = $2", [JSON.stringify(next), r.key]);
      changed++;
    }
  }
  for (const [table, rows] of [["posts", posts], ["events", events]]) {
    for (const r of rows) {
      const data = swap(r.data, map);
      const image = map.get(r.image_url) || r.image_url;
      if (image !== r.image_url || JSON.stringify(data) !== JSON.stringify(r.data)) {
        await sql.query(`update ${table} set image_url = $1, data = $2::jsonb where id = $3`, [image, JSON.stringify(data), r.id]);
        changed++;
      }
    }
  }
  console.log(`\nCopied ${map.size} of ${urls.size} files. Database rows updated: ${changed}.`);
  if (failed) console.log(`${failed} file(s) failed. Run the command again to retry them. Their old links stay as they are.`);

}

try {
  await main();
} catch (e) {
  console.log("ERROR: " + (e?.message || e));
  process.exitCode = 1;
}
