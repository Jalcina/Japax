"use client";

export type PaxMood = "idle" | "thinking" | "happy" | "worried" | "surprised";

/** Pax, the JaPax planet mentor: floats, blinks, and shows a mood. Moves its mouth while `talking`. */
export default function PaxFace({ talking, size = 64, sleeping = false, mood = "idle" }: { talking: boolean; size?: number; sleeping?: boolean; mood?: PaxMood }) {
  const ink = "#2a1408";
  const thinking = mood === "thinking";
  const surprised = mood === "surprised";
  const stroke = { fill: "none", stroke: ink, strokeLinecap: "round" as const };

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" className={`${sleeping ? "pax-sleep" : "pax-float"} overflow-visible`}>
      <defs>
        <radialGradient id="pax-body" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#ffc38a" />
          <stop offset="55%" stopColor="#ff8a4c" />
          <stop offset="100%" stopColor="#c4552a" />
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="56" rx="46" ry="11" fill="none" stroke="#5aa3ff" strokeWidth="3" opacity="0.6" transform="rotate(-14 50 56)" />
      <circle cx="50" cy="50" r="32" fill="url(#pax-body)" />

      {sleeping ? (
        <g {...stroke} strokeWidth="2.4">
          <path d="M35 45 Q40 49 45 45" />
          <path d="M55 45 Q60 49 65 45" />
        </g>
      ) : mood === "happy" ? (
        <g {...stroke} strokeWidth="2.8">
          <path d="M35 46 Q40 39 45 46" />
          <path d="M55 46 Q60 39 65 46" />
        </g>
      ) : (
        <g>
          <g className={thinking || surprised ? "" : "pax-blink"} style={{ transformOrigin: "50px 44px" }}>
            <ellipse cx="40" cy={thinking ? 42 : 44} rx={surprised ? 4.2 : 3.2} ry={surprised ? 5.6 : 4.2} fill={ink} />
            <ellipse cx="60" cy={thinking ? 42 : 44} rx={surprised ? 4.2 : 3.2} ry={surprised ? 5.6 : 4.2} fill={ink} />
            <circle cx="41.4" cy={thinking ? 40.2 : 42.2} r="1.1" fill="#fff" />
            <circle cx="61.4" cy={thinking ? 40.2 : 42.2} r="1.1" fill="#fff" />
          </g>
        </g>
      )}

      {/* eyebrows: worried slants up in the middle, thinking raises one, surprised lifts both */}
      {!sleeping && mood === "worried" && (
        <g {...stroke} strokeWidth="2.2">
          <path d="M34 35 L45 32" />
          <path d="M66 35 L55 32" />
        </g>
      )}
      {!sleeping && thinking && <path d="M55 34 L65 32" {...stroke} strokeWidth="2.2" />}
      {!sleeping && surprised && (
        <g {...stroke} strokeWidth="2.2">
          <path d="M35 34 Q40 31 45 34" />
          <path d="M55 34 Q60 31 65 34" />
        </g>
      )}

      {sleeping ? (
        <ellipse cx="50" cy="59" rx="2.6" ry="2.2" fill="#4a1a0c" />
      ) : talking ? (
        <ellipse cx="50" cy="59" rx="5" ry="3.4" fill="#4a1a0c" className="pax-talk" style={{ transformOrigin: "50px 59px" }} />
      ) : surprised ? (
        <ellipse cx="50" cy="60" rx="3.6" ry="4.4" fill="#4a1a0c" />
      ) : mood === "happy" ? (
        <path d="M41 57 Q50 67 59 57" {...stroke} strokeWidth="2.6" />
      ) : mood === "worried" ? (
        <path d="M43 62 Q50 57 57 62" {...stroke} strokeWidth="2.4" />
      ) : thinking ? (
        <path d="M44 60 L56 59" {...stroke} strokeWidth="2.4" />
      ) : (
        <path d="M43 58 Q50 63 57 58" {...stroke} strokeWidth="2.4" />
      )}
    </svg>
  );
}
