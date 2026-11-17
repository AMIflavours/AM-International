import { NextResponse } from "next/server";
import { handleUpload } from "@vercel/blob/client";
import { getSession } from "@/lib/auth";
import { UPLOADS_ENABLED, UPLOADS_OFF_MESSAGE } from "@/lib/uploadSwitch";
import { DRIVER, isValidKey, limitForKey, typeForKey } from "@/lib/storage";

export const dynamic = "force-dynamic";

const SECTIONS = ["insights", "content", "media", "events", "downloads"];

// Gives a signed in admin a short lived token so the browser can upload one file straight to
// Vercel Blob (large videos and PDFs never pass through this server). Only file names made by
// /api/admin/presign are accepted, with the type and size rules for that kind of file.
export async function POST(request) {
  if (!UPLOADS_ENABLED) return NextResponse.json({ error: UPLOADS_OFF_MESSAGE }, { status: 403 });
  if (DRIVER !== "blob") return NextResponse.json({ error: "Not available." }, { status: 404 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const session = await getSession(SECTIONS);
        if (!session) throw new Error("You are signed out. Please log in again.");
        const key = String(pathname || "").replace(/^uploads\//, "");
        if (!pathname.startsWith("uploads/") || !isValidKey(key)) throw new Error("Invalid file name.");
        return {
          allowedContentTypes: [typeForKey(key)],
          maximumSizeInBytes: limitForKey(key),
          addRandomSuffix: false,
          allowOverwrite: false,
        };
      },
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(json);
  } catch (error) {
    return NextResponse.json({ error: error.message || "Upload failed." }, { status: 400 });
  }
}
