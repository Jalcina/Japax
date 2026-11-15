"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

/** The guided tour: one stop per page, in a logical learning order. */
export const TOUR = ["/", "/history", "/simulator", "/explorer", "/dashboard", "/references"] as const;

/** Where the visitor is in the tour. step -1 = the last step of that page (used when going back a page). */
export type GuidePos = { page: string; step: number };

const ON_KEY = "japax-guide";
const POS_KEY = "japax-guide-pos";

function readPos(): GuidePos | null {
  try {
    const p = JSON.parse(localStorage.getItem(POS_KEY) ?? "null");
    return p && (TOUR as readonly string[]).includes(p.page) && Number.isInteger(p.step) ? p : null;
  } catch {
    return null;
  }
}

interface Ctx {
  on: boolean;
  /** Turning it on resumes where the visitor left off (or starts at the beginning). */
  setOn: (v: boolean) => void;
  /** True when a tour was left half-way and can be resumed. */
  hasProgress: boolean;
  /** Remember the current position (called by the tour on every step). */
  savePos: (p: GuidePos) => void;
  /** Ask the tour to open `step` (-1 = last) when it next lands on `page`. */
  startAt: (p: GuidePos) => void;
  /** Page the tour is navigating to (resume / restart / back), or null. The tour waits until it gets there. */
  pendingPage: () => string | null;
  /** The step to open on `page`, consumed once; null = first step. */
  takeStart: (page: string) => number | null;
  /** Tour completed: close it and forget the position, so the next tour starts from the beginning. */
  finish: () => void;
  /** Start again from the first step of the first page. */
  restart: () => void;
  /** Bumped by restart(), so the tour re-reads its start even on the same page. */
  epoch: number;
}
const GuideContext = createContext<Ctx>({
  on: false,
  setOn: () => {},
  hasProgress: false,
  savePos: () => {},
  startAt: () => {},
  pendingPage: () => null,
  takeStart: () => null,
  finish: () => {},
  restart: () => {},
  epoch: 0,
});

export function GuideProvider({ children }: { children: ReactNode }) {
  const [on, setOnState] = useState(false);
  const [hasProgress, setHasProgress] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const start = useRef<GuidePos | null>(null);
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    try {
      const pos = readPos();
      setHasProgress(!!pos);
      if (localStorage.getItem(ON_KEY) === "1") {
        start.current = pos; // a reload mid-tour keeps the current step
        setOnState(true);
      }
    } catch {}
  }, []);

  const persistOn = (v: boolean) => {
    try {
      localStorage.setItem(ON_KEY, v ? "1" : "0");
    } catch {}
  };

  const setOn = useCallback(
    (v: boolean) => {
      if (v && !on) {
        // Resume where the visitor left off; a first tour starts at the beginning.
        const pos = readPos() ?? { page: TOUR[0], step: 0 };
        start.current = pos;
        if (path !== pos.page) router.push(pos.page);
      }
      setOnState(v);
      persistOn(v);
    },
    [on, path, router],
  );

  const savePos = useCallback((p: GuidePos) => {
    try {
      localStorage.setItem(POS_KEY, JSON.stringify(p));
    } catch {}
    setHasProgress(true);
  }, []);

  const startAt = useCallback((p: GuidePos) => {
    start.current = p;
  }, []);

  const pendingPage = useCallback(() => start.current?.page ?? null, []);

  const takeStart = useCallback((page: string) => {
    const s = start.current;
    if (!s || s.page !== page) return null;
    start.current = null;
    return s.step;
  }, []);

  const forget = () => {
    try {
      localStorage.removeItem(POS_KEY);
    } catch {}
    setHasProgress(false);
  };

  const finish = useCallback(() => {
    forget();
    setOnState(false);
    persistOn(false);
  }, []);

  const restart = useCallback(() => {
    forget();
    start.current = { page: TOUR[0], step: 0 };
    if (path !== TOUR[0]) router.push(TOUR[0]);
    setOnState(true);
    persistOn(true);
    setEpoch((e) => e + 1);
  }, [path, router]);

  return (
    <GuideContext.Provider value={{ on, setOn, hasProgress, savePos, startAt, pendingPage, takeStart, finish, restart, epoch }}>{children}</GuideContext.Provider>
  );
}

export const useGuide = () => useContext(GuideContext);
