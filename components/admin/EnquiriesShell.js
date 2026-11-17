"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

function shortDate(iso) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Karachi" });
}

function initials(text) {
  const parts = String(text || "?").trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join("") || "?";
}

export default function EnquiriesShell({ rows, failed, children }) {
  const pathname = usePathname();
  const activeId = /^\/admin\/enquiries\/(\d+)/.exec(pathname || "")?.[1] || "";
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");

  const newCount = rows.filter((r) => r.status === "new").length;
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (filter === "all" || r.status === "new") &&
        (!needle || `${r.name} ${r.company} ${r.topic} ${r.message}`.toLowerCase().includes(needle))
    );
  }, [rows, filter, q]);

  const tab = (active) =>
    `rounded-full px-3 py-1 text-xs font-medium transition ${active ? "bg-brand-navy text-white" : "text-ink/70 hover:bg-black/5"}`;

  return (
    <div className="mx-auto max-w-6xl">
      <div className={activeId ? "hidden md:block" : ""}>
        <h1 className="text-2xl font-bold text-brand-navy">Enquiries</h1>
        <p className="mt-1 text-sm text-ink/60">Messages sent from the Contact page form.</p>
      </div>
      {failed ? <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">The database could not be reached. Check DATABASE_URL.</p> : null}

      <div className="mt-4 grid gap-4 md:grid-cols-[340px_minmax(0,1fr)]">
        <aside className={`${activeId ? "hidden md:block" : "block"} overflow-hidden rounded-xl border border-black/5 bg-white shadow-sm`} aria-label="Customers">
          <div className="space-y-2 border-b border-black/5 p-3">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, company or message"
              aria-label="Search enquiries"
              className="h-9 w-full rounded-lg border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/15"
            />
            <div className="flex gap-1" role="group" aria-label="Filter">
              <button type="button" className={tab(filter === "all")} aria-pressed={filter === "all"} onClick={() => setFilter("all")}>All ({rows.length})</button>
              <button type="button" className={tab(filter === "new")} aria-pressed={filter === "new"} onClick={() => setFilter("new")}>New ({newCount})</button>
            </div>
          </div>
          {shown.length === 0 ? (
            <p className="p-6 text-center text-sm text-ink/60">{rows.length ? "No enquiries match." : "No enquiries yet."}</p>
          ) : (
            <ul className="max-h-[70vh] divide-y divide-black/5 overflow-y-auto">
              {shown.map((r) => {
                const isNew = r.status === "new";
                const active = String(r.id) === activeId;
                const person = r.name || r.company;
                return (
                  <li key={r.id}>
                    <Link
                      href={`/admin/enquiries/${r.id}`}
                      aria-current={active ? "page" : undefined}
                      className={`flex gap-3 px-4 py-3 transition ${active ? "bg-brand-orange/10" : "hover:bg-black/[0.03]"}`}
                    >
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-navy/10 text-xs font-semibold text-brand-navy" aria-hidden="true">{initials(person)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className={`truncate text-sm ${isNew ? "font-semibold text-brand-navy" : "font-medium text-ink/80"}`}>{person}</span>
                          <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-ink/45">
                            {isNew ? <span className="h-2 w-2 rounded-full bg-brand-orange" aria-label="New" /> : null}
                            {shortDate(r.createdAt)}
                          </span>
                        </span>
                        {r.name && r.company ? <span className="block truncate text-xs text-ink/50">{r.company}</span> : null}
                        <span className="mt-0.5 block truncate text-xs text-ink/60">{r.message}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <section className={`${activeId ? "block" : "hidden md:block"} min-w-0`}>{children}</section>
      </div>
    </div>
  );
}
