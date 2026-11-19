"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { copyFor, SUGGESTIONS } from "@/lib/adminGuide";

const STORE = "adm-help-chat";

function Bubble({ m, onOpen }) {
  if (m.role === "user") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-brand-navy px-3.5 py-2 text-[13px] leading-5 text-white">{m.text}</p>
      </div>
    );
  }
  return (
    <div className="flex">
      <div className="max-w-[92%] rounded-2xl rounded-bl-md bg-[#f1f1ee] px-3.5 py-2.5 text-[13px] leading-5 text-ink">
        <p className="whitespace-pre-wrap font-medium text-brand-navy">{m.text}</p>
        {m.steps?.length ? (
          <ol className="mt-2 space-y-1.5">
            {m.steps.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-[1px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-brand-orange text-[10px] font-semibold text-white">{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        ) : null}
        {m.actions?.length ? (
          <div className="mt-3 flex flex-col gap-1.5">
            {m.actions.map((a) => (
              <button key={a.id + a.href} type="button" onClick={() => onOpen(a)} className="rounded-lg bg-brand-orange px-3 py-2 text-left text-[12.5px] font-medium text-white transition hover:opacity-90">
                {a.label}
              </button>
            ))}
          </div>
        ) : null}
        {m.suggestions?.length ? <Chips list={m.suggestions} onPick={m.onPick} /> : null}
      </div>
    </div>
  );
}

function Chips({ list, onPick }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {list.map((s) => (
        <button key={s} type="button" onClick={() => onPick(s)} className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-[12px] text-brand-navy transition hover:bg-black/5">
          {s}
        </button>
      ))}
    </div>
  );
}

export default function HelpBot() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORE) || "[]");
      if (Array.isArray(saved)) setMsgs(saved);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORE, JSON.stringify(msgs.slice(-20)));
    } catch {}
    endRef.current?.scrollIntoView({ block: "end" });
  }, [msgs, busy, open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function openAction(a) {
    const q = a.hl ? `?hl=${encodeURIComponent(a.hl)}` : "";
    router.push(`${a.href}${q}`);
    if (window.matchMedia("(max-width: 767px)").matches) setOpen(false);
  }

  async function send(raw) {
    const q = String(raw ?? text).trim();
    if (!q || busy) return;
    setText("");
    const history = msgs.filter((m) => m.text).map((m) => ({ role: m.role, text: m.text }));
    setMsgs((m) => [...m, { role: "user", text: q }]);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/help", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: q, history }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setMsgs((m) => [...m, { role: "assistant", text: data.reply, steps: data.steps, actions: data.actions, suggestions: data.suggestions }]);
    } catch (e) {
      setMsgs((m) => [...m, { role: "assistant", text: e.message || "Something went wrong. Please try again." }]);
    } finally {
      setBusy(false);
    }
  }

  const start = copyFor("ru").hello;
  const shown = msgs.map((m) => (m.suggestions ? { ...m, onPick: send } : m));

  return (
    <>
      {open ? (
        <div role="dialog" aria-label="Help assistant" className="fixed bottom-20 right-3 z-[60] flex h-[min(560px,calc(100vh-7rem))] w-[min(380px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl sm:right-5">
          <div className="flex items-center justify-between bg-brand-navy px-4 py-3 text-white">
            <div>
              <p className="text-sm font-semibold">Help assistant</p>
              <p className="text-[11px] text-white/70">Poochein: English, Urdu ya Roman Urdu</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close help" className="flex h-8 w-8 items-center justify-center rounded-lg text-lg leading-none text-white/80 transition hover:bg-white/10">
              ×
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-white px-3.5 py-3" aria-live="polite">
            <div className="flex">
              <div className="max-w-[92%] rounded-2xl rounded-bl-md bg-[#f1f1ee] px-3.5 py-2.5 text-[13px] leading-5 text-ink">
                <p>{start}</p>
                {msgs.length === 0 ? <Chips list={SUGGESTIONS.ru} onPick={send} /> : null}
              </div>
            </div>
            {shown.map((m, i) => (
              <Bubble key={i} m={m} onOpen={openAction} />
            ))}
            {busy ? (
              <div className="flex">
                <p className="rounded-2xl rounded-bl-md bg-[#f1f1ee] px-3.5 py-2 text-[13px] text-ink/60">Soch raha hoon...</p>
              </div>
            ) : null}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex items-end gap-2 border-t border-black/5 bg-white p-2.5"
          >
            <textarea
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              maxLength={500}
              placeholder="Apna sawal likhein..."
              aria-label="Your question"
              className="max-h-24 min-h-10 flex-1 resize-none rounded-xl border border-black/10 px-3 py-2 text-[13px] text-ink outline-none focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/15"
            />
            <button type="submit" disabled={busy || !text.trim()} className="h-10 rounded-xl bg-brand-orange px-4 text-[13px] font-medium text-white transition hover:opacity-90 disabled:opacity-50">
              Send
            </button>
          </form>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close help" : "Open help assistant"}
        aria-expanded={open}
        className="fixed bottom-5 right-3 z-[60] flex h-12 items-center gap-2 rounded-full bg-brand-orange px-4 text-sm font-medium text-white shadow-lg transition hover:scale-[1.03] active:scale-95 sm:right-5"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />
          <path d="M9.4 9.6a2.6 2.6 0 1 1 3.6 2.4c-.7.3-1 .8-1 1.5M12 16.4h.01" />
        </svg>
        <span className="hidden sm:inline">Help</span>
      </button>
    </>
  );
}
