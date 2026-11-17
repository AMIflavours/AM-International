import { NextResponse } from "next/server";
import fs from "node:fs";
import { mkdir, rename, rm } from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { getSession } from "@/lib/auth";
import { UPLOADS_ENABLED, UPLOADS_OFF_MESSAGE } from "@/lib/uploadSwitch";
import { DRIVER, UPLOAD_DIR, isValidKey, limitForKey, typeForKey } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SECTIONS = ["insights", "content", "media", "events", "downloads"];

// Step 2 of an upload with the local driver. The browser sends the raw file here
// (PUT /api/admin/file?key=...). The file is streamed to disk, never held in memory,
// so large videos are fine. The key must be a name made by /api/admin/presign.
export async function PUT(request) {
  if (!UPLOADS_ENABLED) return NextResponse.json({ error: UPLOADS_OFF_MESSAGE }, { status: 403 });
  if (DRIVER !== "local") return NextResponse.json({ error: "Not available." }, { status: 404 });

  const session = await getSession(SECTIONS);
  if (!session) return NextResponse.json({ error: "Please log in again." }, { status: 401 });

  const key = new URL(request.url).searchParams.get("key");
  if (!isValidKey(key)) return NextResponse.json({ error: "Invalid file name." }, { status: 400 });

  const type = typeForKey(key);
  const contentType = String(request.headers.get("content-type") || "").split(";")[0].trim();
  if (contentType !== type) return NextResponse.json({ error: "File type does not match." }, { status: 400 });

  const limit = limitForKey(key);
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > limit) return NextResponse.json({ error: "File is too large." }, { status: 413 });
  if (!request.body) return NextResponse.json({ error: "No file received." }, { status: 400 });

  const target = path.join(UPLOAD_DIR, ...key.split("/"));
  const temp = `${target}.part`;
  let received = 0;

  try {
    await mkdir(path.dirname(target), { recursive: true });
    const limiter = new Transform({
      transform(chunk, _enc, cb) {
        received += chunk.length;
        if (received > limit) cb(new Error("LIMIT"));
        else cb(null, chunk);
      },
    });
    await pipeline(Readable.fromWeb(request.body), limiter, fs.createWriteStream(temp));
    if (received === 0) throw new Error("EMPTY");
    await rename(temp, target);
    return NextResponse.json({ ok: true });
  } catch (error) {
    await rm(temp, { force: true }).catch(() => {});
    if (error?.message === "LIMIT") return NextResponse.json({ error: "File is too large." }, { status: 413 });
    if (error?.message === "EMPTY") return NextResponse.json({ error: "The file is empty." }, { status: 400 });
    console.error("[upload-file]", error);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
