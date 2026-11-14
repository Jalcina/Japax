"use client";

import { useEffect, useRef, useState } from "react";
import PaxCharacter, { type PaxCharacterMood, type PaxGesture } from "@/components/PaxCharacter";
import { useLang } from "@/lib/i18n";
import { usePaxVoice } from "@/lib/paxVoice";

const MOODS: { mood: PaxCharacterMood; label: string; use: string }[] = [
  { mood: "idle", label: "Idle", use: "Default state, always visible in the corner." },
  { mood: "happy", label: "Happy", use: "Greeting, correct answers, finished tours." },
  { mood: "thinking", label: "Thinking", use: "While the AI is composing an answer." },
  { mood: "surprised", label: "Surprised", use: "Striking data: \"40% more flammable!\"" },
  { mood: "worried", label: "Worried", use: "Fire-risk warnings and historical incidents." },
  { mood: "sleeping", label: "Sleeping", use: "After a while without interaction." },
];

const PALETTE = [
  { hex: "#ffe0bd", name: "Sunlit peach", role: "Highlight" },
  { hex: "#ff8a4c", name: "JaPax coral", role: "Body" },
  { hex: "#c4552a", name: "Rust", role: "Shadow side" },
  { hex: "#5aa3ff", name: "Flame blue", role: "Ring & companion" },
  { hex: "#ff5f7a", name: "Blush", role: "Cheeks" },
  { hex: "#2a1408", name: "Cocoa ink", role: "Eyes & lines" },
];

const INTRO = {
  en: "Hi! I'm Pax, your little planet guide. Any question about fire in space? Just ask me!",
  es: "¡Hola! Soy Pax, tu pequeño planeta guía. ¿Alguna duda sobre el fuego en el espacio? ¡Pregúntame!",
};

const GESTURES: { g: PaxGesture; label: string }[] = [
  { g: "hello", label: "👋 Hello" },
  { g: "spin", label: "✦ Spin" },
  { g: "oops", label: "! Oops" },
];

export default function CharacterPage() {
  const { lang } = useLang();
  const voice = usePaxVoice();
  const [mood, setMood] = useState<PaxCharacterMood>("idle");
  const [loop, setLoop] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [mode, setMode] = useState<"voice" | "text" | null>(null);
  const [line, setLine] = useState("");
  const [typed, setTyped] = useState("");
  const [typerTalking, setTyperTalking] = useState(false);
  const [gesture, setGesture] = useState<{ g: PaxGesture | null; key: number }>({ g: null, key: 0 });
  const [look, setLook] = useState({ x: 0, y: 0 });
  const stageRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const play = (g: PaxGesture) => setGesture((s) => ({ g, key: s.key + 1 }));

  // First visit ever: Pax drops in and waves hello.
  useEffect(() => {
    try {
      if (!localStorage.getItem("pax-greeted")) {
        localStorage.setItem("pax-greeted", "1");
        setGesture({ g: "hello", key: 1 });
      }
    } catch {
      /* storage unavailable: skip the greeting */
    }
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const r = stageRef.current?.getBoundingClientRect();
      if (!r) return;
      const x = (e.clientX - (r.left + r.width / 2)) / (r.width / 1.2);
      const y = (e.clientY - (r.top + r.height / 2)) / (r.height / 1.2);
      setLook({ x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) });
    };
    window.addEventListener("pointermove", onMove);
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const playIntro = () => {
    if (timer.current) clearTimeout(timer.current);
    voice.stop();
    const text = INTRO[lang];
    const withVoice = voiceOn && voice.supported;
    setLine(text);
    setMood("happy");
    setTyped("");
    setMode(withVoice ? "voice" : "text");
    setTyperTalking(!withVoice);
    play("hello");
    if (withVoice) voice.speak(text, { lang });

    // Typewriter: drives the subtitle in text mode, and is the fallback when the voice gives no word timing.
    const base = withVoice ? 62 : 38;
    let i = 0;
    const tick = () => {
      i += 1;
      setTyped(text.slice(0, i));
      const ch = text[i - 1];
      if (i < text.length) timer.current = setTimeout(tick, ch === "." || ch === "?" || ch === "!" ? base * 7 : base);
      else timer.current = setTimeout(() => setTyperTalking(false), 200);
    };
    tick();
  };

  const subtitle = mode === "voice" && voice.progress !== null ? line.slice(0, voice.progress) : typed;
  const talking = loop || (mode === "voice" ? voice.mouth : typerTalking);
  const busy = mode === "voice" ? voice.speaking : typerTalking;

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
      <header className="max-w-2xl">
        <p className="eyebrow">Character model sheet · v1</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          Meet <span className="text-accent">Pax</span>
        </h1>
        <p className="mt-4 text-lg text-ink-2">
          A small, cheerful planet with a ring and a floating blue flame — the spherical flame NASA sees in microgravity.
          Pax is JaPax&apos;s face: the guide, the narrator and the voice of the AI.
        </p>
      </header>

      {/* Hero stage */}
      <section className="mt-10 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <div
          ref={stageRef}
          className="card relative flex min-h-[460px] items-center justify-center overflow-hidden"
          style={{
            background:
              "radial-gradient(40rem 22rem at 50% 30%, rgba(255,138,76,0.16), transparent 70%), radial-gradient(30rem 20rem at 80% 100%, rgba(90,163,255,0.14), transparent 70%), var(--surface)",
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              backgroundImage: "radial-gradient(rgba(255,255,255,0.35) 1px, transparent 1px)",
              backgroundSize: "34px 34px",
              maskImage: "radial-gradient(circle at 50% 45%, black, transparent 75%)",
            }}
          />
          {subtitle && (
            <div
              className="absolute left-1/2 top-6 z-10 w-[min(88%,420px)] -translate-x-1/2 rounded-2xl border border-line-2 bg-surface-2/95 px-5 py-3 text-[15px] leading-relaxed shadow-xl backdrop-blur"
              aria-live="polite"
            >
              {subtitle}
              {busy && <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-accent" />}
              <span aria-hidden className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-b border-r border-line-2 bg-surface-2" />
            </div>
          )}
          <button
            type="button"
            onClick={() => play("spin")}
            aria-label="Click Pax to make it spin"
            title="Click me!"
            className={`cursor-pointer rounded-full transition-[margin] duration-300 ${subtitle ? "mt-24" : ""}`}
          >
            <PaxCharacter size={340} mood={mood} talking={talking} look={look} gesture={gesture.g} gestureKey={gesture.key} />
          </button>
        </div>

        <div className="card flex flex-col gap-6 p-6">
          <div>
            <p className="eyebrow">Expression</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {MOODS.map((m) => (
                <button
                  key={m.mood}
                  onClick={() => setMood(m.mood)}
                  aria-pressed={mood === m.mood}
                  className={`rounded-full border px-3.5 py-1.5 text-sm transition ${mood === m.mood ? "border-accent bg-accent/15 text-ink" : "border-line-2 text-ink-2 hover:border-muted hover:text-ink"}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="eyebrow">Reactions</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {GESTURES.map((x) => (
                <button
                  key={x.g}
                  onClick={() => play(x.g)}
                  className="rounded-full border border-line-2 px-3.5 py-1.5 text-sm text-ink-2 transition hover:border-muted hover:text-ink"
                >
                  {x.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button onClick={playIntro} className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-[#2a1408] transition hover:brightness-110">
              ▶ Play intro
            </button>
            <button
              onClick={() => setLoop((t) => !t)}
              aria-pressed={loop}
              className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition ${loop ? "border-flame bg-flame/15 text-ink" : "border-line-2 text-ink-2 hover:text-ink"}`}
            >
              {loop ? "Stop lip-sync" : "Lip-sync loop"}
            </button>
            {voice.supported && (
              <button
                onClick={() => {
                  if (voiceOn) voice.stop();
                  setVoiceOn((v) => !v);
                }}
                aria-pressed={voiceOn}
                className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition ${voiceOn ? "border-line-2 text-ink" : "border-line text-muted hover:text-ink"}`}
              >
                {voiceOn ? "🔊 Voice on" : "🔇 Voice off"}
              </button>
            )}
          </div>

          <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-3 border-t border-line pt-5 text-sm">
            <dt className="text-muted">Name</dt>
            <dd>Pax (working name)</dd>
            <dt className="text-muted">Species</dt>
            <dd>Tiny ringed planet</dd>
            <dt className="text-muted">Companion</dt>
            <dd>A blue spherical flame — how fire burns in 0g</dd>
            <dt className="text-muted">Personality</dt>
            <dd>Curious, warm, upbeat · explains hard science simply</dd>
            <dt className="text-muted">Roles</dt>
            <dd>Site guide · AI chat voice · 60-second video narrator</dd>
            <dt className="text-muted">Alive details</dt>
            <dd>Random blinks, eye tracking, word-synced voice, floating, ring sway</dd>
            <dt className="text-muted">Reactions</dt>
            <dd>Hello on first visit · spin on click · oops on errors</dd>
          </dl>
          <p className="text-xs text-muted">Tip: move your cursor — Pax follows it with its eyes. Click Pax to make it spin.</p>
        </div>
      </section>

      {/* Expression sheet */}
      <section className="mt-16">
        <p className="eyebrow">Expression sheet</p>
        <h2 className="mt-2 text-2xl font-semibold">Six moods, one personality</h2>
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
          {MOODS.map((m) => (
            <button
              key={m.mood}
              onClick={() => {
                setMood(m.mood);
                stageRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
              className="card flex flex-col items-center px-4 pb-5 pt-6 text-center transition hover:border-line-2"
            >
              <PaxCharacter size={150} mood={m.mood} minimal />
              <span className="mt-2 font-medium">{m.label}</span>
              <span className="mt-1 text-sm text-muted">{m.use}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-16 grid gap-6 lg:grid-cols-2">
        {/* Scale */}
        <div className="card p-6">
          <p className="eyebrow">Scale</p>
          <h2 className="mt-2 text-2xl font-semibold">Reads at every size</h2>
          <div className="mt-8 flex items-end justify-between gap-4">
            {[
              { s: 32, l: "Nav icon" },
              { s: 52, l: "Chat avatar" },
              { s: 84, l: "Floating dock" },
              { s: 140, l: "Hero" },
            ].map((x) => (
              <div key={x.s} className="flex flex-col items-center gap-3">
                <PaxCharacter size={x.s} minimal={x.s < 100} />
                <span className="text-center text-xs text-muted">
                  {x.l} · {x.s}px
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* In context */}
        <div className="card p-6">
          <p className="eyebrow">In context</p>
          <h2 className="mt-2 text-2xl font-semibold">Always there, bottom-right</h2>
          <div className="relative mt-6 h-56 overflow-hidden rounded-xl border border-line bg-bg">
            <div className="flex h-8 items-center gap-1.5 border-b border-line px-3">
              <span className="h-2.5 w-2.5 rounded-full bg-line-2" />
              <span className="h-2.5 w-2.5 rounded-full bg-line-2" />
              <span className="h-2.5 w-2.5 rounded-full bg-line-2" />
            </div>
            <div className="space-y-2.5 p-4" aria-hidden>
              <div className="h-3 w-1/3 rounded bg-surface-2" />
              <div className="h-2 w-2/3 rounded bg-surface-2" />
              <div className="h-2 w-1/2 rounded bg-surface-2" />
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="h-14 rounded-lg bg-surface" />
                <div className="h-14 rounded-lg bg-surface" />
                <div className="h-14 rounded-lg bg-surface" />
              </div>
            </div>
            <div className="absolute bottom-3 right-3 flex items-end gap-2">
              <div className="mb-6 rounded-2xl rounded-br-sm border border-line-2 bg-surface-2 px-3 py-2 text-xs shadow-lg">Any questions? Ask me!</div>
              <PaxCharacter size={76} mood="happy" minimal />
            </div>
          </div>
        </div>
      </section>

      {/* Palette */}
      <section className="mt-16">
        <p className="eyebrow">Palette</p>
        <h2 className="mt-2 text-2xl font-semibold">Built from the JaPax colors</h2>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {PALETTE.map((c) => (
            <div key={c.hex} className="card overflow-hidden">
              <div className="h-20" style={{ background: c.hex }} />
              <div className="p-3">
                <p className="text-sm font-medium">{c.name}</p>
                <p className="font-mono text-xs text-muted">
                  {c.hex} · {c.role}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
