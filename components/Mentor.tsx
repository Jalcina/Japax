"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useGuide } from "@/lib/guide";
import { setPaxMood, usePaxMood } from "@/lib/paxMood";
import { useLang, useT } from "@/lib/i18n";
import PaxCharacter from "@/components/PaxCharacter";
import { openAsk } from "@/components/AskWindow";

const NAME = "Pax";
const IDLE_MS = 60_000;
const SEEN_KEY = "japax-pax-seen";

/** Per-page nudge: what Pax offers to explain here, and the question it opens in the Ask window. */
const HINTS: Record<string, { en: [string, string]; es: [string, string] }> = {
  "/simulator": { en: ["Not sure what the verdict means?", "How should I read the simulator verdict?"], es: ["¿No tienes claro qué significa el veredicto?", "¿Cómo debo leer el veredicto del simulador?"] },
  "/lab": { en: ["Curious how the nearest tests are chosen?", "What happens when my conditions are outside the measured range?"], es: ["¿Quieres saber cómo se eligen los ensayos más cercanos?", "¿Qué pasa cuando mis condiciones quedan fuera del rango medido?"] },
  "/explorer": { en: ["Lost among the investigations?", "Which NASA investigations matter most for the Moon?"], es: ["¿Perdido entre las investigaciones?", "¿Qué investigaciones de NASA importan más para la Luna?"] },
  "/dashboard": { en: ["Want to know how scores are built?", "What fire data exists for the Moon or Mars?"], es: ["¿Quieres saber cómo se calculan las puntuaciones?", "¿Qué datos de fuego existen para la Luna o Marte?"] },
  "/history": { en: ["Want the story behind an incident?", "Tell me about Apollo 1, Apollo 13 and Mir"], es: ["¿Quieres la historia detrás de un incidente?", "Cuéntame lo de Apollo 1, Apollo 13 y Mir"] },
  "/safety": { en: ["Questions about fire safety?", "Which suppressants were tested and how did the flames end?"], es: ["¿Dudas sobre seguridad contra incendios?", "¿Qué supresores se ensayaron y cómo terminaron las llamas?"] },
};

const T = {
  en: {
    hello: `Hi, I am ${NAME}. I can explain anything on this site, or guide you through it step by step.`,
    open: `Open ${NAME}, the JaPax mentor`,
    close: "Close",
    ask: "Ask Pax a question",
    askSub: "Technical answers grounded in the PSI/NTRS corpus",
    tour: "Start the guided tour",
    tourSub: "I will point out each part of the page as we go",
    stop: "Stop the tour",
    sleeping: "Pax is asleep. Click to wake Pax up",
    bubbleAria: "What Pax can do",
    bubbleHi: "Hi, I'm Pax, your guide!",
    bubbleLead: "I can help you:",
    svcAsk: "Ask me anything",
    svcTour: "Take a guided tour",
    svcTourResume: "Continue the guided tour",
    tourResume: "Continue the guided tour",
    tourResumeSub: "I will pick up right where you left off",
    hintLead: "Tap below and I will explain it:",
    hintBtn: "Explain this to me",
  },
  es: {
    hello: `Hola, soy ${NAME}. Puedo explicarte cualquier cosa de esta web o guiarte paso a paso.`,
    open: `Abrir a ${NAME}, el mentor de JaPax`,
    close: "Cerrar",
    ask: "Hacer una pregunta a Pax",
    askSub: "Respuestas técnicas basadas en el corpus PSI/NTRS",
    tour: "Empezar el recorrido guiado",
    tourSub: "Te señalo cada parte de la página a medida que avanzamos",
    stop: "Terminar el recorrido",
    sleeping: "Pax está dormido. Pulsa para despertarlo",
    bubbleAria: "Lo que Pax puede hacer",
    bubbleHi: "¡Hola, soy Pax, tu guía!",
    bubbleLead: "Puedo ayudarte a:",
    svcAsk: "Preguntarme lo que sea",
    svcTour: "Hacer un recorrido guiado",
    svcTourResume: "Continuar el recorrido guiado",
    tourResume: "Continuar el recorrido guiado",
    tourResumeSub: "Seguimos justo donde lo dejaste",
    hintLead: "Pulsa abajo y te lo explico:",
    hintBtn: "Explícamelo",
  },
};

/** Reveals `text` gradually; the mouth moves while it runs. */
function useTyped(text: string) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!text) {
      setN(0);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setN(text.length);
      return;
    }
    setN(0);
    const id = setInterval(() => {
      setN((v) => {
        if (v + 2 >= text.length) clearInterval(id);
        return Math.min(v + 2, text.length);
      });
    }, 22);
    return () => clearInterval(id);
  }, [text]);
  return { shown: text.slice(0, n), done: n >= text.length };
}

export default function Mentor() {
  const t = useT(T);
  const { lang } = useLang();
  const path = usePathname();
  const mood = usePaxMood();
  const { on, setOn, hasProgress } = useGuide();
  const [open, setOpen] = useState(false);
  const [asleep, setAsleep] = useState(false);
  const [tick, setTick] = useState(0);
  const [seen, setSeen] = useState(false);

  // Returning visitors skip the full greeting; Pax only offers the page-specific nudge.
  useEffect(() => {
    try {
      setSeen(localStorage.getItem(SEEN_KEY) === "1");
    } catch {}
  }, []);
  const markSeen = () => {
    setSeen(true);
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {}
  };
  const hint = HINTS[path]?.[lang];

  // No interaction with Pax for 1 minute (menu closed, tour off): Pax falls asleep.
  useEffect(() => {
    if (asleep || open || on) return;
    const id = setTimeout(() => setAsleep(true), IDLE_MS);
    return () => clearTimeout(id);
  }, [asleep, open, on, tick]);
  const wake = () => {
    if (asleep) setPaxMood("surprised", 1400); // startled awake
    setAsleep(false);
    setTick((x) => x + 1);
  };
  // Starting the tour cheers Pax up
  const toggleTour = () => {
    if (!on) setPaxMood("happy", 2500);
    setOn(!on);
  };

  const speech = open ? t.hello : "";
  const { shown, done } = useTyped(speech);
  const talking = !!speech && !done;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const svc = "block w-full rounded-lg border border-line-2 px-2.5 py-1 text-left text-xs transition-colors hover:bg-surface-2";
  const item = "block w-full rounded-xl border border-line-2 px-3 py-2.5 text-left transition-colors hover:bg-surface-2";

  // The new model leaves room around the planet for its ring and flame, so the canvas is a bit larger.
  const size = open ? 104 : asleep ? 112 : 140;
  const tailH = Math.round(size * 0.18 + 9);
  const bubble = "pax-pop relative max-w-[calc(100vw-2rem)] rounded-2xl border border-accent/40 bg-surface shadow-2xl";
  // tail: the speech bubble hangs from Pax's head
  const tail = (
    <svg aria-hidden="true" className="pointer-events-none absolute" style={{ right: size / 2 + 4 - 11, top: "calc(100% - 1px)", width: 22, height: tailH }} viewBox={`0 0 22 ${tailH}`}>
      <path d={`M0 0 L11 ${tailH} L22 0`} style={{ fill: "var(--surface)" }} stroke="rgba(255,138,76,0.4)" strokeWidth="1" />
    </svg>
  );

  return (
    <div onPointerEnter={wake} onPointerDown={wake} onFocus={wake} className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      <div>
        {open && (
          <section role="dialog" aria-label={NAME} className={`${bubble} w-[18rem] p-3`}>
            {tail}
            <div className="flex items-start gap-2">
              <p className="min-h-[2.5rem] flex-1 text-sm leading-relaxed" aria-live="polite">{shown}</p>
              <button onClick={() => setOpen(false)} aria-label={t.close} className="rounded-md px-1.5 py-0.5 text-ink-2 hover:text-ink">✕</button>
            </div>
            <div className="mt-2 space-y-2">
              <button onClick={() => { setOpen(false); openAsk(); }} className={`${item} border-accent/40 bg-accent/10`}>
                <span className="block text-sm font-semibold">{t.ask}</span>
                <span className="block text-xs text-ink-2">{t.askSub}</span>
              </button>
              <button onClick={() => { setOpen(false); toggleTour(); }} className={item}>
                <span className="block text-sm font-semibold">{on ? t.stop : hasProgress ? t.tourResume : t.tour}</span>
                {!on && <span className="block text-xs text-ink-2">{hasProgress ? t.tourResumeSub : t.tourSub}</span>}
              </button>
            </div>
          </section>
        )}

        {!open && asleep && (
          <button onClick={wake} aria-label={t.sleeping} className={`${bubble} flex w-[7.5rem] items-baseline justify-center gap-0.5 py-2 font-semibold leading-none text-accent`}>
            {tail}
            <span className="pax-z text-base" style={{ animationDelay: "0s" }}>z</span>
            <span className="pax-z text-xl" style={{ animationDelay: "0.4s" }}>z</span>
            <span className="pax-z text-2xl" style={{ animationDelay: "0.8s" }}>Z</span>
          </button>
        )}

        {!open && !asleep && (
          <section aria-label={t.bubbleAria} className={`${bubble} w-[13.5rem] p-3`}>
            {tail}
            <p className="text-sm font-semibold leading-snug">{seen && hint ? hint[0] : t.bubbleHi}</p>
            <p className="mt-0.5 text-xs text-ink-2">{seen && hint ? t.hintLead : t.bubbleLead}</p>
            <div className="mt-2 space-y-1.5">
              <button onClick={() => { markSeen(); openAsk(hint?.[1]); }} className={`${svc} border-accent/50 bg-accent/15`}>{hint ? t.hintBtn : t.svcAsk}</button>
              <button onClick={toggleTour} className={svc}>{on ? t.stop : hasProgress ? t.svcTourResume : t.svcTour}</button>
            </div>
          </section>
        )}
      </div>

      <div className="relative">
        <button data-pax onPointerEnter={() => !asleep && mood === "idle" && setPaxMood("happy", 1500)} onClick={() => { markSeen(); setOpen((v) => !v); }} aria-label={t.open} aria-expanded={open} className="block rounded-full p-1 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-accent">
          <PaxCharacter talking={talking} mood={asleep && !open ? "sleeping" : mood} size={size} />
        </button>
      </div>
    </div>
  );
}
