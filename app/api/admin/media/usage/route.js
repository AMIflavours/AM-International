import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { findUsage } from "@/lib/mediaUsage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SECTIONS = ["insights", "content", "media", "events", "downloads"];

// Where are these files used on the website?
//   POST /api/admin/media/usage   body: { urls: [...] }   ->   { usage: { [url]: [{ where, detail }] } }
export async function POST(request) {
  const session = await getSession(SECTIONS);
  if (!session) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  let urls = [];
  try {
    urls = (await request.json())?.urls;
  } catch {}
  if (!Array.isArray(urls)) return NextResponse.json({ error: "No files given." }, { status: 400 });
  try {
    return NextResponse.json({ usage: await findUsage(urls.map(String).slice(0, 60)) });
  } catch (error) {
    console.error("[media-usage]", error);
    return NextResponse.json({ usage: {}, error: "Could not check where the files are used." });
  }
}
