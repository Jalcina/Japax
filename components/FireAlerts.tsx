"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTr } from "@/lib/i18n";

export type DamageKind = "burning" | "ruptured" | "damaged" | "extinguished";

export interface FireAlertItem {
  id: string;
  /** already-translated component name */
  name: string;
  kind: DamageKind;
  /** burning: seconds on fire so far · ruptured: seconds from ignition to failure · damaged / extinguished: simulated time of the event */
  forS: number;
}

const MAX_SHOWN = 4;

const STYLE: Record<DamageKind, { border: string; badge: string; text: string; icon: string }> = {
  ruptured: { border: "border-red-500", badge: "bg-red-600", text: "text-red-400", icon: "‼" },
  burning: { border: "border-orange-500", badge: "bg-orange-500", text: "text-orange-400", icon: "⚠" },
  damaged: { border: "border-amber-400", badge: "bg-amber-500", text: "text-amber-300", icon: "!" },
  extinguished: { border: "border-zinc-500", badge: "bg-zinc-600", text: "text-zinc-300", icon: "!" },
};

/**
 * Pop-up tab over the simulator. It exists only while at least one component has damage of any severity
 * (burning, damaged by a neighbour's failure, ruptured, or already put out but harmed). The states come straight
 * from the engine, so with nothing harmed nothing is drawn. The tab can be folded to its header and re-opens by
 * itself when a new component gets damaged.
 */
export default function FireAlerts({ items, runKey }: { items: FireAlertItem[]; runKey: string }) {
  const { t } = useTr();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(true);
  const seen = useRef(0);
  useEffect(() => { setDismissed(new Set()); setOpen(true); seen.current = 0; }, [runKey]);

  const live = items.filter((i) => !dismissed.has(`${i.id}:${i.kind}`));
  useEffect(() => {
    if (live.length > seen.current) setOpen(true);
    seen.current = live.length;
  }, [live.length]);

  if (typeof document === "undefined" || !live.length) return null;
  const shown = live.slice(0, MAX_SHOWN);
  const more = live.length - shown.length;
  const hasRupture = live.some((i) => i.kind === "ruptured");
  const hasFire = live.some((i) => i.kind === "burning");

  return createPortal(
    <div
      role="alert"
      aria-live="assertive"
      className="pointer-events-none fixed right-3 top-20 z-[60] flex w-[min(22rem,calc(100vw-1.5rem))] flex-col gap-2"
      data-testid="fire-alerts"
    >
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`pointer-events-auto flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold uppercase tracking-wide text-white shadow-2xl ${hasRupture ? "bg-red-700" : hasFire ? "bg-orange-600" : "bg-amber-600"}`}
      >
        <span className="animate-pulse text-lg" aria-hidden="true">⚠</span>
        {hasRupture ? t("DANGER: rupture") : hasFire ? t("FIRE ALERT") : t("DAMAGE ALERT")}
        <span className="ml-auto rounded bg-black/30 px-2 py-0.5 text-xs tabular-nums">
          {t(live.length === 1 ? "{n} part damaged" : "{n} parts damaged", { n: live.length })}
        </span>
        <span aria-hidden="true" className="text-xs">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <>
          {shown.map((i) => {
            const s = STYLE[i.kind];
            const n = Math.round(i.forS);
            return (
              <div key={`${i.id}:${i.kind}`} className={`pointer-events-auto flex items-start gap-3 rounded-lg border-2 bg-zinc-950/95 p-3 shadow-2xl backdrop-blur ${s.border}`}>
                <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-md text-xl font-black text-white ${s.badge} ${i.kind === "burning" || i.kind === "ruptured" ? "animate-pulse" : ""}`} aria-hidden="true">
                  {s.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-[11px] font-bold uppercase tracking-wider ${s.text}`}>
                    {i.kind === "ruptured" ? t("! Ruptured !") : i.kind === "burning" ? t("! Burning !") : i.kind === "damaged" ? t("! Damaged !") : t("! Fire out, damage remains !")}
                  </p>
                  <p className="truncate text-sm font-semibold text-white">{i.name}</p>
                  <p className="text-xs text-zinc-400">
                    {i.kind === "ruptured" ? t("Failed {s} s after ignition", { s: n })
                      : i.kind === "burning" ? t("On fire for {s} s", { s: n })
                      : i.kind === "damaged" ? t("Damaged at t = {s} s", { s: n })
                      : t("Fire put out at t = {s} s", { s: n })}
                  </p>
                </div>
                <button
                  onClick={() => setDismissed((d) => new Set(d).add(`${i.id}:${i.kind}`))}
                  aria-label={t("Dismiss")}
                  className="rounded px-1.5 text-lg leading-none text-zinc-400 hover:text-white"
                >
                  ×
                </button>
              </div>
            );
          })}
          {more > 0 && (
            <p className="pointer-events-auto rounded-lg bg-zinc-950/95 px-3 py-1.5 text-center text-xs font-semibold text-orange-300">
              {t("+{n} more damaged parts", { n: more })}
            </p>
          )}
        </>
      )}
    </div>,
    document.body,
  );
}
