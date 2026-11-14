"use client";

import { useEffect, useState } from "react";
import type { PaxCharacterMood as PaxMood } from "@/components/PaxCharacter";

const EVENT = "pax:mood";

/** Sets Pax's mood from anywhere. A non-idle mood falls back to idle after `ms` (0 = stay until changed). */
export function setPaxMood(mood: PaxMood, ms = 0) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { mood, ms } }));
}

/** Current mood, driven by setPaxMood(). */
export function usePaxMood(): PaxMood {
  const [mood, setMood] = useState<PaxMood>("idle");
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ mood: PaxMood; ms: number }>).detail;
      clearTimeout(timer);
      setMood(d.mood);
      if (d.mood !== "idle" && d.ms > 0) timer = setTimeout(() => setMood("idle"), d.ms);
    };
    window.addEventListener(EVENT, on);
    return () => {
      window.removeEventListener(EVENT, on);
      clearTimeout(timer);
    };
  }, []);
  return mood;
}
