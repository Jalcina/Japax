"use client";

import { useT } from "@/lib/i18n";

const T = {
  en: { full: "Made with AI", short: "AI" },
  es: { full: "Hecho con IA", short: "IA" },
};

/**
 * Watermark for content that is backed by AI (the About video, Pax).
 * - "overlay": sits on a media box (the parent must be `relative`); never blocks the video controls.
 * - "chip": inline label.
 * - "compact": just "AI", for small spaces; screen readers still hear the full text.
 */
export default function AiBadge({
  variant = "chip",
  className = "",
}: {
  variant?: "overlay" | "chip" | "compact";
  className?: string;
}) {
  const t = useT(T);
  const base =
    "inline-flex select-none items-center gap-1 rounded-full border border-white/25 bg-black/60 px-2.5 py-1 text-[11px] font-medium leading-none tracking-wide text-white/90 backdrop-blur-sm";
  const pos = variant === "overlay" ? "pointer-events-none absolute left-3 top-3 z-10" : "";
  return (
    <span className={`${base} ${pos} ${className}`} title={t.full}>
      <span aria-hidden="true">✦ {variant === "compact" ? t.short : t.full}</span>
      <span className="sr-only">{t.full}</span>
    </span>
  );
}
