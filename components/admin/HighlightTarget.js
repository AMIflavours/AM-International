"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// When the help bot opens a page it adds ?hl=<heading text>. This scrolls to that heading and makes its box glow.
export default function HighlightTarget() {
  const pathname = usePathname();
  const params = useSearchParams();
  const hl = params.get("hl");

  useEffect(() => {
    if (!hl) return;
    const needle = hl.trim().toLowerCase();
    let tries = 0;
    let cleanup = () => {};
    const timer = setInterval(() => {
      tries++;
      const nodes = document.querySelectorAll("main h1, main h2, main h3, main label, main legend, main p, main span");
      let hit = null;
      for (const el of nodes) {
        const text = (el.firstChild && el.firstChild.nodeType === 3 ? el.textContent : el.textContent || "").trim().toLowerCase();
        if (text && text.length < 120 && text.startsWith(needle) && el.getBoundingClientRect().height > 0) {
          hit = el;
          break;
        }
      }
      if (hit) {
        clearInterval(timer);
        const box = hit.closest("section, form, article, li") || hit.parentElement || hit;
        box.scrollIntoView({ behavior: "smooth", block: "center" });
        box.classList.add("adm-hl");
        const off = setTimeout(() => box.classList.remove("adm-hl"), 5000);
        cleanup = () => {
          clearTimeout(off);
          box.classList.remove("adm-hl");
        };
        try {
          const url = new URL(window.location.href);
          url.searchParams.delete("hl");
          window.history.replaceState(null, "", url.pathname + url.search + url.hash);
        } catch {}
      } else if (tries > 30) clearInterval(timer);
    }, 150);
    return () => {
      clearInterval(timer);
      cleanup();
    };
  }, [hl, pathname]);

  return (
    <style>{`
      .adm-hl{outline:3px solid #f28f3b;outline-offset:4px;border-radius:12px;animation:adm-hl-pulse 1.1s ease-in-out 4;scroll-margin:96px}
      @keyframes adm-hl-pulse{0%,100%{box-shadow:0 0 0 0 rgba(242,143,59,.45)}50%{box-shadow:0 0 0 12px rgba(242,143,59,0)}}
      @media (prefers-reduced-motion:reduce){.adm-hl{animation:none}}
    `}</style>
  );
}
