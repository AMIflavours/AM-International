import { NextResponse } from "next/server";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getSession } from "@/lib/auth";
import { DRIVER, UPLOAD_DIR, MIME_BY_EXT, isValidKey, kindOfName, publicUrlFor } from "@/lib/storage";
import { compressImage, compressPdf, compressVideoFile } from "@/lib/compressCore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const SECTIONS = ["insights", "content", "media", "events", "downloads"];
const MIN_SAVING = 0.08; // keep the original unless the new file is at least 8% smaller (stops repeated lossy re-encoding)

// Works out where an uploaded file lives, from its public link.
function locate(url) {
  if (DRIVER === "blob") {
    const u = new URL(url);
    const pathname = decodeURIComponent(u.pathname.replace(/^\/+/, ""));
    if (!u.hostname.endsWith(".public.blob.vercel-storage.com") || !kindOfName(pathname)) return null;
    return { pathname, ext: ext(pathname) };
  }
  if (DRIVER === "r2") {
    const base = publicUrlFor("");
    const key = url.startsWith(base) ? decodeURIComponent(url.slice(base.length)) : "";
    return isValidKey(key) ? { key, ext: ext(key) } : null;
  }
  const key = url.startsWith("/media/") ? decodeURIComponent(url.slice("/media/".length)) : "";
  if (!isValidKey(key)) return null;
  const file = path.join(UPLOAD_DIR, key);
  if (path.relative(UPLOAD_DIR, file).startsWith("..")) return null;
  return { key, file, ext: ext(key) };
}

function ext(name) {
  const e = name.slice(name.lastIndexOf(".") + 1).toLowerCase();
  return e === "jpeg" ? "jpg" : e;
}

async function readBytes(where, url) {
  if (where.file) return fs.readFileSync(/*turbopackIgnore: true*/ where.file);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Could not read the file.");
  return Buffer.from(await res.arrayBuffer());
}

// Writes the smaller file over the old one, under the same name, so every page keeps working.
async function writeBytes(where, buffer) {
  const contentType = MIME_BY_EXT[where.ext];
  if (where.file) {
    const tmp = `${where.file}.tmp-${process.pid}`;
    fs.writeFileSync(/*turbopackIgnore: true*/ tmp, buffer);
    fs.renameSync(/*turbopackIgnore: true*/ tmp, /*turbopackIgnore: true*/ where.file);
  } else if (DRIVER === "blob") {
    const { put } = await import("@vercel/blob");
    await put(where.pathname, buffer, { access: "public", allowOverwrite: true, addRandomSuffix: false, contentType, cacheControlMaxAge: 60 });
  } else {
    const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const s3 = new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
    });
    await s3.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: where.key, Body: buffer, ContentType: contentType }));
  }
}

// Makes one uploaded file smaller (same name, same link, same look).
//   POST /api/admin/compress   body: { url }
// Returns { ok, before, after, saved, changed, message }
export async function POST(request) {
  const session = await getSession(SECTIONS);
  if (!session) return NextResponse.json({ ok: false, error: "Please log in again." }, { status: 401 });

  let url = "";
  try {
    url = String((await request.json())?.url || "");
  } catch {}
  const where = url ? (() => { try { return locate(url); } catch { return null; } })() : null;
  if (!where) return NextResponse.json({ ok: false, error: "This file cannot be compressed here." }, { status: 400 });

  const kind = kindOfName(where.ext ? `x.${where.ext}` : "");
  let tmpDir = "";
  try {
    let before;
    let output;

    if (kind === "video") {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vid-"));
      const input = where.file || path.join(tmpDir, `in.${where.ext}`);
      if (!where.file) fs.writeFileSync(/*turbopackIgnore: true*/ input, await readBytes(where, url));
      before = fs.statSync(/*turbopackIgnore: true*/ input).size;
      const out = path.join(tmpDir, `out.${where.ext}`);
      await compressVideoFile(input, out, where.ext);
      output = fs.readFileSync(/*turbopackIgnore: true*/ out);
    } else {
      const buffer = await readBytes(where, url);
      before = buffer.length;
      output = kind === "pdf" ? await compressPdf(buffer) : await compressImage(buffer, where.ext);
    }

    const after = output.length;
    if (after > before * (1 - MIN_SAVING)) {
      return NextResponse.json({ ok: true, changed: false, before, after: before, saved: 0, message: "Already well optimised. Nothing to save." });
    }
    await writeBytes(where, output);
    return NextResponse.json({ ok: true, changed: true, before, after, saved: before - after, message: "Compressed." });
  } catch (error) {
    if (error?.message === "NO_FFMPEG") {
      return NextResponse.json({ ok: false, error: "Video compression needs ffmpeg on the server. It works once the site runs on the VPS (the setup script installs it)." }, { status: 422 });
    }
    console.error("[media-compress]", error);
    return NextResponse.json({ ok: false, error: error?.message && /too big/.test(error.message) ? error.message : "Could not compress this file." }, { status: 500 });
  } finally {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}
