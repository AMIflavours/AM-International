"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// "Reset to original" area shown at the very bottom of an admin page.
// Every reset needs two confirmations (two steps), so it cannot happen by accident.
//
// items: [{ id, label, description, confirm1, confirm2, onConfirm, disabled }] (falsy entries are skipped)
export default function ResetZone({ items, heading = "Reset to original" }) {
  const [active, setActive] = useState(null);
  const list = (items || []).filter(Boolean);
  if (!list.length) return null;

  return (
    <section className="mt-10 rounded-xl border border-red-200 bg-white p-5" aria-labelledby="reset-zone-heading">
      <h2 id="reset-zone-heading" className="text-base font-semibold text-red-700">{heading}</h2>
      <p className="mt-1 text-sm text-ink/60">Brings back the original website content. You will be asked twice before anything changes.</p>
      <ul className="mt-4 divide-y divide-black/5">
        {list.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <p className="min-w-0 flex-1 text-sm text-ink/80">{item.description}</p>
            <button
              type="button"
              disabled={item.disabled}
              onClick={() => setActive(item)}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
      {active ? <ConfirmSteps item={active} onClose={() => setActive(null)} /> : null}
    </section>
  );
}

function ConfirmSteps({ item, onClose }) {
  const [step, setStep] = useState(1);
  const cancelRef = useRef(null);
  const boxRef = useRef(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // The safe button gets the focus on each step. Escape cancels. Tab stays inside the box.
  useEffect(() => {
    cancelRef.current?.focus();
  }, [step]);
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
      } else if (e.key === "Tab" && boxRef.current) {
        const focusable = boxRef.current.querySelectorAll("button:not([disabled])");
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

  if (typeof document === "undefined") return null;

  const final = step === 2;
  return createPortal(
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4" role="presentation">
      <div className="absolute inset-0 bg-black/55" onClick={onClose} aria-hidden="true" />
      <div ref={boxRef} role="alertdialog" aria-modal="true" aria-labelledby="reset-confirm-title" aria-describedby="reset-confirm-text" className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <p className="text-xs font-medium uppercase tracking-wide text-ink/50">Confirmation {step} of 2</p>
        <h2 id="reset-confirm-title" className="mt-1 text-lg font-semibold text-ink">
          {final ? "Are you absolutely sure?" : item.label}
        </h2>
        <p id="reset-confirm-text" className="mt-2 text-sm leading-relaxed text-ink/70">
          {final
            ? item.confirm2 || "This cannot be undone. Your changes will be removed and the original content will come back."
            : item.confirm1 || "Your changes will be removed and the original content will come back."}
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button ref={cancelRef} type="button" onClick={onClose} className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium text-ink transition hover:bg-black/5">
            {final ? "No, keep my changes" : "Cancel"}
          </button>
          {final ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                item.onConfirm();
              }}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
            >
              Yes, reset now
            </button>
          ) : (
            <button type="button" onClick={() => setStep(2)} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700">
              Yes, continue
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
