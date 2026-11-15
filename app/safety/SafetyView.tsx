"use client";

import Link from "next/link";
import { useState } from "react";
import { useData, useLang } from "@/lib/i18n";
import type { Lang } from "@/lib/data";
import { Section } from "@/components/ui";

export interface SafetyStats {
  flexN: number; ext: number; lunarN: number; lunarExt: number;
  bassN: number; bassMin: number; bassMax: number; maxCo2: number; maxHe: number;
}

type Status = "known" | "partial" | "unknown";
type Phase = "prevent" | "detect" | "spread" | "suppress";
type Env = "iss" | "moon" | "suit";
interface Cell { status: Status; text: string; ids: string[] }

const PHASES: Phase[] = ["prevent", "detect", "spread", "suppress"];
const L = (lang: Lang, en: string, es: string) => (lang === "es" ? es : en);

const STATUS_STYLE: Record<Status, string> = {
  known: "border-emerald-500/50 bg-emerald-500/10 text-emerald-300",
  partial: "border-amber-500/50 bg-amber-500/10 text-amber-300",
  unknown: "border-red-500/50 bg-red-500/10 text-red-300",
};

function cells(s: SafetyStats, lang: Lang): Record<Env, Record<Phase, Cell>> {
  const none = L(lang, "Outside every verified test range on this site: no data.", "Fuera de todos los rangos de ensayo verificados en este sitio: sin datos.");
  return {
    iss: {
      prevent: { status: "known", ids: ["bass-ii"], text: L(lang, `Materials were burned in microgravity at air-like oxygen: BASS-II ran ${s.bassN} tests with initial O₂ from ${s.bassMin}% to ${s.bassMax}%.`, `Se quemaron materiales en microgravedad con oxígeno similar al aire: BASS-II hizo ${s.bassN} ensayos con O₂ inicial de ${s.bassMin}% a ${s.bassMax}%.`) },
      detect: { status: "known", ids: ["same"], text: L(lang, "SAME burned spacecraft materials in microgravity: smoke particles average 100–200 nm, so detectors must catch very small particles early.", "SAME quemó materiales de nave en microgravedad: las partículas de humo miden de media 100–200 nm, así que los detectores deben captar partículas muy pequeñas a tiempo.") },
      spread: { status: "partial", ids: ["saffire-i", "saffire-ii"], text: L(lang, "Saffire-I/II/III burned large samples aboard cargo vehicles, but in the Saffire-I and II tables used here only 2 samples have a recorded burn time and there is no spread-rate column. Spread is observed, not modelled.", "Saffire-I/II/III quemaron muestras grandes en naves de carga, pero en las tablas de Saffire-I y II que usamos solo 2 muestras tienen tiempo de combustión registrado y no hay columna de velocidad de propagación. La propagación está observada, no modelada.") },
      suppress: { status: "partial", ids: ["flex"], text: L(lang, `FLEX ran ${s.flexN} droplet tests and ${s.ext} ended in extinction. NASA reports the flammability limit is lower in reduced gravity, so terrestrial inert-gas standards give less margin.`, `FLEX hizo ${s.flexN} ensayos con gotas y ${s.ext} terminaron en extinción. NASA indica que el límite de inflamabilidad es menor con poca gravedad, así que los estándares terrestres de gases inertes dan menos margen.`) },
    },
    moon: {
      prevent: { status: "partial", ids: ["bass-ii", "acme-bre"], text: L(lang, `No BASS-II solid-material test reached 26.5% O₂ (max ${s.bassMax}%). BRE burned gas flames that emulate solids: in O₂-enriched air they kept burning with no airflow; at 21% they went out.`, `Ningún ensayo de materiales sólidos de BASS-II llegó a 26.5% de O₂ (máx. ${s.bassMax}%). BRE quemó llamas de gas que emulan sólidos: con aire enriquecido en O₂ siguieron ardiendo sin flujo de aire; a 21% se apagaron.`) },
      detect: { status: "unknown", ids: ["same", "same-r"], text: L(lang, "The smoke baseline comes from ISS air. The data on this site holds no detector results at lunar-habitat oxygen, pressure or gravity.", "La referencia de humo viene del aire de la ISS. Los datos de este sitio no incluyen resultados de detectores con el oxígeno, la presión ni la gravedad de un hábitat lunar.") },
      spread: { status: "unknown", ids: ["acme-e-field"], text: L(lang, "PSI holds no partial-gravity combustion data, so how fire spreads at 1/6 g is unmeasured. LUCI and FM2 are meant to fill it; ACME E-FIELD only mimics partial gravity with an electric field.", "PSI no contiene datos de combustión en gravedad parcial, así que cómo se propaga el fuego a 1/6 g no está medido. LUCI y FM2 deben cubrirlo; ACME E-FIELD solo imita la gravedad parcial con un campo eléctrico.") },
      suppress: { status: "partial", ids: ["flex"], text: L(lang, `Of ${s.lunarN} FLEX tests at lunar-like conditions (0.6–0.8 atm, O₂ ≥ 26.5%), ${s.lunarExt} ended in extinction. Suppression there is the least understood step.`, `De ${s.lunarN} ensayos de FLEX en condiciones lunares (0.6–0.8 atm, O₂ ≥ 26.5%), ${s.lunarExt} terminaron en extinción. Extinguir en esas condiciones es el paso peor entendido.`) },
    },
    suit: {
      prevent: { status: "unknown", ids: [], text: none + " " + L(lang, "Apollo 1 (1967) burned in a 100% oxygen cabin.", "El Apollo 1 (1967) ardió en una cabina con 100% de oxígeno.") },
      detect: { status: "unknown", ids: [], text: none },
      spread: { status: "unknown", ids: [], text: none },
      suppress: { status: "unknown", ids: [], text: none },
    },
  };
}

function ladder(s: SafetyStats, lang: Lang): { title: string; status: Status; text: string; ids: string[] }[] {
  return [
    { title: L(lang, "1. Detect during pre-flame heating", "1. Detectar durante el calentamiento previo a la llama"), status: "known", ids: ["same"],
      text: L(lang, "NASA's detection target is the incipient phase (pre-fire heating products), not soot. Ionization detectors respond better to sub-micron particles; light-scattering detectors perform well in most cases.", "El objetivo de detección de NASA es la fase incipiente (productos de calentamiento previos al fuego), no el hollín. Los detectores de ionización responden mejor a partículas submicrónicas; los de dispersión de luz funcionan bien en la mayoría de los casos.") },
    { title: L(lang, "2. Interrupt forced flow", "2. Interrumpir el flujo forzado"), status: "partial", ids: ["acme-bre"],
      text: L(lang, "At 21% O₂, flames in quiescent air self-extinguished. In O₂-enriched atmospheres they were sustained with no forced flow, so the authors suggest that ventilation shutdown alone may be insufficient there.", "Con 21% de O₂, las llamas en aire quiescente se autoextinguieron. En atmósferas enriquecidas en O₂ se mantuvieron sin flujo forzado, por lo que los autores sugieren que cortar la ventilación por sí solo podría ser insuficiente allí.") },
    { title: L(lang, "3. Dilute with inert agent", "3. Diluir con agente inerte"), status: "partial", ids: ["flex"],
      text: L(lang, `FLEX tested up to ${s.maxCo2}% CO₂ and ${s.maxHe}% helium (mole fraction). Both suppress combustion, but the flammability limit is lower in reduced gravity, so terrestrial margins do not transfer.`, `FLEX probó hasta ${s.maxCo2}% de CO₂ y ${s.maxHe}% de helio (fracción molar). Ambos suprimen la combustión, pero el límite de inflamabilidad es menor en gravedad reducida, por lo que los márgenes terrestres no son transferibles.`) },
    { title: L(lang, "4. Isolate and vent the habitat", "4. Aislar y despresurizar el hábitat"), status: "partial", ids: ["flex"],
      text: L(lang, "NASA lists venting the habitat to space as one extinguishment strategy, which is why FLEX tested low pressures. It is a strategy under study, not a validated procedure.", "NASA cita despresurizar el hábitat al espacio como una estrategia de extinción, y por eso FLEX ensayó presiones bajas. Es una estrategia en estudio, no un procedimiento validado.") },
    { title: L(lang, "5. Qualify the material up front", "5. Calificar el material desde el diseño"), status: "known", ids: ["saffire-ii", "acme-bre"],
      text: L(lang, "In Saffire-II a PMMA/Nomex sample was burned: the PMMA was fully consumed and the Nomex did not ignite (PSI table note). NASA-STD-6001 Test 1 (1 g) is not conservative for some materials; the BRE authors suggest using Test 2 (cone calorimeter).", "En Saffire-II se quemó una muestra de PMMA/Nomex: el PMMA se consumió por completo y el Nomex no se encendió (nota de la tabla PSI). NASA-STD-6001 Test 1 (1 g) no es conservador para algunos materiales; los autores de BRE sugieren usar el Test 2 (calorímetro de cono).") },
  ];
}

const T = {
  en: {
    eyebrow: "Fire-safety evidence base",
    title: "From combustion science to what a spacecraft must protect",
    lead: "A spacecraft fire is addressed in four layers: prevention, detection, spread limitation and extinguishment. Select an environment to see which layers NASA's investigations support with measurements, which they only indicate, and where the hazard is unquantified.",
    warn: "This is evidence from NASA experiments, not an operating procedure. Crew procedures are the responsibility of NASA and the space agencies.",
    envTitle: "Select the ignition environment",
    envs: { iss: ["ISS cabin", "≈21% O₂ · 14.7 psi · microgravity"], moon: ["Lunar habitat", "≈30% O₂ · ≤10.2 psi · 0.16 g"], suit: ["Spacesuit (EVA)", "100% O₂ · 4.3 psi"] } as Record<Env, string[]>,
    phases: { prevent: "Prevention", detect: "Detection", spread: "Spread limitation", suppress: "Extinguishment" } as Record<Phase, string>,
    status: { known: "Measured", partial: "Partial", unknown: "No data" } as Record<Status, string>,
    legend: "Measured: backed by recorded tests. Partial: some evidence, with significant limitations. No data: the hazard is unquantified.",
    ladderEyebrow: "Response sequence",
    ladderTitle: "Evidence level for each response step",
    ladderLead: "Each step shows the strength of the supporting evidence. None is a certified procedure.",
    earthEyebrow: "Technology transfer",
    earthTitle: "Terrestrial applications of the same science",
    gapEyebrow: "Open gaps",
    gapTitle: "Quantities not yet determined",
    gaps: [
      ["Flame spread rate at lunar or Martian gravity", "PSI holds no partial-gravity combustion data. LUCI and FM2 are expected to provide it."],
      ["Solid-material flammability above 26.5% O₂", "None of the BASS-II tests reached this level, yet it lies within the planned lunar-habitat range."],
      ["Efficacy of extinguishment methods at lunar-habitat conditions", "FLEX shows the most demanding cases are precisely the lunar-like ones."],
      ["Growth rate of large-scale fires", "The Saffire-I and II tables used here hold few burn times and no spread rates."],
    ],
    ask: "Query Pax on fire safety",
    explorer: "Open in the catalogue",
  },
  es: {
    eyebrow: "Base de evidencia de seguridad contra incendios",
    title: "De la ciencia de la combustión a qué debe proteger una nave",
    lead: "Un incendio en una nave se aborda en cuatro capas: prevención, detección, limitación de la propagación y extinción. Selecciona un entorno para ver qué capas respaldan con mediciones las investigaciones de NASA, cuáles solo las indican y dónde el peligro no está cuantificado.",
    warn: "Esto es evidencia de experimentos de NASA, no un procedimiento operativo. Los procedimientos de tripulación son responsabilidad de NASA y de las agencias espaciales.",
    envTitle: "Selecciona el entorno de ignición",
    envs: { iss: ["Cabina de la ISS", "≈21% O₂ · 14.7 psi · microgravedad"], moon: ["Hábitat lunar", "≈30% O₂ · ≤10.2 psi · 0.16 g"], suit: ["Traje espacial (EVA)", "100% O₂ · 4.3 psi"] } as Record<Env, string[]>,
    phases: { prevent: "Prevención", detect: "Detección", spread: "Limitación de la propagación", suppress: "Extinción" } as Record<Phase, string>,
    status: { known: "Medido", partial: "Parcial", unknown: "Sin datos" } as Record<Status, string>,
    legend: "Medido: respaldado por ensayos registrados. Parcial: hay evidencia, con limitaciones significativas. Sin datos: el peligro no está cuantificado.",
    ladderEyebrow: "Secuencia de respuesta",
    ladderTitle: "Nivel de evidencia de cada paso de respuesta",
    ladderLead: "Cada paso indica la solidez de la evidencia que lo respalda. Ninguno es un procedimiento certificado.",
    earthEyebrow: "Transferencia tecnológica",
    earthTitle: "Aplicaciones terrestres de la misma ciencia",
    gapEyebrow: "Brechas abiertas",
    gapTitle: "Magnitudes aún no determinadas",
    gaps: [
      ["Velocidad de propagación de la llama con gravedad lunar o marciana", "PSI no contiene datos de combustión en gravedad parcial. Se espera que LUCI y FM2 los aporten."],
      ["Inflamabilidad de sólidos por encima de 26.5% de O₂", "Ningún ensayo de BASS-II llegó a ese nivel, que queda dentro del rango previsto para un hábitat lunar."],
      ["Eficacia de los métodos de extinción en condiciones de hábitat lunar", "FLEX muestra que los casos más exigentes son precisamente los de tipo lunar."],
      ["Velocidad de crecimiento de incendios a gran escala", "Las tablas de Saffire-I y II que usamos contienen pocos tiempos de combustión y ninguna velocidad de propagación."],
    ],
    ask: "Consultar a Pax sobre seguridad contra incendios",
    explorer: "Abrir en el catálogo",
  },
};

function Chip({ status, label }: { status: Status; label: string }) {
  return <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}>{label}</span>;
}

function Cites({ ids }: { ids: string[] }) {
  const d = useData();
  if (!ids.length) return null;
  return (
    <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
      {ids.map((id) => {
        const inv = d.investigations.find((i) => i.id === id);
        if (!inv) return null;
        return (
          <Link key={id} href={`/explorer/${id}`} className="underline decoration-dotted hover:text-ink">
            {inv.acronym} · {inv.psiId} · DOI {inv.doi}
          </Link>
        );
      })}
    </p>
  );
}

export default function SafetyView({ stats }: { stats: SafetyStats }) {
  const { lang } = useLang();
  const t = T[lang];
  const d = useData();
  const [env, setEnv] = useState<Env>("moon");
  const grid = cells(stats, lang)[env];
  const earthIds = ["bass-ii", "saffire-i", "same", "flex"];

  return (
    <main>
      <header className="mx-auto max-w-6xl px-4 pt-14">
        <p className="eyebrow">{t.eyebrow}</p>
        <h1 className="mt-1 max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">{t.title}</h1>
        <p className="mt-4 max-w-3xl text-ink-2">{t.lead}</p>
        <p role="note" className="mt-4 max-w-3xl rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">{t.warn}</p>
      </header>

      <Section title={t.envTitle}>
        <div role="radiogroup" aria-label={t.envTitle} className="mt-5 grid gap-3 sm:grid-cols-3">
          {(Object.keys(t.envs) as Env[]).map((k) => (
            <button
              key={k}
              role="radio"
              aria-checked={env === k}
              onClick={() => setEnv(k)}
              className={`card p-4 text-left transition-colors ${env === k ? "ring-2 ring-accent" : "hover:bg-surface-2"}`}
            >
              <div className="font-semibold">{t.envs[k][0]}</div>
              <div className="mt-1 text-xs text-muted">{t.envs[k][1]}</div>
            </button>
          ))}
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2" aria-live="polite">
          {PHASES.map((p) => (
            <article key={p} className="card p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold">{t.phases[p]}</h3>
                <Chip status={grid[p].status} label={t.status[grid[p].status]} />
              </div>
              <p className="mt-2 text-sm text-ink-2">{grid[p].text}</p>
              <Cites ids={grid[p].ids} />
            </article>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">{t.legend}</p>
      </Section>

      <Section eyebrow={t.ladderEyebrow} title={t.ladderTitle}>
        <p className="mt-2 max-w-3xl text-ink-2">{t.ladderLead}</p>
        <ol className="mt-5 grid gap-3 md:grid-cols-2">
          {ladder(stats, lang).map((s) => (
            <li key={s.title} className="card p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold">{s.title}</h3>
                <Chip status={s.status} label={t.status[s.status]} />
              </div>
              <p className="mt-2 text-sm text-ink-2">{s.text}</p>
              <Cites ids={s.ids} />
            </li>
          ))}
        </ol>
      </Section>

      <Section eyebrow={t.earthEyebrow} title={t.earthTitle}>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {d.spinoffs.map((s) => (
            <article key={s.name} className="card p-4">
              <h3 className="font-semibold">{s.name} <span className="font-normal text-muted">· {s.year}</span></h3>
              <p className="mt-1 text-sm text-ink-2">{s.text}</p>
            </article>
          ))}
          {earthIds.map((id) => {
            const inv = d.investigations.find((i) => i.id === id);
            if (!inv?.earthApplication) return null;
            return (
              <article key={id} className="card p-4">
                <h3 className="font-semibold">{inv.acronym}</h3>
                <p className="mt-1 text-sm text-ink-2">{inv.earthApplication}</p>
                <Cites ids={[id]} />
              </article>
            );
          })}
        </div>
      </Section>

      <Section eyebrow={t.gapEyebrow} title={t.gapTitle}>
        <ul className="mt-5 grid gap-3 md:grid-cols-2">
          {t.gaps.map(([h, p]) => (
            <li key={h} className="card border-red-500/30 p-4">
              <h3 className="font-semibold">{h}</h3>
              <p className="mt-1 text-sm text-ink-2">{p}</p>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-wrap gap-3 pb-16">
          <Link href="/ask" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white">{t.ask}</Link>
          <Link href="/explorer" className="rounded-lg border border-line-2 px-4 py-2 text-sm hover:bg-surface-2">{t.explorer}</Link>
        </div>
      </Section>
    </main>
  );
}
