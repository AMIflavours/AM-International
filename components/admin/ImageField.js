"use client";

import { useState } from "react";
import { uploadFile } from "@/lib/uploadClient";
import MediaDialog from "@/components/admin/MediaDialog";

const MAX_SIDE = 2200; // longest side in pixels, plenty for full width hero images
const QUALITY = 0.82; // WebP quality: visually the same as the original for photos and logos

// Shrinks the image in the browser before upload: resized if very large, converted to WebP
// (keeps transparency). If anything fails, or the result is not smaller, the original is used.
async function optimise(file) {
  if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", QUALITY));
    // Some browsers cannot encode WebP and silently return PNG, so check the type.
    if (!blob || blob.type !== "image/webp") return file;
    if (blob.size >= file.size && scale === 1) return file;
    const base = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${base}.webp`, { type: "image/webp" });
  } catch {
    return file;
  }
}

export default function ImageField({ label, value, onChange, hint }) {
  const [dialog, setDialog] = useState(null); // null | "preview" | "library"

  // Used by the popup for its own Replace and Upload new buttons.
  async function uploadOptimised(file, onProgress) {
    return uploadFile(await optimise(file), onProgress);
  }

  return (
    <div>
      {label ? <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ink/60">{label}</p> : null}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-dashed border-black/15 bg-white p-3">
        <button
          type="button"
          onClick={() => setDialog(value ? "preview" : "library")}
          aria-label={value ? "Preview image" : "Choose an image"}
          className="flex h-20 w-32 shrink-0 items-center justify-center overflow-hidden rounded-md bg-black/5 text-xs text-ink/40 transition hover:ring-2 hover:ring-brand-orange/50"
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            "No image"
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setDialog("library")}
              className="rounded-lg border border-black/10 px-3 py-1.5 text-sm transition hover:bg-black/5"
            >
              {value ? "Replace image" : "Upload image"}
            </button>
            {value ? (
              <button type="button" onClick={() => onChange("")} className="rounded-lg px-3 py-1.5 text-sm text-red-600 transition hover:bg-red-50">
                Remove
              </button>
            ) : null}
          </div>
          <p className="mt-1.5 text-xs text-ink/50">{hint || "JPG, PNG, WebP or AVIF. Images are optimised automatically."}</p>
        </div>
      </div>
      <MediaDialog
        open={dialog !== null}
        view={dialog || "preview"}
        onClose={() => setDialog(null)}
        value={value}
        kinds={["image"]}
        onSelect={(url) => onChange(url)}
        onRemove={() => onChange("")}
        upload={uploadOptimised}
      />
    </div>
  );
}
