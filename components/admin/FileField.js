"use client";

import { useState } from "react";
import { uploadFile } from "@/lib/uploadClient";
import MediaDialog from "@/components/admin/MediaDialog";

const INPUT =
  "h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-sm text-ink outline-none transition focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/15";
const BTN = "h-10 rounded-lg border border-black/10 px-4 text-sm font-medium transition hover:bg-black/5 disabled:opacity-60";

// Which kinds of file the Media Library shows for this field, taken from the accept text.
function kindsFor(accept) {
  const a = String(accept || "").toLowerCase();
  if (a.includes("video")) return ["video"];
  if (a.includes("pdf")) return ["pdf"];
  if (a.includes("image")) return ["image"];
  return ["pdf", "image", "video"];
}

// Upload a file (PDF, video) straight to storage, pick one from the Media Library, or paste an
// existing link. After an upload, or on Preview, a popup shows the file with Replace and Remove.
export default function FileField({ label, value, onChange, accept, hint, noUpload = false }) {
  const [dialog, setDialog] = useState(null); // null | "preview" | "library"

  return (
    <div>
      {label ? <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ink/60">{label}</p> : null}
      <div className="flex flex-wrap items-center gap-3">
        <input value={value || ""} onChange={(e) => onChange(e.target.value)} className={`${INPUT} min-w-0 flex-1`} aria-label={label} />
        {noUpload ? null : (
          <button type="button" onClick={() => setDialog("library")} className={BTN}>
            {value ? "Replace file" : "Upload file"}
          </button>
        )}
        {value ? (
          <button type="button" onClick={() => setDialog("preview")} className="text-sm text-brand-orange hover:underline">
            Preview
          </button>
        ) : null}
      </div>
      {hint ? <p className="mt-1 text-xs text-ink/50">{hint}</p> : null}
      <MediaDialog
        open={dialog !== null}
        view={dialog || "preview"}
        onClose={() => setDialog(null)}
        value={value}
        kinds={kindsFor(accept)}
        onSelect={(url) => onChange(url)}
        onRemove={() => onChange("")}
        upload={(file, onProgress) => uploadFile(file, onProgress)}
      />
    </div>
  );
}
