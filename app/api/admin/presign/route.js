import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { UPLOADS_ENABLED, UPLOADS_OFF_MESSAGE } from "@/lib/uploadSwitch";
import { DRIVER, LIMITS, TYPES, newKey, publicUrlFor } from "@/lib/storage";

export const dynamic = "force-dynamic";

const SECTIONS = ["insights", "content", "media", "events", "downloads"];

// Step 1 of every admin upload. The browser says what it wants to upload (type and size),
// this route checks the user and the file rules, makes a new random file name, and tells the
// browser where to send the file:
//   blob driver:  browser upload straight to Vercel Blob (see /api/admin/blob-token)
//   local driver: PUT to /api/admin/file (saved on this server's disk)
//   r2 driver:    PUT straight to a short lived signed link for the R2 bucket
export async function POST(request) {
  if (!UPLOADS_ENABLED) return NextResponse.json({ error: UPLOADS_OFF_MESSAGE }, { status: 403 });
  const session = await getSession(SECTIONS);
  if (!session) return NextResponse.json({ error: "Please log in again." }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const type = String(body?.type || "");
  const size = Number(body?.size || 0);
  const info = TYPES[type];
  if (!info) {
    return NextResponse.json({ error: "Allowed files: JPG, PNG, WebP, AVIF images, PDF documents and MP4 or WebM videos." }, { status: 400 });
  }
  const limit = LIMITS[info.kind];
  if (!(size > 0)) return NextResponse.json({ error: "The file is empty." }, { status: 400 });
  if (size > limit) {
    return NextResponse.json({ error: `This ${info.kind} is larger than ${Math.round(limit / 1024 / 1024)} MB.` }, { status: 400 });
  }

  if (DRIVER === "local" && process.env.VERCEL) {
    return NextResponse.json({ error: "Uploads work only on the live server, not on this preview site." }, { status: 503 });
  }

  const key = newKey(type, body?.name);

  if (DRIVER === "blob") {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ error: "File storage is not set up yet (connect a Blob store to this project)." }, { status: 500 });
    }
    // The browser uploads straight to Vercel Blob with the token from /api/admin/blob-token.
    return NextResponse.json({ mode: "blob", pathname: `uploads/${key}`, contentType: type, size });
  }

  const publicUrl = publicUrlFor(key);

  if (DRIVER === "r2") {
    const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL } = process.env;
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !R2_PUBLIC_URL) {
      return NextResponse.json({ error: "File storage is not set up yet (R2 settings are missing)." }, { status: 500 });
    }
    try {
      const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
      const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
      const s3 = new S3Client({
        region: "auto",
        endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
      });
      const uploadUrl = await getSignedUrl(
        s3,
        new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, ContentType: type, CacheControl: "public, max-age=31536000, immutable" }),
        { expiresIn: 600 }
      );
      return NextResponse.json({
        uploadUrl,
        headers: { "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable" },
        publicUrl,
      });
    } catch (error) {
      console.error("[presign]", error);
      return NextResponse.json({ error: "Could not prepare the upload. Please try again." }, { status: 500 });
    }
  }

  return NextResponse.json({
    uploadUrl: `/api/admin/file?key=${encodeURIComponent(key)}`,
    headers: { "Content-Type": type },
    publicUrl,
  });
}
