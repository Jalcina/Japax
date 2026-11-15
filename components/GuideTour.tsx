"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { TOUR, useGuide } from "@/lib/guide";
import { useT } from "@/lib/i18n";
import { GUIDE_T } from "@/lib/guideStops";
import PaxCharacter, { type PaxGesture } from "@/components/PaxCharacter";

type Box = { top: number; left: number; width: number; height: number };
const CARD_W = 360;
const GAP = 14;
/** Size of the big Pax standing beside the card (desktop only). */
const PAX = 176;

/** First visible element matching the selector. */
function findTarget(sel: string): HTMLElement | null {
  for (const el of Array.from(document.querySelectorAll<HTMLElement>(sel))) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

/** Reveals `text` a few characters at a time; Pax talks while it runs. */
function useTyped(text: string) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    const id = setInterval(() => {
      setN((v) => {
        if (v + 2 >= text.length) clearInterval(id);
        return Math.min(v + 2, text.length);
      });
    }, 24);
    return () => clearInterval(id);
  }, [text]);
  return { shown: text.slice(0, n), done: n >= text.length, skip: () => setN(text.length) };
}

/** Guided tour: a spotlight, a card that points at real parts of each page, and Pax beside it explaining each step. */
export default function GuideTour() {
  const { on, setOn, savePos, startAt, pendingPage, takeStart, finish, restart, epoch } = useGuide();
  const t = useT(GUIDE_T);
  const path = usePathname();
  const router = useRouter();
  const key = TOUR.find((p) => (p === "/" ? path === "/" : path.startsWith(p)));
  const steps = key ? t.steps[key] : undefined;
  const pageIdx = key ? TOUR.indexOf(key) : -1;

  const [i, setI] = useState(0);
  /** The page the tour has been set up for; until it matches, the tour stays hidden (e.g. while navigating to resume). */
  const [readyKey, setReadyKey] = useState<string | null>(null);
  const [resumed, setResumed] = useState(false);
  const [box, setBox] = useState<Box | null>(null);
  const [cardH, setCardH] = useState(220);
  const [gesture, setGesture] = useState<{ g: PaxGesture | null; key: number }>({ g: null, key: 0 });
  const [hidden, setHidden] = useState(false); // user scrolled: tip folds into the side button
  const [bump, setBump] = useState(0);
  const lockUntil = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const wasOn = useRef(false);

  // Landing on a tour page: open the requested step (resume / back from the next page) or the first one.
  useEffect(() => {
    if (!on || !key) return;
    // On our way to another page (resume, restart, back): don't flash or save this one.
    const pend = pendingPage();
    if (pend && pend !== key) return setReadyKey(null);
    const n = t.steps[key].length;
    const s = takeStart(key);
    const first = !wasOn.current;
    wasOn.current = true;
    setI(s === null ? 0 : s < 0 ? n - 1 : Math.min(s, n - 1));
    // Pax waves when the tour opens; the note only shows when it picks up mid-way.
    if (first) {
      setResumed(s !== null && (s > 0 || key !== TOUR[0]));
      setGesture((g) => ({ g: "hello", key: g.key + 1 }));
    } else setResumed(false);
    setReadyKey(key);
  }, [key, on, epoch]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!on) wasOn.current = false;
  }, [on]);

  useEffect(() => {
    setHidden(false);
  }, [i, key, on]);

  const step = steps?.[Math.min(i, (steps?.length ?? 1) - 1)];
  const active = on && !!step && readyKey === key;

  // Remember the position on every step, so leaving and coming back resumes here.
  useEffect(() => {
    if (active && key) savePos({ page: key, step: i });
  }, [active, key, i, savePos]);

  // Find the target (pages may render late), scroll it into view and keep its box fresh.
  useEffect(() => {
    if (!active || !step) return;
    let el: HTMLElement | null = null;
    let raf = 0;
    let tries = 0;
    let scrolled = false;
    const measure = () => {
      if (!el || !el.isConnected) el = findTarget(step.sel);
      if (el) {
        const r = el.getBoundingClientRect();
        // Tall targets (e.g. the timeline) are shown from their start; the spotlight covers just the top part.
        const tall = r.height > window.innerHeight * 0.6;
        const h = tall ? Math.min(r.height, 220) : r.height;
        if (!scrolled) {
          scrolled = true;
          const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
          lockUntil.current = performance.now() + 1400; // our own scrolling must not fold the tip
          if (tall) window.scrollTo({ top: window.scrollY + r.top - 110, behavior });
          else el.scrollIntoView({ block: "center", behavior });
        }
        setBox((b) => (b && Math.abs(b.top - r.top) < 0.5 && Math.abs(b.left - r.left) < 0.5 && Math.abs(b.width - r.width) < 0.5 && Math.abs(b.height - h) < 0.5 ? b : { top: r.top, left: r.left, width: r.width, height: h }));
      } else if (++tries > 40) setBox(null);
      raf = requestAnimationFrame(measure);
    };
    setBox(null);
    raf = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(raf);
  }, [active, step, bump]);

  // The user scrolls the page: fold the tip away so the content is free
  useEffect(() => {
    if (!active) return;
    let y = window.scrollY;
    const fold = () => setHidden(true);
    const onScroll = () => {
      const ny = window.scrollY;
      if (performance.now() > lockUntil.current && Math.abs(ny - y) > 30) fold();
      y = ny;
    };
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (["PageDown", "PageUp", "Home", "End", " "].includes(e.key)) fold();
    };
    window.addEventListener("wheel", fold, { passive: true });
    window.addEventListener("touchmove", fold, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", fold);
      window.removeEventListener("touchmove", fold);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("keydown", onKey);
    };
  }, [active, i, key]);

  // Pax reads the step out: the text types in while its mouth moves.
  const typed = useTyped(active && step ? step.body : "");
  const talking = active && !typed.done;

  useLayoutEffect(() => {
    if (cardRef.current) setCardH(cardRef.current.offsetHeight);
  }, [i, key, active, t, resumed]);

  useEffect(() => {
    if (active) nextRef.current?.focus({ preventScroll: true });
  }, [active, i, key]);

  const nextPage = pageIdx >= 0 && pageIdx < TOUR.length - 1 ? TOUR[pageIdx + 1] : null;
  const prevPage = pageIdx > 0 ? TOUR[pageIdx - 1] : null;

  const goNext = useCallback(() => {
    if (!steps) return;
    setResumed(false);
    if (i < steps.length - 1) setI(i + 1);
    else if (nextPage) router.push(nextPage);
    else finish();
  }, [i, steps, nextPage, router, finish]);

  const goBack = useCallback(() => {
    setResumed(false);
    if (i > 0) setI(i - 1);
    else if (prevPage) {
      // Going back a page lands on that page's last step, not its first.
      startAt({ page: prevPage, step: -1 });
      router.push(prevPage);
    }
  }, [i, prevPage, router, startAt]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOn(false);
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, goNext, goBack, setOn]);

  if (!active || !steps || !step || !key) return null;

  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const vh = typeof window !== "undefined" ? window.innerHeight : 768;
  const mobile = vw < 640;
  const pad = 6;

  // Card position: below the target if it fits, else above, else docked at the bottom.
  let style: React.CSSProperties;
  let arrow: "up" | "down" | null = null;
  let cardLeft = 0;
  let cardTop = 0;
  if (mobile || !box) {
    style = mobile ? { left: 8, right: 8, bottom: 88 } : { left: "50%", bottom: 24, transform: "translateX(-50%)", width: CARD_W };
    cardLeft = (vw - CARD_W) / 2;
    cardTop = vh - 24 - cardH;
  } else {
    const below = box.top + box.height + pad + GAP;
    const above = box.top - pad - GAP - cardH;
    let top: number;
    if (below + cardH <= vh - 8) { top = below; arrow = "up"; }
    else if (above >= 8) { top = above; arrow = "down"; }
    else top = Math.max(8, vh - cardH - 24);
    cardLeft = Math.min(Math.max(8, box.left + box.width / 2 - CARD_W / 2), vw - CARD_W - 8);
    cardTop = top;
    style = { top, left: cardLeft, width: CARD_W };
  }
  const arrowLeft = box ? Math.min(Math.max(20, box.left + box.width / 2 - cardLeft), CARD_W - 20) : 0;
  const progress = ((pageIdx + (i + 1) / steps.length) / TOUR.length) * 100;
  const last = !nextPage && i === steps.length - 1;
  const nextLabel = i < steps.length - 1 ? t.next : nextPage ? t.nextPage(t.pageNames[nextPage]) : t.finish;
  const atStart = pageIdx === 0 && i === 0;

  // Big Pax stands on whichever side of the card has room; on phones it stays small inside the card.
  const paxSide: "left" | "right" | null = mobile ? null : cardLeft >= PAX + 8 ? "left" : cardLeft + CARD_W + PAX + 8 <= vw ? "right" : null;
  const paxCx = paxSide === "left" ? cardLeft - PAX / 2 : cardLeft + CARD_W + PAX / 2;
  const paxCy = cardTop + Math.min(cardH, PAX) / 2;
  // Pax looks at what the spotlight is showing.
  const look = box ? { x: (box.left + box.width / 2 - paxCx) / 300, y: (box.top + box.height / 2 - paxCy) / 300 } : { x: paxSide === "left" ? 0.6 : -0.6, y: 0 };

  if (hidden) {
    const btn = "block w-full whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm";
    return (
      <div role="group" aria-label={t.tourMenu} className="pax-pop fixed left-0 top-1/2 z-[70] w-56 -translate-y-1/2 rounded-r-2xl border border-l-0 border-line-2 bg-surface p-2 shadow-2xl">
        <div className="mb-1 flex items-center gap-2 px-1.5 pb-1">
          <PaxCharacter size={28} talking={false} />
          <span className="text-xs font-semibold">{t.tour}</span>
          <span className="ml-auto text-[11px] text-muted">{t.page(pageIdx + 1, TOUR.length)}</span>
        </div>
        <button onClick={() => { setHidden(false); setBump((b) => b + 1); }} className={`${btn} border border-accent/50 bg-accent/15 font-semibold hover:bg-accent/25`}>{t.showTip}</button>
        <button onClick={goNext} className={`${btn} mt-1.5 bg-accent font-semibold text-black hover:brightness-110`}>{last ? t.finish : nextLabel}</button>
        <button onClick={() => setOn(false)} className={`${btn} mt-1.5 border border-line-2 text-ink-2 hover:bg-surface-2 hover:text-ink`}>{t.skip}</button>
      </div>
    );
  }

  return (
    <>
      {box && (
        <div aria-hidden="true" className="pointer-events-none fixed z-[60] rounded-xl border-2 border-accent transition-all duration-300"
          style={{ top: box.top - pad, left: box.left - pad, width: box.width + pad * 2, height: box.height + pad * 2, boxShadow: "0 0 0 9999px rgba(5,7,10,0.66)" }} />
      )}
      {!box && <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[60] bg-[#05070a]/60" />}

      <div ref={cardRef} role="dialog" aria-label={step.title} style={style}
        className="fixed z-[70] rounded-2xl border border-line-2 bg-surface p-4 shadow-2xl">
        {arrow && !mobile && (
          <span aria-hidden="true" className="absolute h-3 w-3 rotate-45 border-line-2 bg-surface"
            style={arrow === "up" ? { top: -7, left: arrowLeft - 6, borderTopWidth: 1, borderLeftWidth: 1 } : { bottom: -7, left: arrowLeft - 6, borderBottomWidth: 1, borderRightWidth: 1 }} />
        )}

        {paxSide && (
          <>
            {/* speech nub: the card is what Pax is saying */}
            <span aria-hidden="true" className="absolute h-3.5 w-3.5 rotate-45 border-line-2 bg-surface"
              style={paxSide === "left" ? { left: -8, top: Math.min(cardH, PAX) / 2 - 7, borderBottomWidth: 1, borderLeftWidth: 1 } : { right: -8, top: Math.min(cardH, PAX) / 2 - 7, borderTopWidth: 1, borderRightWidth: 1 }} />
            <div aria-hidden="true" className="pointer-events-none absolute" style={{ top: Math.min(cardH, PAX) / 2 - PAX / 2, ...(paxSide === "left" ? { right: "100%", marginRight: 2 } : { left: "100%", marginLeft: 2 }) }}>
              <PaxCharacter size={PAX} talking={talking} mood={last ? "happy" : "idle"} look={look} gesture={gesture.g} gestureKey={gesture.key} />
            </div>
          </>
        )}

        <div className="mb-3 flex items-center gap-3">
          {!paxSide && <PaxCharacter talking={talking} size={46} minimal className="-my-1.5 shrink-0" />}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{t.pageNames[key]} · {t.step(i + 1, steps.length)}</p>
            <h2 className="text-base font-semibold leading-tight">{step.title}</h2>
          </div>
          <button onClick={() => setOn(false)} aria-label={t.skip} className="self-start rounded-md px-1.5 py-0.5 text-ink-2 hover:text-ink">✕</button>
        </div>

        {resumed && <p className="mb-2 rounded-lg border border-flame/30 bg-flame/10 px-3 py-1.5 text-xs text-ink">{t.resumed}</p>}

        {/* The full text reserves the space so the card does not grow while Pax "types"; click to show it all. */}
        <p className="grid cursor-text text-sm leading-relaxed text-ink-2" onClick={typed.skip}>
          <span className="invisible col-start-1 row-start-1" aria-hidden="true">{step.body}</span>
          <span className="col-start-1 row-start-1" aria-hidden="true">{typed.shown}</span>
          <span className="sr-only">{step.body}</span>
        </p>
        {step.tryIt && (
          <p className="mt-3 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm">
            <span className="font-semibold text-accent">{t.tryLabel}:</span> {step.tryIt}
          </p>
        )}
        <div className="mt-4 flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-label={t.page(pageIdx + 1, TOUR.length)} aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-accent transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[11px] text-muted">{t.page(pageIdx + 1, TOUR.length)}</span>
          {!atStart && <button onClick={restart} className="text-[11px] text-muted underline-offset-2 hover:text-ink hover:underline">{t.restart}</button>}
          <button onClick={() => setOn(false)} className="ml-auto text-xs text-ink-2 underline-offset-2 hover:text-ink hover:underline">{t.skip}</button>
          {(i > 0 || prevPage) && <button onClick={goBack} className="rounded-lg border border-line-2 px-3 py-1.5 text-xs text-ink-2 hover:text-ink">{t.back}</button>}
          <button ref={nextRef} onClick={goNext} className="rounded-lg bg-accent px-3.5 py-1.5 text-xs font-semibold text-black hover:brightness-110">{last ? t.finish : nextLabel}</button>
        </div>
      </div>
    </>
  );
}
