"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

const TABS = [
  { id: "all", label: "All" },
  { id: "image", label: "Images" },
  { id: "video", label: "Videos" },
  { id: "pdf", label: "PDFs" },
];
const SORTS = [
  { id: "new", label: "Newest first" },
  { id: "old", label: "Oldest first" },
  { id: "big", label: "Largest first" },
  { id: "small", label: "Smallest first" },
  { id: "name", label: "Name A to Z" },
];

const BTN = "rounded-lg border border-black/10 bg-white px-3.5 py-2 text-sm font-medium text-ink transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60";
const BTN_RED = "rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60";

function formatSize(bytes) {
  if (!bytes && bytes !== 0) return "";
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Karachi" });
}

const KIND_NAME = { image: "Image", video: "Video", pdf: "PDF" };

function PdfIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-9 w-9 text-red-600" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M6 2.8h8l4.2 4.2v13.2a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3.8a1 1 0 0 1 1-1Z" />
      <path d="M14 2.8V7h4.2M8 13h8M8 16.5h5" />
    </svg>
  );
}

function thumbSrc(it, ver) {
  if (it.source === "site") return `/_next/image?url=${encodeURIComponent(it.url)}&w=256&q=75`;
  return ver ? `${it.url}${it.url.includes("?") ? "&" : "?"}v=${ver}` : it.url;
}

export default function FilesManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("all");
  const [source, setSource] = useState("all"); // all | uploaded | site
  const [sort, setSort] = useState("new");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(() => new Set());
  const [viewer, setViewer] = useState(null);
  const [toDelete, setToDelete] = useState(null); // array of items
  const [deleting, setDeleting] = useState(false);
  const [work, setWork] = useState(null); // { done, total, text }
  const [notes, setNotes] = useState({}); // url -> text after compress
  const [versions, setVersions] = useState({}); // url -> number, to refresh a thumbnail
  const [toast, setToast] = useState("");
  const loadId = useRef(0);

  // Reads the website files and every uploaded file (all pages of the storage list).
  const fetchAll = useCallback(async () => {
    const siteRes = await fetch("/api/admin/media?source=site");
    const siteJson = siteRes.ok ? await siteRes.json().catch(() => ({})) : {};
    let all = [...(siteJson.items || [])];
    let cursor = "";
    for (let page = 0; page < 40; page++) {
      const res = await fetch(`/api/admin/media${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not load the files.");
      all = all.concat(json.items || []);
      if (!json.hasMore || !json.cursor) break;
      cursor = json.cursor;
    }
    const seen = new Set();
    return all.filter((it) => (seen.has(it.url) ? false : seen.add(it.url)));
  }, []);

  const run = useCallback(() => {
    const id = ++loadId.current;
    fetchAll()
      .then((list) => {
        if (id !== loadId.current) return;
        setItems(list);
        setError("");
      })
      .catch((e) => {
        if (id === loadId.current) setError(e.message || "Could not load the files.");
      })
      .finally(() => {
        if (id === loadId.current) setLoading(false);
      });
  }, [fetchAll]);

  useEffect(() => {
    run();
  }, [run]);

  function refresh() {
    setLoading(true);
    run();
  }

  const counts = useMemo(() => {
    const c = { all: items.length, image: 0, video: 0, pdf: 0 };
    for (const it of items) c[it.kind] = (c[it.kind] || 0) + 1;
    return c;
  }, [items]);

  const uploaded = useMemo(() => items.filter((it) => it.source !== "site"), [items]);
  const uploadedBytes = useMemo(() => uploaded.reduce((n, it) => n + (it.size || 0), 0), [uploaded]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = items.filter(
      (it) =>
        (tab === "all" || it.kind === tab) &&
        (source === "all" || (source === "site" ? it.source === "site" : it.source !== "site")) &&
        (!needle || it.name.toLowerCase().includes(needle))
    );
    const by = {
      new: (a, b) => (a.uploadedAt < b.uploadedAt ? 1 : a.uploadedAt > b.uploadedAt ? -1 : 0),
      old: (a, b) => (a.uploadedAt > b.uploadedAt ? 1 : a.uploadedAt < b.uploadedAt ? -1 : 0),
      big: (a, b) => (b.size || 0) - (a.size || 0),
      small: (a, b) => (a.size || 0) - (b.size || 0),
      name: (a, b) => a.name.localeCompare(b.name),
    }[sort];
    return list.sort(by);
  }, [items, tab, source, q, sort]);

  const shownUploaded = shown.filter((it) => it.source !== "site");
  const picked = uploaded.filter((it) => selected.has(it.url));

  function toggle(url) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  }

  function flash(text) {
    setToast(text);
    setTimeout(() => setToast(""), 5000);
  }

  async function compressList(list) {
    if (!list.length || work) return;
    let saved = 0;
    let failed = 0;
    let firstError = "";
    for (let i = 0; i < list.length; i++) {
      const it = list[i];
      setWork({ done: i, total: list.length, text: `Compressing ${it.name}` });
      try {
        const res = await fetch("/api/admin/compress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: it.url }) });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.ok) throw new Error(json.error || "Could not compress.");
        if (json.changed) {
          saved += json.saved;
          setItems((prev) => prev.map((x) => (x.url === it.url ? { ...x, size: json.after } : x)));
          setVersions((v) => ({ ...v, [it.url]: Date.now() }));
          setNotes((n) => ({ ...n, [it.url]: `Saved ${formatSize(json.saved)}` }));
        } else {
          setNotes((n) => ({ ...n, [it.url]: "Already optimised" }));
        }
        setViewer((v) => (v && v.url === it.url && json.changed ? { ...v, size: json.after } : v));
      } catch (e) {
        failed++;
        if (!firstError) firstError = e.message;
        setNotes((n) => ({ ...n, [it.url]: "Failed" }));
      }
    }
    setWork(null);
    flash(failed ? `${failed} could not be compressed. ${firstError}` : saved ? `Done. Saved ${formatSize(saved)} in total.` : "Done. These files were already well optimised.");
  }

  async function confirmDelete() {
    const list = toDelete || [];
    if (!list.length) return;
    setDeleting(true);
    let failed = 0;
    const gone = new Set();
    for (const it of list) {
      try {
        const res = await fetch("/api/admin/media", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: it.url }) });
        if (!res.ok) throw new Error();
        gone.add(it.url);
      } catch {
        failed++;
      }
    }
    setItems((prev) => prev.filter((it) => !gone.has(it.url)));
    setSelected((prev) => {
      const next = new Set(prev);
      gone.forEach((u) => next.delete(u));
      return next;
    });
    setViewer((v) => (v && gone.has(v.url) ? null : v));
    setToDelete(null);
    setDeleting(false);
    flash(failed ? `${failed} file(s) could not be deleted.` : gone.size === 1 ? "File deleted." : `${gone.size} files deleted.`);
  }

  async function copyLink(it) {
    const full = it.url.startsWith("http") ? it.url : `${window.location.origin}${it.url}`;
    try {
      await navigator.clipboard.writeText(full);
      flash("Link copied.");
    } catch {
      flash(full);
    }
  }

  const tabBtn = (active) => `rounded-lg px-3 py-1.5 text-sm font-medium transition ${active ? "bg-brand-navy text-white" : "text-ink/70 hover:bg-black/5"}`;
  const field = "h-10 rounded-lg border border-black/10 bg-white px-3 text-sm text-ink outline-none transition focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/15";

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="File type">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tabBtn(tab === t.id)} onClick={() => setTab(t.id)}>
              {t.label} <span className="opacity-60">({counts[t.id] || 0})</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-ink/55">Uploaded from the admin: {uploaded.length} files, {formatSize(uploadedBytes) || "0 KB"}</p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by file name" aria-label="Search files" className={`${field} min-w-[180px] flex-1`} />
        <select value={source} onChange={(e) => setSource(e.target.value)} aria-label="Where the file is" className={field}>
          <option value="all">All sources</option>
          <option value="uploaded">Uploaded from admin</option>
          <option value="site">Website files (code)</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort" className={field}>
          {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <button type="button" className={BTN} onClick={refresh} disabled={loading}>Refresh</button>
      </div>

      {picked.length || shownUploaded.length ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-black/5 bg-white px-3 py-2 text-sm shadow-sm">
          <label className="flex items-center gap-2 text-ink/70">
            <input
              type="checkbox"
              checked={shownUploaded.length > 0 && shownUploaded.every((it) => selected.has(it.url))}
              onChange={(e) => setSelected(e.target.checked ? new Set(shownUploaded.map((it) => it.url)) : new Set())}
              className="h-4 w-4 accent-[var(--color-brand-orange,#f7941d)]"
            />
            Select all shown
          </label>
          <span className="text-ink/50">{picked.length ? `${picked.length} selected (${formatSize(picked.reduce((n, it) => n + (it.size || 0), 0))})` : "Tick files to delete or compress many at once."}</span>
          <span className="flex-1" />
          <button type="button" className={BTN} disabled={!picked.length || Boolean(work)} onClick={() => compressList(picked)}>Make smaller</button>
          <button type="button" className={`${BTN} text-red-600 hover:bg-red-50`} disabled={!picked.length || Boolean(work)} onClick={() => setToDelete(picked)}>Delete</button>
        </div>
      ) : null}

      {work ? (
        <div className="mt-3 rounded-lg bg-offwhite px-4 py-3" role="status" aria-live="polite">
          <div className="mb-1.5 flex justify-between text-xs text-ink/70"><span className="truncate">{work.text}</span><span>{work.done} / {work.total}</span></div>
          <div className="h-1.5 overflow-hidden rounded-full bg-black/10"><div className="h-full bg-brand-orange transition-[width]" style={{ width: `${(work.done / work.total) * 100}%` }} /></div>
        </div>
      ) : null}
      {toast ? <p role="status" className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{toast}</p> : null}
      {error ? <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      {loading && !items.length ? <p className="py-10 text-center text-sm text-ink/55" role="status">Loading files...</p> : null}
      {!loading && !shown.length && !error ? <p className="py-10 text-center text-sm text-ink/55">No files match.</p> : null}

      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {shown.map((it) => {
          const mine = it.source !== "site";
          const on = selected.has(it.url);
          return (
            <li key={it.url} className="group relative">
              <button
                type="button"
                onClick={() => setViewer(it)}
                className={`block w-full overflow-hidden rounded-lg border bg-white text-left transition ${on ? "border-brand-orange ring-2 ring-brand-orange" : "border-black/10 hover:border-black/25"}`}
              >
                <span className="relative flex aspect-square items-center justify-center overflow-hidden bg-black/5">
                  {it.kind === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumbSrc(it, versions[it.url])} alt="" loading="lazy" className="h-full w-full object-cover" />
                  ) : it.kind === "video" ? (
                    <>
                      <video src={`${it.url}#t=0.5`} preload="metadata" muted playsInline className="h-full w-full object-cover" />
                      <span className="absolute bottom-1.5 left-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/65 text-white" aria-hidden="true">
                        <svg viewBox="0 0 20 20" className="h-3 w-3" fill="currentColor"><path d="M6 4.5v11l9-5.5-9-5.5Z" /></svg>
                      </span>
                    </>
                  ) : (
                    <span className="flex flex-col items-center gap-1"><PdfIcon /><span className="text-[11px] font-semibold tracking-wide text-red-600">PDF</span></span>
                  )}
                  {!mine ? <span className="absolute right-1.5 top-1.5 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white">Site file</span> : null}
                </span>
                <span className="block px-2.5 py-2">
                  <span className="block truncate text-xs font-medium text-ink" title={it.name}>{it.name}</span>
                  <span className="block text-[11px] text-ink/50">{formatSize(it.size)} · {formatDate(it.uploadedAt)}</span>
                  {notes[it.url] ? <span className="block text-[11px] font-medium text-emerald-700">{notes[it.url]}</span> : null}
                </span>
              </button>
              {mine ? (
                <>
                  <label
                    className={`absolute left-1.5 top-1.5 flex h-7 w-7 cursor-pointer items-center justify-center rounded-md bg-white/95 shadow transition ${on || selected.size ? "opacity-100" : "opacity-0 focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"}`}
                    title="Select"
                  >
                    <input type="checkbox" checked={on} onChange={() => toggle(it.url)} aria-label={`Select ${it.name}`} className="h-4 w-4 accent-[var(--color-brand-orange,#f7941d)]" />
                  </label>
                  <button
                    type="button"
                    onClick={() => setToDelete([it])}
                    aria-label={`Delete ${it.name}`}
                    title="Delete"
                    className="absolute bottom-[3.2rem] right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white opacity-0 shadow transition hover:bg-red-700 focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
                  >
                    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M5 10h10" /></svg>
                  </button>
                </>
              ) : null}
            </li>
          );
        })}
      </ul>

      {viewer ? (
        <Viewer
          item={viewer}
          busy={Boolean(work)}
          onClose={() => setViewer(null)}
          onDelete={() => setToDelete([viewer])}
          onCompress={() => compressList([viewer])}
          onCopy={() => copyLink(viewer)}
          version={versions[viewer.url]}
          note={notes[viewer.url]}
          suspended={Boolean(toDelete)}
        />
      ) : null}

      {toDelete ? (
        <Modal onClose={() => !deleting && setToDelete(null)} label="Delete files">
          <h3 className="text-base font-semibold text-ink">{toDelete.length === 1 ? "Delete this file?" : `Delete ${toDelete.length} files?`}</h3>
          <p className="mt-1 truncate text-sm text-ink/70">{toDelete.length === 1 ? toDelete[0].name : toDelete.slice(0, 3).map((i) => i.name).join(", ") + (toDelete.length > 3 ? ` and ${toDelete.length - 3} more` : "")}</p>
          <p className="mt-2 text-sm leading-relaxed text-ink/60">They are removed from storage for good and cannot be brought back. If a page uses one, that spot will show empty.</p>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" autoFocus className={BTN} disabled={deleting} onClick={() => setToDelete(null)}>Cancel</button>
            <button type="button" className={BTN_RED} disabled={deleting} onClick={confirmDelete}>{deleting ? "Deleting..." : "Delete"}</button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function Modal({ children, onClose, label, wide = false, z = 1000 }) {
  const ref = useRef(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
      }
    }
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = overflow;
    };
  }, []);
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center p-3 sm:p-6" style={{ zIndex: z }} role="presentation">
      <div className="absolute inset-0 bg-black/55" onClick={onClose} aria-hidden="true" />
      <div ref={ref} role="dialog" aria-modal="true" aria-label={label} className={`relative w-full ${wide ? "max-w-4xl" : "max-w-sm"} max-h-full overflow-auto rounded-2xl bg-white p-5 shadow-2xl`}>
        {children}
      </div>
    </div>,
    document.body
  );
}

function Viewer({ item, busy, onClose, onDelete, onCompress, onCopy, version, note, suspended }) {
  const mine = item.source !== "site";
  const src = thumbSrc({ ...item, source: "viewer" }, version);
  return (
    <Modal onClose={suspended ? () => {} : onClose} label="File details" wide>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-ink" title={item.name}>{item.name}</h3>
          <p className="mt-0.5 text-xs text-ink/55">
            {KIND_NAME[item.kind]} · {formatSize(item.size)} · {formatDate(item.uploadedAt)} · {mine ? "Uploaded from admin" : "Website file (code)"}
            {note ? <span className="font-medium text-emerald-700"> · {note}</span> : null}
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink/60 transition hover:bg-black/5">
          <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" /></svg>
        </button>
      </div>
      <div className="mt-4 flex min-h-[240px] items-center justify-center overflow-auto rounded-lg bg-[#f4f4f2] p-3">
        {item.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="max-h-[60vh] max-w-full rounded-md object-contain" />
        ) : item.kind === "pdf" ? (
          <iframe src={src} title="PDF preview" className="h-[60vh] w-full rounded-md border border-black/10 bg-white" />
        ) : (
          <video src={src} controls playsInline preload="metadata" className="max-h-[60vh] max-w-full rounded-md bg-black" />
        )}
      </div>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button type="button" className={BTN} onClick={onCopy}>Copy link</button>
        <a href={item.url} target="_blank" rel="noopener noreferrer" className={BTN}>Open</a>
        {mine ? (
          <>
            <button type="button" className={BTN} disabled={busy} onClick={onCompress}>{busy ? "Working..." : "Make smaller"}</button>
            <button type="button" className={`${BTN} text-red-600 hover:bg-red-50`} disabled={busy} onClick={onDelete}>Delete</button>
          </>
        ) : (
          <p className="self-center text-xs text-ink/50">Website files are part of the code, so they can only be viewed here.</p>
        )}
      </div>
    </Modal>
  );
}
