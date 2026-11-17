import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { getSession } from "@/lib/auth";
import siteMedia from "@/lib/siteMedia.generated.json";
import { revalidatePath } from "next/cache";
import { clearUsage } from "@/lib/mediaUsage";
import { DRIVER, UPLOAD_DIR, displayName, isValidKey, kindOfName, publicUrlFor } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SECTIONS = ["insights", "content", "media", "events", "downloads"];
const PAGE = 48;

// Lists the files that were uploaded from the admin (newest first) for the Media Library.
//   GET /api/admin/media?kind=image|pdf|video|all&q=search&cursor=...
// Returns { items: [{ url, name, kind, size, uploadedAt }], cursor, hasMore }
export async function GET(request) {
  const session = await getSession(SECTIONS);
  if (!session) return NextResponse.json({ error: "Please log in again." }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const kind = ["image", "pdf", "video"].includes(params.get("kind")) ? params.get("kind") : "all";
  const q = String(params.get("q") || "").trim().toLowerCase().slice(0, 80);
  const cursor = params.get("cursor") || "";
  const keep = (item) => item.kind && (kind === "all" || item.kind === kind) && (!q || item.name.toLowerCase().includes(q));

  // Files that are part of the website code (public folder). Small list, so no paging.
  if (params.get("source") === "site") {
    const items = siteMedia
      .map((f) => ({ url: encodeURI(`/${f.path}`), name: f.name, kind: f.kind, size: f.size, uploadedAt: f.date, source: "site" }))
      .filter(keep);
    return NextResponse.json({ items, cursor: "", hasMore: false });
  }

  try {
    if (DRIVER === "blob") return NextResponse.json(await listBlob({ cursor, keep }));
    if (DRIVER === "r2") return NextResponse.json(await listR2({ cursor, keep }));
    return NextResponse.json(await listLocal({ cursor, keep }));
  } catch (error) {
    console.error("[media-list]", error);
    return NextResponse.json({ error: "Could not load the files. Please try again." }, { status: 500 });
  }
}

async function listBlob({ cursor, keep }) {
  const { list } = await import("@vercel/blob");
  const items = [];
  let next = cursor || undefined;
  let hasMore = false;
  // Pull pages until we have enough matching files (filters are applied here).
  for (let round = 0; round < 6 && items.length < PAGE; round++) {
    const res = await list({ limit: 200, cursor: next });
    for (const b of res.blobs) {
      const item = {
        url: b.url,
        name: displayName(b.pathname),
        kind: kindOfName(b.pathname),
        size: b.size,
        uploadedAt: new Date(b.uploadedAt).toISOString(),
      };
      if (keep(item)) items.push(item);
    }
    hasMore = Boolean(res.hasMore);
    next = res.cursor;
    if (!hasMore) break;
  }
  items.sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1));
  return { items, cursor: hasMore ? next : "", hasMore };
}

function walk(dir, out = []) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

async function listLocal({ cursor, keep }) {
  const offset = Math.max(0, Number(cursor) || 0);
  const all = [];
  for (const file of walk(UPLOAD_DIR)) {
    const key = path.relative(UPLOAD_DIR, file).split(path.sep).join("/");
    if (!isValidKey(key)) continue;
    const st = fs.statSync(file);
    const item = { url: publicUrlFor(key), name: displayName(key), kind: kindOfName(key), size: st.size, uploadedAt: st.mtime.toISOString() };
    if (keep(item)) all.push(item);
  }
  all.sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1));
  const items = all.slice(offset, offset + PAGE);
  const hasMore = offset + PAGE < all.length;
  return { items, cursor: hasMore ? String(offset + PAGE) : "", hasMore };
}

async function listR2({ cursor, keep }) {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) throw new Error("R2 settings missing");
  const { S3Client, ListObjectsV2Command } = await import("@aws-sdk/client-s3");
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });
  const offset = Math.max(0, Number(cursor) || 0);
  const all = [];
  let token;
  do {
    const res = await s3.send(new ListObjectsV2Command({ Bucket: R2_BUCKET, ContinuationToken: token, MaxKeys: 1000 }));
    for (const o of res.Contents || []) {
      if (!isValidKey(o.Key)) continue;
      const item = { url: publicUrlFor(o.Key), name: displayName(o.Key), kind: kindOfName(o.Key), size: o.Size, uploadedAt: new Date(o.LastModified).toISOString() };
      if (keep(item)) all.push(item);
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token && all.length < 5000);
  all.sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1));
  const items = all.slice(offset, offset + PAGE);
  const hasMore = offset + PAGE < all.length;
  return { items, cursor: hasMore ? String(offset + PAGE) : "", hasMore };
}

// Deletes one uploaded file from storage for good. Files that are part of the website code cannot be deleted here.
//   DELETE /api/admin/media   body: { url }
export async function DELETE(request) {
  const session = await getSession(SECTIONS);
  if (!session) return NextResponse.json({ error: "Please log in again." }, { status: 401 });

  let url = "";
  try {
    url = String((await request.json())?.url || "");
  } catch {}
  if (!url) return NextResponse.json({ error: "No file given." }, { status: 400 });

  try {
    if (DRIVER === "blob") {
      const u = new URL(url);
      const key = decodeURIComponent(u.pathname.replace(/^\/+/, ""));
      // Any picture, PDF or video in our own Blob store (admin uploads live under uploads/).
      if (!u.hostname.endsWith(".public.blob.vercel-storage.com") || !kindOfName(key)) {
        return NextResponse.json({ error: "This file cannot be deleted here." }, { status: 400 });
      }
      const { del } = await import("@vercel/blob");
      await del(url);
    } else if (DRIVER === "r2") {
      const base = publicUrlFor("");
      const key = url.startsWith(base) ? decodeURIComponent(url.slice(base.length)) : "";
      if (!isValidKey(key)) return NextResponse.json({ error: "This file cannot be deleted here." }, { status: 400 });
      const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
      const { S3Client, DeleteObjectCommand } = await import("@aws-sdk/client-s3");
      const s3 = new S3Client({
        region: "auto",
        endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
      });
      await s3.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    } else {
      const key = url.startsWith("/media/") ? decodeURIComponent(url.slice("/media/".length)) : "";
      if (!isValidKey(key)) return NextResponse.json({ error: "This file cannot be deleted here." }, { status: 400 });
      const full = path.join(UPLOAD_DIR, key);
      if (path.relative(UPLOAD_DIR, full).startsWith("..")) return NextResponse.json({ error: "Not allowed." }, { status: 400 });
      fs.rmSync(full, { force: true });
    }
    // Take the file off the website too, wherever a page used it.
    let cleared = 0;
    try {
      cleared = await clearUsage(url);
      if (cleared) revalidatePath("/", "layout");
    } catch (error) {
      console.error("[media-clear-usage]", error);
    }
    return NextResponse.json({ ok: true, cleared });
  } catch (error) {
    console.error("[media-delete]", error);
    return NextResponse.json({ error: "Could not delete the file. Please try again." }, { status: 500 });
  }
}
