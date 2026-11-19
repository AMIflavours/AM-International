"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const STORE = "adm-help-chat";

const QUICK = [
  { q: "How do I change the logo?", label: "Change the logo", icon: "M4 6h16M4 12h10M4 18h16" },
  { q: "How do I replace a video?", label: "Replace a video", icon: "M5 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm14 4 2-1.5v9L19 15" },
  { q: "Where do I change the phone number?", label: "Update phone numbers", icon: "M6.5 3.5h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5v3a2 2 0 0 1-2 2A15.5 15.5 0 0 1 4.5 5.5a2 2 0 0 1 2-2Z" },
  { q: "How do I delete a file?", label: "Delete or compress a file", icon: "M5 7h14M10 7V4h4v3m-6 0 .7 12h6.6L16 7" },
  { q: "How do I see customer enquiries?", label: "Customer enquiries", icon: "M4 6h16v12H4V6Zm0 1 8 6 8-6" },
  { q: "How do I add an event?", label: "Add an event", icon: "M5 5h14v14H5V5Zm0 4h14M9 3v4m6-4v4" },
];

function Avatar({ size = 28 }) {
  return (
    <span aria-hidden="true" className="flex shrink-0 select-none items-center justify-center rounded-full bg-white font-extrabold tracking-tight text-brand-navy ring-2 ring-brand-orange" style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}>
      AMI
    </span>
  );
}

function Bubble({ m, onOpen, onPick }) {
  if (m.role === "user") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-brand-navy px-3.5 py-2.5 text-[13px] leading-5 text-white shadow-sm">{m.text}</p>
      </div>
    );
  }
  return (
    <div className="flex items-end gap-2">
      <Avatar />
      <div className="max-w-[88%] rounded-2xl rounded-bl-md bg-[#f3f2ee] px-3.5 py-3 text-[13px] leading-5 text-ink">
        <p className="whitespace-pre-wrap font-semibold text-brand-navy">{m.text}</p>
        {m.steps?.length ? (
          <ol className="mt-2.5 space-y-2">
            {m.steps.map((s, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="mt-[1px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-orange text-[10px] font-bold text-white">{i + 1}</span>
                <span className="text-ink/85">{s}</span>
              </li>
            ))}
          </ol>
        ) : null}
        {m.actions?.length ? (
          <div className="mt-3 flex flex-col gap-1.5">
            {m.actions.map((a) => (
              <button key={a.id + a.href} type="button" onClick={() => onOpen(a)} className="group flex items-center justify-between gap-2 rounded-xl bg-brand-orange px-3.5 py-2.5 text-left text-[12.5px] font-semibold text-white shadow-sm transition hover:brightness-95">
                <span>{a.label}</span>
                <span aria-hidden="true" className="transition group-hover:translate-x-0.5">&rarr;</span>
              </button>
            ))}
          </div>
        ) : null}
        {m.suggestions?.length ? (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {m.suggestions.map((x) => (
              <button key={x} type="button" onClick={() => onPick(x)} className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-[12px] text-brand-navy transition hover:bg-black/5">
                {x}
              </button>
            ))}
          </div>
        ) : null}
      </div>
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
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
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

  return (
    <>
      <style>{`
        @keyframes amh-in{from{opacity:0;transform:translateY(12px) scale(.97)}to{opacity:1;transform:none}}
        @keyframes amh-dot{0%,80%,100%{opacity:.25;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}
        .amh-panel{animation:amh-in .22s ease-out;transform-origin:bottom right}
        .amh-dot{animation:amh-dot 1.1s infinite}
        @media (prefers-reduced-motion:reduce){.amh-panel,.amh-dot{animation:none}}
      `}</style>

      {open ? (
        <div role="dialog" aria-label="A.M International Help Assistant" className="amh-panel fixed bottom-20 right-3 z-[60] flex h-[min(600px,calc(100vh-7rem))] w-[min(400px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_20px_60px_-12px_rgba(0,0,0,.35)] sm:right-5">
          <div className="relative bg-brand-navy px-4 pb-4 pt-3.5 text-white">
            <div className="flex items-center gap-3">
              <Avatar size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold leading-5">A.M International Assistant</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-white/75">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                  Your guide to this admin panel
                </p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close help" className="flex h-8 w-8 items-center justify-center rounded-lg text-xl leading-none text-white/80 transition hover:bg-white/10">
                &times;
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-3.5 overflow-y-auto bg-white px-3.5 py-4" aria-live="polite">
            <div className="flex items-end gap-2">
              <Avatar />
              <div className="max-w-[88%] rounded-2xl rounded-bl-md bg-[#f3f2ee] px-3.5 py-3 text-[13px] leading-5 text-ink">
                <p className="font-semibold text-brand-navy">Hi, how can I help?</p>
                <p className="mt-1 text-ink/75">Ask me anything about managing your website, in English, Urdu or Roman Urdu. I will show you the exact page and steps, and open it for you.</p>
              </div>
            </div>

            {msgs.length === 0 ? (
              <div className="grid grid-cols-2 gap-2 ps-9">
                {QUICK.map((x) => (
                  <button key={x.label} type="button" onClick={() => send(x.q)} className="group flex flex-col items-start gap-1.5 rounded-xl border border-black/10 bg-white p-2.5 text-left text-[12px] font-medium leading-4 text-brand-navy transition hover:border-brand-orange hover:bg-brand-orange/5">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="text-brand-orange" aria-hidden="true">
                      <path d={x.icon} />
                    </svg>
                    {x.label}
                  </button>
                ))}
              </div>
            ) : null}

            {msgs.map((m, i) => (
              <Bubble key={i} m={m} onOpen={openAction} onPick={send} />
            ))}

            {busy ? (
              <div className="flex items-end gap-2">
                <Avatar />
                <p className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-[#f3f2ee] px-4 py-3" aria-label="Thinking">
                  {[0, 1, 2].map((d) => (
                    <span key={d} className="amh-dot h-1.5 w-1.5 rounded-full bg-brand-navy/60" style={{ animationDelay: `${d * 0.15}s` }} />
                  ))}
                </p>
              </div>
            ) : null}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="border-t border-black/5 bg-white p-2.5"
          >
            <div className="flex items-end gap-2 rounded-xl border border-black/10 bg-[#fafaf8] p-1.5 transition focus-within:border-brand-orange focus-within:ring-4 focus-within:ring-brand-orange/15">
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
                placeholder="Type your question..."
                aria-label="Your question"
                className="max-h-24 min-h-9 flex-1 resize-none bg-transparent px-2 py-2 text-[13px] text-ink outline-none placeholder:text-ink/40"
              />
              <button type="submit" disabled={busy || !text.trim()} aria-label="Send" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-orange text-white transition hover:brightness-95 disabled:opacity-40">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m5 12 14-7-5 14-2.5-5.5L5 12Z" />
                </svg>
              </button>
            </div>
            <p className="mt-1.5 text-center text-[10.5px] text-ink/40">Press Enter to send</p>
          </form>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close help" : "Open help assistant"}
        aria-expanded={open}
        className="fixed bottom-5 right-3 z-[60] flex h-12 items-center gap-2 rounded-full bg-brand-orange px-4 text-sm font-semibold text-white shadow-lg transition hover:scale-[1.03] active:scale-95 sm:right-5"
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
