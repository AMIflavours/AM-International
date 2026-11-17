"use client";

import { useRef, useState } from "react";
import { uploadFile } from "@/lib/uploadClient";
import { UPLOADS_ENABLED, UPLOADS_OFF_MESSAGE } from "@/lib/uploadSwitch";
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
  const inputRef = useRef(null);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState(null); // null | "preview" | "library"

  async function handleFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    setProgress(0);
    try {
      const url = await uploadFile(file, (percent) => setProgress(percent));
      onChange(url);
      setDialog("preview");
    } catch (e) {
      setError(e.message || "Upload failed.");
    } finally {
      setProgress(null);
    }
  }

  return (
    <div>
      {label ? <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ink/60">{label}</p> : null}
      <div className="flex flex-wrap items-center gap-3">
        <input value={value || ""} onChange={(e) => onChange(e.target.value)} className={`${INPUT} min-w-0 flex-1`} aria-label={label} />
        {noUpload ? null : (
          <>
            <input ref={inputRef} type="file" accept={accept} onChange={handleFile} className="hidden" />
            <button
              type="button"
              disabled={progress !== null}
              aria-disabled={!UPLOADS_ENABLED}
              onClick={() => {
                if (!UPLOADS_ENABLED) { setError(UPLOADS_OFF_MESSAGE); return; }
                inputRef.current?.click();
              }}
              className={BTN + (UPLOADS_ENABLED ? "" : " cursor-not-allowed bg-black/5 text-ink/35 hover:bg-black/5")}
            >
              {progress !== null ? `Uploading ${progress}%` : "Upload file"}
            </button>
            <button type="button" disabled={progress !== null} onClick={() => setDialog("library")} className={BTN}>
              Media library
            </button>
          </>
        )}
        {value ? (
          <button type="button" onClick={() => setDialog("preview")} className="text-sm text-brand-orange hover:underline">
            Preview
          </button>
        ) : null}
      </div>
      {hint ? <p className="mt-1 text-xs text-ink/50">{hint}</p> : null}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
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
