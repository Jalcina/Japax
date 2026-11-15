"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n";

const T = {
  en: {
    eyebrow: "Our mission",
    title: "JaPax exists to save astronauts' lives",
    lead: "Simulating fire is the means, not the goal. Every model, every dataset and every simulator run in JaPax serves one purpose: that no astronaut dies in a fire in space, and that we know exactly where to act to make it so.",
    wEyebrow: "A lesson that already saved lives",
    wTitle: "The WWII bomber: the drawing showed where to protect",
    wText: "In 1943 the Statistical Research Group (Abraham Wald) studied the bullet holes on bombers that came back. The insight: the holes marked where a plane can be hit and still survive; the critical spots were the ones with no holes. Data told engineers exactly where to add armor.",
    wSrc: "Historical case: Wald, A. (1943), Statistical Research Group, Columbia University.",
    pastLabel: "1943 · The drawing",
    pastCap: "Returning planes show hits on wings and fuselage. The armor goes where the drawing points.",
    nowLabel: "JaPax · The simulator",
    nowCap: "The simulator shows which components ignite first and carry fire to the rest. The protection goes there.",
    hit: "Survivable hit",
    crit: "Critical point",
    ignite: "First to ignite",
    spread: "Spreads the fire",
    illus: "Illustrative diagram. Real results are produced in the simulator, with sources and marked as measured, predicted or estimated.",
    steps: [
      { n: "1", t: "Study", d: "Decades of NASA combustion data (PSI) feed the models." },
      { n: "2", t: "Simulate", d: "Touch a component and watch how fire jumps from one to the next." },
      { n: "3", t: "Protect", d: "Apply safety measures in the simulator and see how much time they buy." },
    ],
    noRisk: "In 1943 that knowledge was paid for with the lives of airmen. JaPax gets the same answer in the simulator, without putting a single life at risk, and tells you exactly what to protect.",
    goal: "The goal: enough time for the crew to react, escape or put the fire out.",
    cta: "Find what to protect",
  },
  es: {
    eyebrow: "Nuestra misión",
    title: "JaPax existe para salvar la vida de los astronautas",
    lead: "Simular el fuego es el medio, no el fin. Cada modelo, cada conjunto de datos y cada simulación de JaPax sirve a un solo propósito: que ningún astronauta muera en un incendio en el espacio, y saber exactamente dónde actuar para conseguirlo.",
    wEyebrow: "Una lección que ya salvó vidas",
    wTitle: "El bombardero de la Segunda Guerra Mundial: el dibujo mostró dónde proteger",
    wText: "En 1943 el Statistical Research Group (Abraham Wald) estudió los impactos de bala en los bombarderos que volvían. La clave: los agujeros marcaban dónde un avión puede ser alcanzado y aun así sobrevivir; los puntos críticos eran los que no tenían agujeros. Los datos indicaron a los ingenieros exactamente dónde blindar.",
    wSrc: "Caso histórico: Wald, A. (1943), Statistical Research Group, Universidad de Columbia.",
    pastLabel: "1943 · El dibujo",
    pastCap: "Los aviones que regresan muestran impactos en alas y fuselaje. El blindaje va donde el dibujo lo indica.",
    nowLabel: "JaPax · El simulador",
    nowCap: "El simulador muestra qué componentes se incendian primero y llevan el fuego al resto. La protección va ahí.",
    hit: "Impacto no letal",
    crit: "Punto crítico",
    ignite: "Primero en arder",
    spread: "Propaga el fuego",
    illus: "Diagrama ilustrativo. Los resultados reales se generan en el simulador, con fuentes y marcados como medido, predicho o estimado.",
    steps: [
      { n: "1", t: "Estudiar", d: "Décadas de datos de combustión de la NASA (PSI) alimentan los modelos." },
      { n: "2", t: "Simular", d: "Toca un componente y mira cómo el fuego salta de uno a otro." },
      { n: "3", t: "Proteger", d: "Aplica medidas de seguridad en el simulador y comprueba cuánto tiempo ganan." },
    ],
    noRisk: "En 1943 ese conocimiento se pagó con la vida de aviadores. JaPax obtiene la misma respuesta en el simulador, sin poner ninguna vida en riesgo, y te dice exactamente qué proteger.",
    goal: "El objetivo: dar a la tripulación tiempo para reaccionar, escapar o apagar el fuego.",
    cta: "Descubre qué proteger",
  },
};

const HOLES: [number, number][] = [
  [58, 52], [70, 66], [48, 70], [64, 82], [112, 40], [124, 56], [138, 44],
  [118, 78], [150, 90], [172, 84], [190, 74], [92, 98], [104, 112], [214, 62],
  [226, 76], [86, 60], [132, 100], [60, 36],
];

function Bomber({ hitLabel, critLabel }: { hitLabel: string; critLabel: string }) {
  return (
    <svg viewBox="0 0 280 160" role="img" aria-label={`${hitLabel} / ${critLabel}`} className="h-auto w-full">
      <g fill="none" stroke="var(--line-2)" strokeWidth="2" strokeLinejoin="round">
        <path d="M20 80 Q40 72 90 70 L120 14 L150 14 L142 70 L214 66 L262 52 L262 70 L214 80 L262 92 L262 110 L214 94 L142 90 L150 146 L120 146 L90 90 Q40 88 20 80Z" fill="var(--surface-2)" />
      </g>
      {HOLES.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3" fill="var(--muted, #8a93a6)" />
      ))}
      {/* engines + cockpit: no holes */}
      <g fill="none" stroke="#ff4d4d" strokeWidth="2" strokeDasharray="4 3">
        <circle cx="130" cy="32" r="14" />
        <circle cx="130" cy="128" r="14" />
        <circle cx="40" cy="80" r="12" />
      </g>
    </svg>
  );
}

function Habitat({ igniteLabel, spreadLabel }: { igniteLabel: string; spreadLabel: string }) {
  return (
    <svg viewBox="0 0 280 160" role="img" aria-label={`${igniteLabel} / ${spreadLabel}`} className="h-auto w-full">
      <rect x="14" y="30" width="252" height="100" rx="46" fill="var(--surface-2)" stroke="var(--line-2)" strokeWidth="2" />
      <g stroke="#ff8a4c" strokeWidth="2" strokeDasharray="5 4" opacity="0.8">
        <path d="M70 80 L130 54" />
        <path d="M70 80 L130 106" />
        <path d="M130 54 L200 80" />
        <path d="M130 106 L200 80" />
      </g>
      <circle cx="70" cy="80" r="15" fill="#ff4d4d" />
      <circle cx="130" cy="54" r="11" fill="#ff8a4c" />
      <circle cx="130" cy="106" r="11" fill="#ff8a4c" />
      <circle cx="200" cy="80" r="11" fill="#ff8a4c" />
      <circle cx="238" cy="80" r="7" fill="var(--line-2)" />
      <circle cx="44" cy="52" r="7" fill="var(--line-2)" />
    </svg>
  );
}

function Legend({ items }: { items: { color: string; label: string; dashed?: boolean }[] }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={it.dashed ? { border: `2px dashed ${it.color}` } : { background: it.color }}
          />
          {it.label}
        </li>
      ))}
    </ul>
  );
}

export default function MissionLives() {
  const t = useT(T);
  return (
    <section id="mission" className="mx-auto max-w-6xl px-4 pt-16" aria-labelledby="mission-title">
      <div className="card relative overflow-hidden p-6 sm:p-10" style={{ borderColor: "var(--accent)" }}>
        <p className="eyebrow">{t.eyebrow}</p>
        <h2 id="mission-title" className="mt-2 max-w-3xl text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
          {t.title}
        </h2>
        <p className="mt-4 max-w-3xl text-lg text-ink-2">{t.lead}</p>

        <div className="mt-10">
          <p className="eyebrow">{t.wEyebrow}</p>
          <h3 className="mt-1 max-w-3xl text-xl font-semibold sm:text-2xl">{t.wTitle}</h3>
          <p className="mt-3 max-w-3xl text-ink-2">{t.wText}</p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <figure className="rounded-xl border border-line p-4">
            <figcaption className="eyebrow mb-2">{t.pastLabel}</figcaption>
            <Bomber hitLabel={t.hit} critLabel={t.crit} />
            <Legend items={[{ color: "#8a93a6", label: t.hit }, { color: "#ff4d4d", label: t.crit, dashed: true }]} />
            <p className="mt-2 text-sm text-ink-2">{t.pastCap}</p>
          </figure>
          <figure className="rounded-xl border border-line p-4" style={{ borderColor: "var(--accent)" }}>
            <figcaption className="eyebrow mb-2">{t.nowLabel}</figcaption>
            <Habitat igniteLabel={t.ignite} spreadLabel={t.spread} />
            <Legend items={[{ color: "#ff4d4d", label: t.ignite }, { color: "#ff8a4c", label: t.spread }]} />
            <p className="mt-2 text-sm text-ink-2">{t.nowCap}</p>
          </figure>
        </div>
        <p className="mt-3 text-xs text-muted">{t.illus} {t.wSrc}</p>

        <p className="mt-6 max-w-3xl border-l-4 pl-4 text-lg font-medium" style={{ borderColor: "var(--accent)" }}>
          {t.noRisk}
        </p>

        <ol className="mt-8 grid gap-3 sm:grid-cols-3">
          {t.steps.map((s) => (
            <li key={s.n} className="rounded-xl bg-surface-2 p-4">
              <span className="text-2xl font-semibold" style={{ color: "var(--accent)" }}>{s.n}</span>
              <h4 className="mt-1 font-semibold">{s.t}</h4>
              <p className="mt-1 text-sm text-ink-2">{s.d}</p>
            </li>
          ))}
        </ol>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <p className="max-w-xl font-medium">{t.goal}</p>
          <Link href="/simulator#fire" className="rounded-lg bg-accent px-5 py-2.5 font-medium text-black hover:brightness-110">
            {t.cta}
          </Link>
        </div>
      </div>
    </section>
  );
}
