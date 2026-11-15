"use client";

import { useEffect, useId, useState } from "react";

export type PaxCharacterMood = "idle" | "happy" | "thinking" | "surprised" | "worried" | "sleeping";
/** One-shot reactions: hello (drop-in bounce + ring wave), spin (jump + barrel roll), oops (shake + "!"). */
export type PaxGesture = "hello" | "spin" | "oops";

const GESTURE_MS: Record<PaxGesture, number> = { hello: 1700, spin: 1150, oops: 1600 };

type Props = {
  mood?: PaxCharacterMood;
  talking?: boolean;
  size?: number;
  /** Gaze direction, each axis in [-1, 1]. */
  look?: { x: number; y: number };
  /** Hide decorative extras (sparkles, companion flame) for tiny sizes. */
  minimal?: boolean;
  /** Plays once whenever `gestureKey` changes (and on mount if set). */
  gesture?: PaxGesture | null;
  gestureKey?: number;
  className?: string;
};

const INK = "#2a1408";
const MOUTH = "#4a1708";

// Mouth shapes (half-width, depth) cycled while talking.
const VISEMES: [number, number][] = [
  [10, 5],
  [13, 12],
  [8, 9],
  [14, 16],
  [11, 7],
  [7, 6],
  [12, 10],
];

const EYE_L = { x: 124, y: 150 };
const EYE_R = { x: 176, y: 150 };
const MOUTH_Y = 184;

function mouthPath(w: number, h: number, lift = 2) {
  return `M ${150 - w} ${MOUTH_Y} Q 150 ${MOUTH_Y + lift} ${150 + w} ${MOUTH_Y} Q 150 ${MOUTH_Y + 2 * h} ${150 - w} ${MOUTH_Y} Z`;
}

function Sparkle({ x, y, s, delay }: { x: number; y: number; s: number; delay: number }) {
  return (
    <path
      className="pxc-twinkle"
      style={{ ["--d" as string]: `${delay}s`, transformOrigin: `${x}px ${y}px` }}
      d={`M ${x} ${y - s} Q ${x} ${y} ${x + s} ${y} Q ${x} ${y} ${x} ${y + s} Q ${x} ${y} ${x - s} ${y} Q ${x} ${y} ${x} ${y - s} Z`}
      fill="#fff4e0"
    />
  );
}

/**
 * Pax — the JaPax mascot: a small, cheerful planet with a ring and a
 * microgravity-flame companion. Pure SVG, blinks on its own, lip-syncs while `talking`.
 */
export default function PaxCharacter({
  mood: moodProp = "idle",
  talking = false,
  size = 240,
  look = { x: 0, y: 0 },
  minimal = false,
  gesture = null,
  gestureKey = 0,
  className = "",
}: Props) {
  const uid = useId().replace(/:/g, "");
  const id = (n: string) => `pxc-${n}-${uid}`;
  const url = (n: string) => `url(#${id(n)})`;

  const [blink, setBlink] = useState(false);
  const [viseme, setViseme] = useState(0);
  const [active, setActive] = useState<PaxGesture | null>(null);

  // Run a gesture for its duration; a new gestureKey restarts it.
  useEffect(() => {
    if (!gesture) return;
    setActive(gesture);
    const t = setTimeout(() => setActive(null), GESTURE_MS[gesture]);
    return () => clearTimeout(t);
  }, [gesture, gestureKey]);

  // Gestures briefly override the mood.
  const mood: PaxCharacterMood = active === "oops" ? "worried" : active ? "happy" : moodProp;

  // Natural blinking: random interval, occasional double blink.
  useEffect(() => {
    if (mood === "sleeping" || mood === "happy") return;
    let t: ReturnType<typeof setTimeout>;
    let alive = true;
    const once = (after: () => void) => {
      setBlink(true);
      t = setTimeout(() => {
        setBlink(false);
        after();
      }, 110);
    };
    const schedule = () => {
      t = setTimeout(() => {
        if (!alive) return;
        once(() => {
          if (Math.random() < 0.25) t = setTimeout(() => once(schedule), 140);
          else schedule();
        });
      }, 2200 + Math.random() * 3200);
    };
    schedule();
    return () => {
      alive = false;
      clearTimeout(t);
      setBlink(false);
    };
  }, [mood]);

  // Lip-sync: hop between mouth shapes at speech-like intervals.
  useEffect(() => {
    if (!talking) return;
    let t: ReturnType<typeof setTimeout>;
    const step = () => {
      setViseme((v) => (v + 1 + Math.floor(Math.random() * (VISEMES.length - 1))) % VISEMES.length);
      t = setTimeout(step, 85 + Math.random() * 70);
    };
    step();
    return () => clearTimeout(t);
  }, [talking]);

  const sleeping = mood === "sleeping";
  const thinking = mood === "thinking";
  const surprised = mood === "surprised";
  const worried = mood === "worried";
  const happy = mood === "happy";

  const gaze = thinking ? { x: 0.7, y: -0.8 } : look;
  const gx = Math.max(-1, Math.min(1, gaze.x)) * 3.2;
  const gy = Math.max(-1, Math.min(1, gaze.y)) * 3;
  const eyeRy = surprised ? 16.5 : 14;
  const eyeRx = surprised ? 12.5 : 11;

  const stroke = { fill: "none", stroke: INK, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  const [vw, vh] = VISEMES[viseme];
  const openMouth = talking ? { w: vw, h: vh, lift: 2 } : happy ? { w: 17, h: 13, lift: -1 } : null;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 300 300"
      role="img"
      aria-label={`Pax, the JaPax planet guide (${talking ? "talking" : mood})`}
      className={`overflow-visible ${className}`}
    >
      {/* Pax always animates, even with prefers-reduced-motion: its motion is gentle and part of the character.
          !important beats the site-wide reduced-motion reset in globals.css; delays use --d so they survive it too. */}
      <style>{`
        .pxc-float { animation: pxc-float 4.2s var(--d, 0s) ease-in-out infinite !important; }
        .pxc-shadow { animation: pxc-shadow 4.2s var(--d, 0s) ease-in-out infinite !important; transform-origin: 150px 286px; }
        .pxc-ring { animation: pxc-sway 7s var(--d, 0s) ease-in-out infinite !important; transform-origin: 150px 198px; }
        .pxc-flame { animation: pxc-orbit 5.5s var(--d, 0s) ease-in-out infinite !important; }
        .pxc-flicker { animation: pxc-flicker 0.9s var(--d, 0s) ease-in-out infinite alternate !important; transform-box: fill-box; transform-origin: center; }
        .pxc-twinkle { animation: pxc-twinkle 2.6s var(--d, 0s) ease-in-out infinite !important; }
        .pxc-talkbob { animation: pxc-talkbob 0.32s var(--d, 0s) ease-in-out infinite alternate !important; transform-origin: 150px 240px; }
        .pxc-eye { transition: transform 90ms ease !important; transform-box: fill-box; transform-origin: center; }
        .pxc-pupil { transition: transform 260ms cubic-bezier(.2,.8,.2,1) !important; }
        .pxc-dot { animation: pxc-dot 1.4s var(--d, 0s) ease-in-out infinite !important; opacity: 0; }
        .pxc-z { animation: pxc-z 3s var(--d, 0s) ease-in infinite !important; opacity: 0; }
        .pxc-drop { animation: pxc-drop 2.4s var(--d, 0s) ease-in-out infinite !important; }
        @keyframes pxc-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-7px) } }
        @keyframes pxc-shadow { 0%,100% { transform: scale(1); opacity: .55 } 50% { transform: scale(.86); opacity: .35 } }
        @keyframes pxc-sway { 0%,100% { transform: rotate(0deg) } 50% { transform: rotate(2.2deg) } }
        @keyframes pxc-orbit { 0%,100% { transform: translate(0,0) } 33% { transform: translate(-6px,8px) } 66% { transform: translate(5px,4px) } }
        @keyframes pxc-flicker { from { transform: scale(.92) } to { transform: scale(1.08) } }
        @keyframes pxc-twinkle { 0%,100% { transform: scale(.35); opacity: .2 } 50% { transform: scale(1); opacity: .95 } }
        @keyframes pxc-talkbob { from { transform: scale(1,1) } to { transform: scale(1.012,.988) } }
        @keyframes pxc-dot { 0%,15% { opacity: 0; transform: translateY(4px) } 35%,80% { opacity: 1; transform: translateY(0) } 100% { opacity: 0 } }
        @keyframes pxc-z { 0% { opacity: 0; transform: translate(0,0) scale(.6) } 25% { opacity: 1 } 100% { opacity: 0; transform: translate(18px,-40px) scale(1.2) } }
        @keyframes pxc-drop { 0%,100% { transform: translateY(0) } 50% { transform: translateY(3px) } }
        .pxc-g-hello { animation: pxc-hello 1.1s var(--d, 0s) cubic-bezier(.3,.7,.4,1) both !important; transform-origin: 150px 240px; }
        .pxc-g-wave { animation: pxc-wave 1.2s ease-in-out .45s both !important; transform-origin: 150px 198px; }
        .pxc-g-spin { animation: pxc-spin 1.05s var(--d, 0s) cubic-bezier(.4,.1,.3,1) both !important; transform-origin: 150px 158px; }
        .pxc-g-oops { animation: pxc-oops .6s var(--d, 0s) ease-out both !important; transform-origin: 150px 240px; }
        .pxc-burst { animation: pxc-burst .8s ease-out .35s both !important; }
        .pxc-pop { animation: pxc-pop 1.5s var(--d, 0s) ease-out both !important; transform-box: fill-box; transform-origin: center bottom; }
        @keyframes pxc-hello {
          0% { transform: translateY(-60px) scale(.55); opacity: 0 }
          40% { transform: translateY(0) scale(1.1,.88); opacity: 1 }
          58% { transform: translateY(-14px) scale(.94,1.07) }
          76% { transform: translateY(0) scale(1.04,.96) }
          100% { transform: translateY(0) scale(1) }
        }
        @keyframes pxc-wave { 0%,100% { transform: rotate(0) } 20% { transform: rotate(-9deg) } 45% { transform: rotate(8deg) } 70% { transform: rotate(-5deg) } 88% { transform: rotate(2deg) } }
        @keyframes pxc-spin {
          0% { transform: translateY(0) rotate(0) scale(1) }
          18% { transform: translateY(10px) rotate(0) scale(1.1,.88) }
          50% { transform: translateY(-52px) rotate(200deg) scale(.96,1.04) }
          78% { transform: translateY(0) rotate(360deg) scale(1.08,.92) }
          90% { transform: translateY(-4px) rotate(360deg) scale(.98,1.02) }
          100% { transform: translateY(0) rotate(360deg) scale(1) }
        }
        @keyframes pxc-oops {
          0% { transform: translateX(0) scale(1.06,.94) } 15% { transform: translateX(-9px) rotate(-3deg) } 30% { transform: translateX(8px) rotate(3deg) }
          45% { transform: translateX(-6px) rotate(-2deg) } 60% { transform: translateX(4px) rotate(1deg) } 80% { transform: translateX(-2px) } 100% { transform: translateX(0) }
        }
        @keyframes pxc-burst { 0% { transform: translate(0,0) scale(.3); opacity: 0 } 25% { opacity: 1 } 100% { transform: translate(var(--dx), var(--dy)) scale(1); opacity: 0 } }
        @keyframes pxc-pop { 0% { transform: scale(0) rotate(-20deg); opacity: 0 } 15% { transform: scale(1.25) rotate(8deg); opacity: 1 } 28% { transform: scale(1) rotate(0) } 80% { opacity: 1 } 100% { transform: translateY(-6px); opacity: 0 } }
      `}</style>

      <defs>
        <radialGradient id={id("body")} cx="36%" cy="30%" r="78%">
          <stop offset="0%" stopColor="#ffe0bd" />
          <stop offset="28%" stopColor="#ffb27a" />
          <stop offset="62%" stopColor="#ff8a4c" />
          <stop offset="100%" stopColor="#c4552a" />
        </radialGradient>
        <radialGradient id={id("shade")} cx="36%" cy="32%" r="76%">
          <stop offset="58%" stopColor="#5a1a08" stopOpacity="0" />
          <stop offset="100%" stopColor="#5a1a08" stopOpacity="0.5" />
        </radialGradient>
        <linearGradient id={id("rim")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="55%" stopColor="#8fc2ff" stopOpacity="0" />
          <stop offset="100%" stopColor="#8fc2ff" stopOpacity="0.85" />
        </linearGradient>
        <radialGradient id={id("spec")} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id("atmo")} cx="50%" cy="50%" r="50%">
          <stop offset="70%" stopColor="#ff9a5c" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#ff9a5c" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id("iris")} cx="50%" cy="70%" r="70%">
          <stop offset="0%" stopColor="#8a4a22" />
          <stop offset="55%" stopColor="#3a1a0a" />
          <stop offset="100%" stopColor="#1a0a03" />
        </radialGradient>
        <radialGradient id={id("flame")} cx="50%" cy="55%" r="50%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="30%" stopColor="#c9e4ff" />
          <stop offset="62%" stopColor="#5aa3ff" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#2a5fe0" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id("ringfront")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3f7fe0" />
          <stop offset="45%" stopColor="#a9d2ff" />
          <stop offset="100%" stopColor="#3f7fe0" />
        </linearGradient>
        <radialGradient id={id("ground")} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#000" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <filter id={id("soft")} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <filter id={id("glow")} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <clipPath id={id("planet")}>
          <circle cx="150" cy="158" r="84" />
        </clipPath>
        {/* Front half of the ring lives below its center line (in ring space). */}
        <clipPath id={id("ringFrontClip")}>
          <rect x="-40" y="198" width="380" height="120" />
        </clipPath>
        <clipPath id={id("ringBackClip")}>
          <rect x="-40" y="40" width="380" height="158" />
        </clipPath>
        {openMouth && (
          <clipPath id={id("mouth")}>
            <path d={mouthPath(openMouth.w, openMouth.h, openMouth.lift)} />
          </clipPath>
        )}
      </defs>

      {/* ground shadow */}
      <ellipse className="pxc-shadow" cx="150" cy="286" rx="70" ry="9" fill={url("ground")} />

      <g className="pxc-float">
        <g key={active ? `${active}-${gestureKey}` : "rest"} className={active ? `pxc-g-${active}` : ""}>
        <g className={talking ? "pxc-talkbob" : ""}>
          {/* atmosphere glow */}
          <circle cx="150" cy="158" r="104" fill={url("atmo")} />

          {/* ring — back half (behind the planet) */}
          <g className={active === "hello" ? "pxc-g-wave" : ""}>
          <g className="pxc-ring">
            <g transform="rotate(-12 150 198)" clipPath={url("ringBackClip")} opacity="0.55">
              <ellipse cx="150" cy="198" rx="134" ry="30" fill="none" stroke="#3f7fe0" strokeWidth="9" />
              <ellipse cx="150" cy="198" rx="120" ry="24" fill="none" stroke="#a9d2ff" strokeWidth="2.5" />
            </g>
          </g>
          </g>

          {/* planet body */}
          <g clipPath={url("planet")}>
            <circle cx="150" cy="158" r="84" fill={url("body")} />
            {/* soft surface bands */}
            <path d="M 60 196 Q 150 168 240 206" fill="none" stroke="#ffd7ad" strokeOpacity="0.28" strokeWidth="14" strokeLinecap="round" />
            <path d="M 70 112 Q 150 92 236 120" fill="none" stroke="#ffe4c6" strokeOpacity="0.2" strokeWidth="8" strokeLinecap="round" />
            {/* craters */}
            {[
              { x: 200, y: 108, r: 10 },
              { x: 98, y: 212, r: 7 },
              { x: 208, y: 200, r: 6 },
              { x: 96, y: 116, r: 5 },
              { x: 168, y: 226, r: 4 },
            ].map((c) => (
              <g key={`${c.x}-${c.y}`}>
                <ellipse cx={c.x} cy={c.y} rx={c.r} ry={c.r * 0.82} fill="#b84a1f" opacity="0.32" />
                <path d={`M ${c.x - c.r * 0.8} ${c.y + c.r * 0.3} Q ${c.x} ${c.y + c.r * 1.05} ${c.x + c.r * 0.8} ${c.y + c.r * 0.3}`} fill="none" stroke="#ffd2a6" strokeOpacity="0.55" strokeWidth={Math.max(1, c.r * 0.22)} strokeLinecap="round" />
              </g>
            ))}
            {/* ring shadow cast on the planet */}
            <g transform="rotate(-12 150 198)">
              <ellipse cx="150" cy="188" rx="134" ry="30" fill="none" stroke="#5a1a08" strokeOpacity="0.16" strokeWidth="10" filter={url("soft")} />
            </g>
            {/* terminator shading + rim light */}
            <circle cx="150" cy="158" r="84" fill={url("shade")} />
            <circle cx="150" cy="158" r="82.5" fill="none" stroke={url("rim")} strokeWidth="3" />
            {/* specular highlight */}
            <ellipse cx="116" cy="108" rx="34" ry="18" transform="rotate(-32 116 108)" fill={url("spec")} />
            <ellipse cx="104" cy="100" rx="7" ry="4" transform="rotate(-32 104 100)" fill="#fff" opacity="0.7" />
          </g>

          {/* ---------- face ---------- */}
          {/* cheeks */}
          <g filter={url("soft")} opacity={happy || talking ? 0.6 : 0.42}>
            <ellipse cx="104" cy="176" rx="12" ry="7" fill="#ff5f7a" />
            <ellipse cx="196" cy="176" rx="12" ry="7" fill="#ff5f7a" />
          </g>

          {/* eyes */}
          {sleeping ? (
            <g {...stroke} strokeWidth="4">
              <path d={`M ${EYE_L.x - 11} ${EYE_L.y} Q ${EYE_L.x} ${EYE_L.y + 9} ${EYE_L.x + 11} ${EYE_L.y}`} />
              <path d={`M ${EYE_R.x - 11} ${EYE_R.y} Q ${EYE_R.x} ${EYE_R.y + 9} ${EYE_R.x + 11} ${EYE_R.y}`} />
            </g>
          ) : happy ? (
            <g {...stroke} strokeWidth="4.6">
              <path d={`M ${EYE_L.x - 11} ${EYE_L.y + 4} Q ${EYE_L.x} ${EYE_L.y - 12} ${EYE_L.x + 11} ${EYE_L.y + 4}`} />
              <path d={`M ${EYE_R.x - 11} ${EYE_R.y + 4} Q ${EYE_R.x} ${EYE_R.y - 12} ${EYE_R.x + 11} ${EYE_R.y + 4}`} />
            </g>
          ) : (
            [EYE_L, EYE_R].map((e, i) => (
              <g key={i} className="pxc-eye" style={{ transform: `scaleY(${blink ? 0.08 : 1})` }}>
                <ellipse cx={e.x} cy={e.y} rx={eyeRx} ry={eyeRy} fill={url("iris")} />
                <g className="pxc-pupil" style={{ transform: `translate(${gx}px, ${gy}px)` }}>
                  <ellipse cx={e.x} cy={e.y + 1} rx={eyeRx * 0.52} ry={eyeRy * 0.55} fill="#120602" />
                  <circle cx={e.x - 3.6} cy={e.y - 5.2} r={surprised ? 4.6 : 4} fill="#fff" />
                  <circle cx={e.x + 4} cy={e.y + 5} r="1.9" fill="#fff" opacity="0.9" />
                </g>
                {/* lower lid warmth */}
                <path d={`M ${e.x - eyeRx + 2} ${e.y + eyeRy - 3} Q ${e.x} ${e.y + eyeRy + 2} ${e.x + eyeRx - 2} ${e.y + eyeRy - 3}`} fill="none" stroke="#ff9a6a" strokeOpacity="0.55" strokeWidth="1.6" strokeLinecap="round" />
              </g>
            ))
          )}

          {/* brows */}
          {worried && (
            <g {...stroke} strokeWidth="3.6">
              <path d={`M ${EYE_L.x - 12} ${EYE_L.y - 20} Q ${EYE_L.x} ${EYE_L.y - 22} ${EYE_L.x + 10} ${EYE_L.y - 28}`} />
              <path d={`M ${EYE_R.x + 12} ${EYE_R.y - 20} Q ${EYE_R.x} ${EYE_R.y - 22} ${EYE_R.x - 10} ${EYE_R.y - 28}`} />
            </g>
          )}
          {thinking && (
            <g {...stroke} strokeWidth="3.6">
              <path d={`M ${EYE_L.x - 11} ${EYE_L.y - 21} Q ${EYE_L.x} ${EYE_L.y - 24} ${EYE_L.x + 11} ${EYE_L.y - 21}`} />
              <path d={`M ${EYE_R.x - 11} ${EYE_R.y - 26} Q ${EYE_R.x} ${EYE_R.y - 33} ${EYE_R.x + 12} ${EYE_R.y - 28}`} />
            </g>
          )}
          {surprised && (
            <g {...stroke} strokeWidth="3.6">
              <path d={`M ${EYE_L.x - 11} ${EYE_L.y - 28} Q ${EYE_L.x} ${EYE_L.y - 36} ${EYE_L.x + 11} ${EYE_L.y - 29}`} />
              <path d={`M ${EYE_R.x - 11} ${EYE_R.y - 29} Q ${EYE_R.x} ${EYE_R.y - 36} ${EYE_R.x + 11} ${EYE_R.y - 28}`} />
            </g>
          )}

          {/* mouth */}
          {openMouth ? (
            <g>
              <path d={mouthPath(openMouth.w, openMouth.h, openMouth.lift)} fill={MOUTH} />
              <g clipPath={url("mouth")}>
                <ellipse cx="150" cy={MOUTH_Y + openMouth.h * 2 - 2} rx={openMouth.w * 0.7} ry={Math.max(3, openMouth.h * 0.7)} fill="#ff6f7d" />
                <rect x={150 - openMouth.w} y={MOUTH_Y - 2} width={openMouth.w * 2} height="3.2" fill="#fff6ec" opacity={openMouth.h > 7 ? 0.9 : 0} />
              </g>
              <path d={mouthPath(openMouth.w, openMouth.h, openMouth.lift)} fill="none" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
            </g>
          ) : surprised ? (
            <g>
              <ellipse cx="150" cy={MOUTH_Y + 6} rx="7.5" ry="9.5" fill={MOUTH} stroke={INK} strokeWidth="2" />
              <ellipse cx="150" cy={MOUTH_Y + 11} rx="4.5" ry="3" fill="#ff6f7d" />
            </g>
          ) : sleeping ? (
            <ellipse cx="150" cy={MOUTH_Y + 4} rx="4.5" ry="3.6" fill={MOUTH} />
          ) : worried ? (
            <path d={`M 138 ${MOUTH_Y + 7} Q 144 ${MOUTH_Y + 1} 150 ${MOUTH_Y + 5} Q 156 ${MOUTH_Y + 9} 162 ${MOUTH_Y + 3}`} {...stroke} strokeWidth="3.6" />
          ) : thinking ? (
            <path d={`M 140 ${MOUTH_Y + 5} Q 152 ${MOUTH_Y + 7} 162 ${MOUTH_Y + 1}`} {...stroke} strokeWidth="3.6" />
          ) : (
            <path d={`M 134 ${MOUTH_Y} Q 150 ${MOUTH_Y + 15} 166 ${MOUTH_Y}`} {...stroke} strokeWidth="4" />
          )}

          {/* worried sweat drop */}
          {worried && (
            <path className="pxc-drop" d="M 214 128 Q 206 142 214 146 Q 222 142 214 128 Z" fill="#9cd0ff" stroke="#3f7fe0" strokeWidth="1.5" />
          )}

          {/* ring — front half (over the planet) */}
          <g className={active === "hello" ? "pxc-g-wave" : ""}>
          <g className="pxc-ring">
            <g transform="rotate(-12 150 198)" clipPath={url("ringFrontClip")}>
              <ellipse cx="150" cy="198" rx="134" ry="30" fill="none" stroke={url("ringfront")} strokeWidth="9" />
              <ellipse cx="150" cy="198" rx="120" ry="24" fill="none" stroke="#d6eaff" strokeWidth="2.5" opacity="0.9" />
              <ellipse cx="150" cy="199.5" rx="134" ry="30" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="1.2" />
            </g>
          </g>
          </g>
        </g>
        </g>
      </g>

      {/* spin: sparkle burst */}
      {active === "spin" && (
        <g key={`burst-${gestureKey}`} fill="#ffe7c2">
          {Array.from({ length: 10 }, (_, i) => {
            const a = (i / 10) * Math.PI * 2;
            const d = 118 + (i % 2) * 22;
            return (
              <circle
                key={i}
                className="pxc-burst"
                cx="150"
                cy="158"
                r={i % 2 ? 3 : 4.5}
                fill={i % 3 === 0 ? "#9cd0ff" : undefined}
                style={{ ["--dx" as string]: `${Math.cos(a) * d}px`, ["--dy" as string]: `${Math.sin(a) * d}px` }}
              />
            );
          })}
        </g>
      )}

      {/* oops: exclamation pop */}
      {active === "oops" && (
        <g key={`pop-${gestureKey}`} className="pxc-pop">
          <path d="M 42 52 h 34 a 10 10 0 0 1 10 10 v 22 a 10 10 0 0 1 -10 10 h -11 l 6 12 l -16 -12 h -11 a 10 10 0 0 1 -10 -10 v -22 a 10 10 0 0 1 10 -10 z" fill="#ffb21f" stroke="#2a1408" strokeWidth="2.5" strokeLinejoin="round" />
          <rect x="56.5" y="60" width="5" height="17" rx="2.5" fill="#2a1408" />
          <circle cx="59" cy="84" r="3" fill="#2a1408" />
        </g>
      )}

      {/* companion: a spherical microgravity flame */}
      {!minimal && (
        <g className="pxc-flame">
          <circle cx="252" cy="62" r="20" fill="#5aa3ff" opacity="0.35" filter={url("glow")} />
          <circle className="pxc-flicker" cx="252" cy="62" r="13" fill={url("flame")} />
          <circle cx="249" cy="58" r="2.6" fill="#fff" opacity="0.9" />
        </g>
      )}

      {/* sparkles */}
      {!minimal && (
        <g>
          <Sparkle x={42} y={58} s={7} delay={0} />
          <Sparkle x={268} y={150} s={5} delay={0.9} />
          <Sparkle x={30} y={196} s={4.5} delay={1.6} />
          <Sparkle x={212} y={28} s={4} delay={2.1} />
        </g>
      )}

      {/* thinking dots */}
      {thinking && (
        <g fill="#eceae4">
          <circle className="pxc-dot" cx="226" cy="84" r="4" style={{ ["--d" as string]: "0s" }} />
          <circle className="pxc-dot" cx="240" cy="68" r="5.5" style={{ ["--d" as string]: "0.2s" }} />
          <circle className="pxc-dot" cx="258" cy="50" r="7" style={{ ["--d" as string]: "0.4s" }} />
        </g>
      )}

      {/* sleeping z's */}
      {sleeping && (
        <g fill="#b9cfff" fontFamily="ui-rounded, system-ui, sans-serif" fontWeight="800">
          <text className="pxc-z" x="214" y="104" fontSize="18" style={{ ["--d" as string]: "0s" }}>z</text>
          <text className="pxc-z" x="226" y="94" fontSize="24" style={{ ["--d" as string]: "1s" }}>z</text>
          <text className="pxc-z" x="238" y="84" fontSize="30" style={{ ["--d" as string]: "2s" }}>Z</text>
        </g>
      )}
    </svg>
  );
}
