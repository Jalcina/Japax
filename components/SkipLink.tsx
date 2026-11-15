"use client";

import { useT } from "@/lib/i18n";

const T = {
  en: { skip: "Skip to content" },
  es: { skip: "Saltar al contenido" },
};

/** First focusable element on every page (WCAG 2.4.1): jumps past the navigation to <main id="main">. */
export default function SkipLink() {
  const t = useT(T);
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-black"
    >
      {t.skip}
    </a>
  );
}
