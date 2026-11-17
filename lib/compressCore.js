// Makes files smaller without a visible drop in quality. Pure helpers, no storage code here.
//   images: same format, same pixels, smarter encoding (JPEG mozjpeg q82, PNG lossless level 9, WebP q80, AVIF q55)
//   PDFs:   Ghostscript "printer" preset when it is installed (VPS), otherwise a lossless rewrite with pdf-lib
//   videos: ffmpeg (H.264 CRF 23 / VP9 CRF 32, audio kept) when it is installed (VPS)
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const run = promisify(execFile);

const binCache = new Map();
export async function hasBin(name, args = ["-version"]) {
  if (binCache.has(name)) return binCache.get(name);
  let ok = false;
  try {
    await run(name, args, { timeout: 10000 });
    ok = true;
  } catch {
    ok = false;
  }
  binCache.set(name, ok);
  return ok;
}

export async function compressImage(buffer, ext) {
  const sharp = (await import("sharp")).default;
  let img = sharp(buffer, { failOn: "none", animated: false }).rotate(); // rotate() applies the EXIF turn, since metadata is dropped
  img = img.resize({ width: 4096, height: 4096, fit: "inside", withoutEnlargement: true });
  if (ext === "jpg") img = img.jpeg({ quality: 82, mozjpeg: true });
  else if (ext === "png") img = img.png({ compressionLevel: 9, effort: 10 });
  else if (ext === "webp") img = img.webp({ quality: 80, effort: 5 });
  else if (ext === "avif") img = img.avif({ quality: 55, effort: 4 });
  else throw new Error("Unsupported picture type.");
  return img.toBuffer();
}

export const PDF_JS_LIMIT = 40 * 1024 * 1024; // above this size only Ghostscript (VPS) is used

export async function compressPdf(buffer) {
  if (await hasBin("gs", ["--version"])) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pdf-"));
    const input = path.join(dir, "in.pdf");
    const output = path.join(dir, "out.pdf");
    try {
      fs.writeFileSync(input, buffer);
      await run(
        "gs",
        ["-sDEVICE=pdfwrite", "-dCompatibilityLevel=1.5", "-dPDFSETTINGS=/printer", "-dNOPAUSE", "-dQUIET", "-dBATCH", `-sOutputFile=${output}`, input],
        { timeout: 10 * 60 * 1000, maxBuffer: 8 * 1024 * 1024 }
      );
      return fs.readFileSync(output);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
  if (buffer.length > PDF_JS_LIMIT) throw new Error("This PDF is too big to shrink here. It works after moving to the VPS server.");
  const { PDFDocument } = await import("pdf-lib");
  const doc = await PDFDocument.load(buffer, { updateMetadata: false, ignoreEncryption: false });
  return Buffer.from(await doc.save({ useObjectStreams: true }));
}

// input and output are file paths. Resolves when ffmpeg is done.
export async function compressVideoFile(input, output, ext) {
  if (!(await hasBin("ffmpeg"))) throw new Error("NO_FFMPEG");
  const common = ["-y", "-i", input, "-map_metadata", "-1"];
  const args =
    ext === "webm"
      ? [...common, "-c:v", "libvpx-vp9", "-crf", "32", "-b:v", "0", "-row-mt", "1", "-c:a", "copy", output]
      : [...common, "-c:v", "libx264", "-crf", "23", "-preset", "medium", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-c:a", "aac", "-b:a", "128k", output];
  await run("ffmpeg", args, { timeout: 60 * 60 * 1000, maxBuffer: 16 * 1024 * 1024 });
}
