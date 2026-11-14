"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Lang } from "./data";

// Friendly-sounding system voices, best first. Falls back to any voice for the language.
const PREFERRED: Record<Lang, string[]> = {
  en: ["Samantha", "Google US English", "Microsoft Aria", "Microsoft Jenny", "Karen", "Serena"],
  es: ["Mónica", "Monica", "Paulina", "Google español", "Microsoft Elvira", "Microsoft Helena"],
};

function pickVoice(voices: SpeechSynthesisVoice[], lang: Lang): SpeechSynthesisVoice | null {
  for (const name of PREFERRED[lang]) {
    const v = voices.find((x) => x.name.includes(name));
    if (v) return v;
  }
  return voices.find((v) => v.lang.toLowerCase().startsWith(lang)) ?? null;
}

/**
 * Pax's voice via the browser's Web Speech API (free, no key).
 * `mouth` is true while a word is being voiced, so pauses at commas and full stops close the mouth.
 * `progress` is the character index reached, or null if the browser gives no word timing.
 */
export function usePaxVoice() {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [mouth, setMouth] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const voices = useRef<SpeechSynthesisVoice[]>([]);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null); // keeps it alive (Chrome GC bug)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    setSupported(true);
    const load = () => (voices.current = synth.getVoices());
    load();
    synth.addEventListener("voiceschanged", load);
    return () => {
      synth.removeEventListener("voiceschanged", load);
      synth.cancel();
      clearTimers();
    };
  }, []);

  const stop = useCallback(() => {
    if (!("speechSynthesis" in window)) return;
    utterance.current = null;
    window.speechSynthesis.cancel();
    clearTimers();
    setSpeaking(false);
    setMouth(false);
  }, []);

  const speak = useCallback((text: string, { lang = "en", onEnd }: { lang?: Lang; onEnd?: () => void } = {}) => {
    if (!("speechSynthesis" in window)) return false;
    const synth = window.speechSynthesis;
    synth.cancel();
    clearTimers();

    const u = new SpeechSynthesisUtterance(text);
    const voice = pickVoice(voices.current, lang);
    if (voice) u.voice = voice;
    u.lang = voice?.lang ?? (lang === "es" ? "es-ES" : "en-US");
    u.pitch = 1.3; // a little brighter: Pax is small and cheerful
    u.rate = 1.02;

    let gotBoundary = false;
    let closeTimer: ReturnType<typeof setTimeout> | undefined;

    u.onstart = () => {
      setSpeaking(true);
      setProgress(null);
      // Some voices never emit word boundaries: then just keep the mouth moving.
      timers.current.push(setTimeout(() => !gotBoundary && setMouth(true), 450));
    };
    u.onboundary = (e) => {
      if (e.name !== "word") return;
      gotBoundary = true;
      const wordLen = e.charLength || (text.slice(e.charIndex).match(/^\S+/)?.[0].length ?? 4);
      setProgress(e.charIndex + wordLen);
      setMouth(true);
      if (closeTimer) clearTimeout(closeTimer);
      closeTimer = setTimeout(() => setMouth(false), Math.min(480, Math.max(170, wordLen * 75)));
      timers.current.push(closeTimer);
    };
    // Only the current utterance may update state: cancel() fires late events on the old one.
    const finish = (completed: boolean) => {
      if (utterance.current !== u) return;
      utterance.current = null;
      clearTimers();
      setSpeaking(false);
      setMouth(false);
      if (completed) {
        setProgress(text.length);
        onEnd?.();
      }
    };
    u.onend = () => finish(true);
    u.onerror = (e) => finish(e.error !== "interrupted" && e.error !== "canceled");

    utterance.current = u;
    synth.speak(u);
    return true;
  }, []);

  return { supported, speaking, mouth, progress, speak, stop };
}
