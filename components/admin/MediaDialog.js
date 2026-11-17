"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { kindOfUrl } from "@/lib/uploadClient";

const KIND_LABEL = { image: "Images", pdf: "PDFs", video: "Videos" };
const ACCEPT = {
  image: "image/jpeg,image/png,image/webp,image/avif",
  pdf: "application/pdf",
  video: "video/mp4,video/webm",
};

function formatSize(bytes) {
  if (!bytes) return "";
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function fileName(url) {
  try {
    const last = decodeURIComponent(String(url).split("?")[0].split("/").pop() || "");
    return last.replace(/^\d{13}-[a-f0-9]{8}-/, "");
  } catch {
    return "";
  }
}

const BTN = "rounded-lg border border-black/10 bg-white px-3.5 py-2 text-sm font-medium text-ink transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60";
const BTN_PRIMARY = "rounded-lg bg-brand-orange px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";

function PdfIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-9 w-9 text-red-600" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M6 2.8h8l4.2 4.2v13.2a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3.8a1 1 0 0 1 1-1Z" />
      <path d="M14 2.8V7h4.2M8 13h8M8 16.5h5" />
    </svg>
  );
}

function PlayBadge() {
  return (
    <span className="absolute bottom-1.5 left-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/65 text-white" aria-hidden="true">
      <svg viewBox="0 0 20 20" className="h-3 w-3" fill="currentColor"><path d="M6 4.5v11l9-5.5-9-5.5Z" /></svg>
    </span>
  );
}

// Shopify style popup for admin files.
//   view "preview": shows the chosen file (picture, PDF or video) with Replace, Media library, Remove, Open
//   view "library": every file uploaded before, with search and filter; pick one or upload a new one
// The field that opens it supplies upload(file, onProgress) so image optimising stays in one place.
export default function MediaDialog(props) {
  // The body is mounted fresh every time the popup opens, so it always starts clean.
  if (!props.open || typeof document === "undefined") return null;
  return <DialogBody {...props} />;
}

function DialogBody({ view: startView = "preview", onClose, value, kinds = ["image", "pdf", "video"], onSelect, onRemove, upload }) {
  // A stable text version of kinds, so a new array from the parent does not restart loading.
  const kindsKey = kinds.join(",");
  const [view, setView] = useState(startView === "preview" && !value ? "library" : startView);
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [kind, setKind] = useState(kinds.length === 1 ? kinds[0] : "all");
  const [picked, setPicked] = useState("");
  const [progress, setProgress] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const inputRef = useRef(null);
  const closeRef = useRef(null);
  const dialogRef = useRef(null);
  const reqId = useRef(0);

  // Always call the latest onClose without restarting the keyboard handling below.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const load = useCallback(
    async ({ reset, nextCursor }) => {
      const id = ++reqId.current;
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        const allowed = kindsKey.split(",");
        const kindParam = kind === "all" && allowed.length === 1 ? allowed[0] : kind;
        if (kindParam !== "all") params.set("kind", kindParam);
        if (q.trim()) params.set("q", q.trim());
        if (!reset && nextCursor) params.set("cursor", nextCursor);
        // Uploaded files and the files that are part of the website code, shown together.
        const siteParams = new URLSearchParams(params);
        siteParams.set("source", "site");
        const [res, siteRes] = await Promise.all([
          fetch(`/api/admin/media?${params.toString()}`),
          reset ? fetch(`/api/admin/media?${siteParams.toString()}`).catch(() => null) : Promise.resolve(null),
        ]);
        const json = await res.json().catch(() => ({}));
        const siteJson = siteRes && siteRes.ok ? await siteRes.json().catch(() => ({})) : {};
        if (id !== reqId.current) return;
        if (!res.ok) throw new Error(json.error || "Could not load the files.");
        const incoming = [...(json.items || []), ...(siteJson.items || [])].filter((it) => allowed.includes(it.kind));
        const newestFirst = (list) => {
          const seen = new Set();
          return list
            .filter((it) => (seen.has(it.url) ? false : seen.add(it.url)))
            .sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : a.uploadedAt > b.uploadedAt ? -1 : 0));
        };
        setItems((prev) => newestFirst(reset ? incoming : [...prev, ...incoming]));
        setCursor(json.cursor || "");
        setHasMore(Boolean(json.hasMore));
      } catch (e) {
        if (id === reqId.current) setError(e.message || "Could not load the files.");
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    },
    [kind, q, kindsKey]
  );

  // Library: load on open, and again (after a short pause) when the search or filter changes.
  useEffect(() => {
    if (view !== "library") return undefined;
    const t = setTimeout(() => load({ reset: true }), q ? 300 : 0);
    return () => clearTimeout(t);
  }, [view, kind, q, load]);

  // Keyboard: Escape closes, Tab stays inside the popup. The page behind does not scroll.
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    function onKey(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
      } else if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll('button:not([disabled]), a[href], input:not([type="hidden"]):not([disabled]), select, [tabindex]:not([tabindex="-1"])');
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, []);

  async function handleFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    setProgress(0);
    try {
      const url = await upload(file, (p) => setProgress(p));
      if (view === "library") {
        // The new file joins the library at the top and is selected, ready for "Use selected".
        const kindOf = kindOfUrl(url);
        setItems((prev) => [{ url, name: fileName(url) || file.name, kind: kindOf, size: file.size, uploadedAt: new Date().toISOString() }, ...prev.filter((it) => it.url !== url)]);
        setPicked(url);
      } else {
        onSelect(url); // Replace in the preview: used right away
      }
    } catch (e) {
      setError(e.message || "Upload failed.");
    } finally {
      setProgress(null);
    }
  }

  async function confirmDelete() {
    const target = toDelete;
    if (!target) return;
    setDeleting(true);
    setError("");
    try {
      const res = await fetch("/api/admin/media", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: target.url }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not delete the file.");
      setItems((prev) => prev.filter((it) => it.url !== target.url));
      if (picked === target.url) setPicked("");
      if (value === target.url) onRemove();
      setToDelete(null);
    } catch (e) {
      setError(e.message || "Could not delete the file.");
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  const acceptList = kinds.map((k) => ACCEPT[k]).join(",");
  const valueKind = kindOfUrl(value);
  const busy = progress !== null;

  const dialog = (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-6" role="presentation">
      <div className="absolute inset-0 bg-black/55" onClick={() => !busy && onClose()} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={view === "preview" ? "File preview" : "Media library"}
        className="relative flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-black/10 px-5 py-3.5">
          <h2 className="text-base font-semibold text-ink">{view === "preview" ? "Preview" : "Media library"}</h2>
          <button ref={closeRef} type="button" onClick={onClose} disabled={busy} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-lg text-ink/60 transition hover:bg-black/5 hover:text-ink disabled:opacity-50">
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" /></svg>
          </button>
        </div>

        {busy ? (
          <div className="border-b border-black/10 bg-offwhite px-5 py-2.5" role="status" aria-live="polite">
            <div className="mb-1.5 flex justify-between text-xs text-ink/70"><span>Uploading...</span><span>{progress}%</span></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-black/10"><div className="h-full bg-brand-orange transition-[width]" style={{ width: `${progress}%` }} /></div>
          </div>
        ) : null}

        {view === "preview" ? (
          <>
            <div className="flex min-h-[240px] flex-1 items-center justify-center overflow-auto bg-[#f4f4f2] p-4">
              {valueKind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={value} alt="" className="max-h-[62vh] max-w-full rounded-md object-contain shadow-sm" />
              ) : valueKind === "pdf" ? (
                <iframe src={value} title="PDF preview" className="h-[62vh] w-full rounded-md border border-black/10 bg-white" />
              ) : valueKind === "video" ? (
                <video src={value} controls playsInline preload="metadata" className="max-h-[62vh] max-w-full rounded-md bg-black" />
              ) : (
                <p className="text-sm text-ink/60">This link cannot be previewed here. Use Open to see it.</p>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/10 px-5 py-3.5">
              <p className="min-w-0 max-w-full truncate text-xs text-ink/55" title={value}>{fileName(value) || value}</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={BTN} disabled={busy} onClick={() => inputRef.current?.click()}>Replace</button>
                <button type="button" className={BTN} disabled={busy} onClick={() => setView("library")}>Media library</button>
                <a href={value} target="_blank" rel="noopener noreferrer" className={BTN}>Open</a>
                <button type="button" className={`${BTN} text-red-600 hover:bg-red-50`} disabled={busy} onClick={() => { onRemove(); onClose(); }}>Remove</button>
                <button type="button" className={BTN_PRIMARY} onClick={onClose} disabled={busy}>Done</button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 border-b border-black/10 px-5 py-3">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by file name"
                aria-label="Search files"
                className="h-10 min-w-[160px] flex-1 rounded-lg border border-black/10 bg-white px-3 text-sm text-ink outline-none transition focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/15"
              />
              {kinds.length > 1 ? (
                <div className="flex gap-1" role="group" aria-label="File type">
                  {["all", ...kinds].map((k) => (
                    <button key={k} type="button" onClick={() => setKind(k)} aria-pressed={kind === k} className={`h-10 rounded-lg px-3 text-sm transition ${kind === k ? "bg-brand-navy text-white" : "border border-black/10 text-ink/70 hover:bg-black/5"}`}>
                      {k === "all" ? "All" : KIND_LABEL[k]}
                    </button>
                  ))}
                </div>
              ) : null}
              <button type="button" className={BTN_PRIMARY} disabled={busy} onClick={() => inputRef.current?.click()}>Upload from device</button>
            </div>

            <div className="min-h-[260px] flex-1 overflow-auto px-5 py-4">
              {error ? (
                <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
              ) : null}
              {!items.length && !loading && !error ? (
                <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center text-sm text-ink/55">
                  <p>No files yet.</p>
                  <p className="mt-1">Click Upload from device to add one.</p>
                </div>
              ) : null}
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {items.map((it) => {
                  const active = picked === it.url;
                  const isCurrent = value === it.url;
                  return (
                    <li key={it.url} className="group relative">
                      <button
                        type="button"
                        onClick={() => setPicked(it.url)}
                        onDoubleClick={() => { onSelect(it.url); setView("preview"); }}
                        aria-pressed={active}
                        className={`block w-full overflow-hidden rounded-lg border bg-white text-left transition ${active ? "border-brand-orange ring-2 ring-brand-orange" : "border-black/10 hover:border-black/25"}`}
                      >
                        <span className="relative flex aspect-square items-center justify-center overflow-hidden bg-black/5">
                          {it.kind === "image" ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={it.source === "site" ? `/_next/image?url=${encodeURIComponent(it.url)}&w=256&q=75` : it.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                          ) : it.kind === "video" ? (
                            <>
                              <video src={`${it.url}#t=0.5`} preload="metadata" muted playsInline className="h-full w-full object-cover" />
                              <PlayBadge />
                            </>
                          ) : (
                            <span className="flex flex-col items-center gap-1"><PdfIcon /><span className="text-[11px] font-semibold tracking-wide text-red-600">PDF</span></span>
                          )}
                          {isCurrent ? <span className="absolute right-1.5 top-1.5 rounded bg-brand-navy px-1.5 py-0.5 text-[10px] font-medium text-white">In use</span> : null}
                        </span>
                        <span className="block px-2.5 py-2">
                          <span className="block truncate text-xs font-medium text-ink" title={it.name}>{it.name}</span>
                          <span className="block text-[11px] text-ink/50">{formatSize(it.size)}{it.source === "site" ? " · Site file" : ""}</span>
                        </span>
                      </button>
                      {it.source !== "site" ? (
                        <button
                          type="button"
                          onClick={() => setToDelete(it)}
                          disabled={busy || deleting}
                          aria-label={`Delete ${it.name}`}
                          title="Delete"
                          className="absolute left-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white opacity-0 shadow transition hover:bg-red-700 focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
                        >
                          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M5 10h10" /></svg>
                        </button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
              {loading ? <p className="py-4 text-center text-sm text-ink/55" role="status">Loading...</p> : null}
              {hasMore && !loading ? (
                <div className="py-4 text-center"><button type="button" className={BTN} onClick={() => load({ reset: false, nextCursor: cursor })}>Load more</button></div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/10 px-5 py-3.5">
              <p className="text-xs text-ink/50">Click a file to select it. Double click to use it right away. Hover a file to delete it.</p>
              <div className="flex gap-2">
                {value ? <button type="button" className={BTN} disabled={busy} onClick={() => setView("preview")}>Back to preview</button> : null}
                <button type="button" className={BTN} disabled={busy} onClick={onClose}>Cancel</button>
                <button type="button" className={BTN_PRIMARY} disabled={!picked || busy} onClick={() => { onSelect(picked); setView("preview"); }}>Use selected</button>
              </div>
            </div>
          </>
        )}
        {toDelete ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/45 p-4" role="alertdialog" aria-modal="true" aria-labelledby="del-title">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
              <h3 id="del-title" className="text-base font-semibold text-ink">Delete this file?</h3>
              <p className="mt-1 truncate text-sm text-ink/70" title={toDelete.name}>{toDelete.name}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink/60">It is removed from storage for good and cannot be brought back. If a page uses it, that spot will show empty.</p>
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" autoFocus className={BTN} disabled={deleting} onClick={() => setToDelete(null)}>Cancel</button>
                <button type="button" className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60" disabled={deleting} onClick={confirmDelete}>{deleting ? "Deleting..." : "Delete"}</button>
              </div>
            </div>
          </div>
        ) : null}
        <input ref={inputRef} type="file" accept={acceptList} onChange={handleFile} className="hidden" tabIndex={-1} />
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}
