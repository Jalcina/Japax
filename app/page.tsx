"use client";

import Image from "next/image";
import Link from "next/link";
import { AREA_COLOR, areaLabel, type Area } from "@/lib/data";
import { useData, useLang, useT } from "@/lib/i18n";
import { AreaBadge, Section, SourceTag, Stat } from "@/components/ui";
import CoverageMap from "@/components/CoverageMap";

const AREAS: Area[] = ["prevention", "detection", "suppression", "fundamental"];

const T = {
  en: {
    eyebrow: "NASA Space Apps 2026 · Flame in Freefall",
    h1a: "What will burn first in a",
    h1b: "lunar base",
    lead: "JaPax consolidates three decades of NASA microgravity combustion investigations (PSI, NTRS) into a traceable evidence base: what has been measured, at which atmosphere, pressure, flow and gravity, which investigations are most relevant to lunar and Martian habitats, and where no data exist.",
    ctaSim: "Open the simulator",
    ctaLab: "Raw PSI datasets",
    ctaExp: "Investigation catalogue",
    ctaAsk: "Query Pax",
    s1: "investigations catalogued",
    s1n: (n: number) => `${n} with a verified PSI DOI`,
    s2: "public files in PSI",
    s2n: "summed across all investigations",
    s3: "flame videos",
    s3n: "BASS, BASS-II, CFI, SAME and SPICE",
    s4: "partial-gravity datasets in PSI",
    s4n: "LUCI reported the first extended lunar-g burns (NTRS) but no downloadable data exist yet; FM2 is planned to fly to the Moon in late 2026",
    fEyebrow: "Key findings",
    fTitle: "Three results that constrain spacecraft fire-safety design",
    see: "See",
    f: [
      { kicker: "Habitat atmospheres", title: "Ventilation shutdown is not a sufficient suppression step in O₂-enriched atmospheres", text: "In ACME BRE, flames in O₂-enriched atmospheres were sustained in microgravity under quiescent conditions, with no forced flow; at 21% O₂ they self-extinguished. Cutting ventilation remains an established step for extinguishing spacecraft fires." },
      { kicker: "Material qualification", title: "NASA-STD-6001 Test 1 is not conservative for microgravity", text: "BASS indicates that Test 1, an upward-propagation test at 1 g, does not bound the worst case: the limiting oxygen concentration is lower in microgravity. The minimum appears near an opposed-flow velocity of 10 cm/s, typical of spacecraft ventilation." },
      { kicker: "Suppression", title: "Terrestrial inert-agent standards give a reduced margin in low gravity", text: "FLEX found that the flammability limit is lower in reduced gravity, so terrestrial design standards for inert-gas suppressants (CO₂, He) do not provide the same safety margin." },
    ],
    mEyebrow: "Experimental coverage",
    mTitle: "Tested atmospheres and uncovered envelope",
    mText: "Each region or marker is an atmosphere (O₂ mole fraction, total pressure) that was actually tested. The orange region is the expected lunar-habitat envelope: oxygen-enriched and sub-atmospheric. Coverage there is sparse, and no test was run at lunar gravity (0.16 g).",
    aEyebrow: "Disciplines",
    aTitle: "Prevention, detection, suppression and combustion science",
    aText: {
      prevention: "Qualification of materials and atmospheres: limiting oxygen concentration (LOC) and flammability screening. BASS, BASS-II, Saffire, BRE.",
      detection: "Smoke particle size distribution and early-stage pyrolysis signatures in microgravity. SAME, SAME-R, DAFT.",
      suppression: "Extinction limits and inert-agent margins (CO₂, He). FLEX, FLEX-2.",
      fundamental: "Flame structure and spread physics for model validation. ACME, CFI, SPICE, SLICE.",
    } as Record<Area, string>,
    invs: "investigations",
    qEyebrow: "Evidence classification",
    qTitle: "Every value is traceable and tagged by evidence level",
    qText: "No figure appears without its provenance. Values that lack an experimental source are shown as estimates, never as measurements.",
    q: [
      ["Measured", "Value recorded in a PSI dataset, cited with PSI ID, DOI and sample size."],
      ["Reported", "Value stated in a peer-reviewed paper or NTRS report and not re-derived from raw data."],
      ["Estimated", "Engineering assumption or hypothesis with no experimental source; shown explicitly as such."],
      ["Simulated", "Output of the JaPax component-level spread model (graph, level A)."],
    ] as [string, string][],
    hEyebrow: "Incident record",
    hTitle: "Mishaps that shaped the requirements",
    lesson: "Lesson learned",
    source: "Source",
    eEyebrow: "Technology transfer",
    eTitle: "Spaceflight combustion research with terrestrial applications",
    nEyebrow: "Open gaps",
    nTitle: "Planned experiments and missing data",
    nNote: "JaPax is built to ingest these datasets as soon as they are published in PSI.",
  },
  es: {
    eyebrow: "NASA Space Apps 2026 · Flame in Freefall",
    h1a: "¿Qué arderá primero en una",
    h1b: "base lunar",
    lead: "JaPax consolida tres décadas de investigaciones de combustión en microgravedad de NASA (PSI, NTRS) en una base de evidencia trazable: qué se ha medido, con qué atmósfera, presión, flujo y gravedad, qué investigaciones son más relevantes para hábitats lunares y marcianos, y dónde no existen datos.",
    ctaSim: "Abrir el simulador",
    ctaLab: "Conjuntos de datos PSI",
    ctaExp: "Catálogo de investigaciones",
    ctaAsk: "Consultar a Pax",
    s1: "investigaciones catalogadas",
    s1n: (n: number) => `${n} con DOI de PSI verificado`,
    s2: "archivos públicos en PSI",
    s2n: "sumados en todas las investigaciones",
    s3: "vídeos de llamas",
    s3n: "BASS, BASS-II, CFI, SAME y SPICE",
    s4: "conjuntos de datos de gravedad parcial en PSI",
    s4n: "LUCI reportó las primeras combustiones prolongadas en g lunar (NTRS), pero aún no hay datos descargables; FM2 volará a la Luna a finales de 2026",
    fEyebrow: "Hallazgos clave",
    fTitle: "Tres resultados que condicionan el diseño de seguridad contra incendios en naves",
    see: "Ver",
    f: [
      { kicker: "Atmósferas de hábitat", title: "Cortar la ventilación no basta como paso de supresión en atmósferas enriquecidas en O₂", text: "En ACME BRE, las llamas en atmósferas enriquecidas en O₂ se mantuvieron en microgravedad en condiciones quiescentes, sin flujo forzado; a 21% de O₂ se autoextinguieron. Cortar la ventilación sigue siendo un paso establecido para extinguir incendios en naves." },
      { kicker: "Calificación de materiales", title: "NASA-STD-6001 Test 1 no es conservador en microgravedad", text: "BASS indica que el Test 1, un ensayo de propagación ascendente a 1 g, no acota el peor caso: la concentración límite de oxígeno es menor en microgravedad. El mínimo aparece hacia una velocidad de flujo opuesto de 10 cm/s, típica de la ventilación de una nave." },
      { kicker: "Supresión", title: "Los estándares terrestres de agentes inertes ofrecen menos margen en gravedad reducida", text: "FLEX encontró que el límite de inflamabilidad es menor en gravedad reducida, por lo que los estándares de diseño terrestres para supresores de gas inerte (CO₂, He) no proporcionan el mismo margen de seguridad." },
    ],
    mEyebrow: "Cobertura experimental",
    mTitle: "Atmósferas ensayadas y envolvente sin cubrir",
    mText: "Cada región o marcador es una atmósfera (fracción molar de O₂, presión total) realmente ensayada. La región naranja es la envolvente prevista de un hábitat lunar: enriquecida en oxígeno y subatmosférica. La cobertura ahí es escasa y no se ha ensayado a gravedad lunar (0.16 g).",
    aEyebrow: "Disciplinas",
    aTitle: "Prevención, detección, supresión y ciencia de la combustión",
    aText: {
      prevention: "Calificación de materiales y atmósferas: concentración límite de oxígeno (LOC) y cribado de inflamabilidad. BASS, BASS-II, Saffire, BRE.",
      detection: "Distribución de tamaños de partículas de humo y firmas de pirólisis en fase temprana en microgravedad. SAME, SAME-R, DAFT.",
      suppression: "Límites de extinción y márgenes de agentes inertes (CO₂, He). FLEX, FLEX-2.",
      fundamental: "Estructura de llama y física de la propagación para validación de modelos. ACME, CFI, SPICE, SLICE.",
    } as Record<Area, string>,
    invs: "investigaciones",
    qEyebrow: "Clasificación de la evidencia",
    qTitle: "Cada valor es trazable y lleva su nivel de evidencia",
    qText: "Ninguna cifra aparece sin su procedencia. Los valores sin fuente experimental se muestran como estimaciones, nunca como mediciones.",
    q: [
      ["Medido", "Valor registrado en un conjunto de datos PSI, citado con PSI ID, DOI y tamaño muestral."],
      ["Reportado", "Valor expuesto en un artículo revisado por pares o un informe NTRS, no rederivado a partir de datos brutos."],
      ["Estimado", "Supuesto de ingeniería o hipótesis sin fuente experimental; se muestra explícitamente como tal."],
      ["Simulado", "Resultado del modelo de propagación por componentes de JaPax (grafo, nivel A)."],
    ] as [string, string][],
    hEyebrow: "Registro de incidentes",
    hTitle: "Siniestros que moldearon los requisitos",
    lesson: "Lección aprendida",
    source: "Fuente",
    eEyebrow: "Transferencia tecnológica",
    eTitle: "Investigación de combustión espacial con aplicaciones terrestres",
    nEyebrow: "Brechas abiertas",
    nTitle: "Experimentos previstos y datos pendientes",
    nNote: "JaPax está preparado para incorporar estos conjuntos de datos en cuanto se publiquen en PSI.",
  },
};

const FINDING_META = [
  { id: "acme-bre", src: "PSI", psi: "PSI-20" },
  { id: "bass", src: "GUIDE p.31", psi: "PSI-26" },
  { id: "flex", src: "GUIDE p.12", psi: "PSI-69" },
];

export default function Home() {
  const t = useT(T);
  const { lang } = useLang();
  const data = useData();
  const totalFiles = data.investigations.reduce((s, i) => s + i.files.total, 0);
  const totalVideos = data.investigations.reduce((s, i) => s + i.files.videos, 0);
  const withDoi = data.investigations.filter((i) => i.doi).length;
  const loc = lang === "es" ? "es" : "en";

  return (
    <>
      {/* HERO */}
      <section className="mx-auto max-w-6xl px-4 pt-14 sm:pt-20">
        <Image
          src="/brand/japax-logo.png"
          alt="JaPax — Space fire safety"
          width={1305}
          height={1334}
          priority
          className="mb-8 h-auto w-44 sm:w-56 lg:float-right lg:mb-0 lg:ml-8 lg:w-72"
        />
        <p className="eyebrow">{t.eyebrow}</p>
        <h1 className="mt-3 max-w-4xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
          {t.h1a} <span style={{ color: "var(--accent)" }}>{t.h1b}</span>?
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-ink-2">{t.lead}</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/simulator" className="rounded-lg bg-accent px-5 py-2.5 font-medium text-black hover:brightness-110">
            {t.ctaSim}
          </Link>
          <Link href="/simulator#data" className="rounded-lg border border-line-2 px-5 py-2.5 text-ink hover:bg-surface-2">
            {t.ctaLab}
          </Link>
          <Link href="/explorer" className="rounded-lg border border-line-2 px-5 py-2.5 text-ink hover:bg-surface-2">
            {t.ctaExp}
          </Link>
          <Link href="/ask" className="rounded-lg border border-line-2 px-5 py-2.5 text-ink hover:bg-surface-2">
            {t.ctaAsk}
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat value={String(data.investigations.length)} label={t.s1} note={t.s1n(withDoi)} />
          <Stat value={totalFiles.toLocaleString(loc)} label={t.s2} note={t.s2n} />
          <Stat value={String(totalVideos)} label={t.s3} note={t.s3n} />
          <Stat value="0" label={t.s4} note={t.s4n} />
        </div>
      </section>

      {/* FINDINGS */}
      <Section eyebrow={t.fEyebrow} title={t.fTitle}>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {t.f.map((f, i) => (
            <article key={FINDING_META[i].id} className="card flex flex-col p-5">
              <p className="eyebrow">{f.kicker}</p>
              <h3 className="mt-2 text-lg font-semibold leading-snug">{f.title}</h3>
              <p className="mt-3 flex-1 text-sm text-ink-2">{f.text}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <SourceTag src={FINDING_META[i].src} />
                <Link href={`/explorer/${FINDING_META[i].id}`} className="link text-sm">
                  {t.see} {FINDING_META[i].psi} →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </Section>

      {/* MAP */}
      <Section eyebrow={t.mEyebrow} title={t.mTitle}>
        <p className="mt-3 max-w-3xl text-ink-2">{t.mText}</p>
        <div className="mt-6">
          <CoverageMap />
        </div>
      </Section>

      {/* AREAS */}
      <Section eyebrow={t.aEyebrow} title={t.aTitle}>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {AREAS.map((a) => {
            const n = data.investigations.filter((i) => i.areas.includes(a)).length;
            return (
              <Link key={a} href="/explorer" className="card p-4 transition-colors hover:bg-surface-2">
                <div className="h-1 w-10 rounded" style={{ background: AREA_COLOR[a] }} />
                <h3 className="mt-3 font-semibold">{areaLabel(a, lang)}</h3>
                <p className="mt-1 text-sm text-ink-2">{t.aText[a]}</p>
                <p className="mt-3 text-xs text-muted">
                  {n} {t.invs}
                </p>
              </Link>
            );
          })}
        </div>
      </Section>

      {/* EVIDENCE CLASSIFICATION */}
      <Section eyebrow={t.qEyebrow} title={t.qTitle}>
        <p className="mt-3 max-w-3xl text-ink-2">{t.qText}</p>
        <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {t.q.map(([k, d]) => (
            <div key={k} className="card p-4">
              <dt className="font-semibold">{k}</dt>
              <dd className="mt-1 text-sm text-ink-2">{d}</dd>
            </div>
          ))}
        </dl>
      </Section>

      {/* HISTORY */}
      <Section eyebrow={t.hEyebrow} title={t.hTitle}>
        <ol className="mt-6 grid gap-4 md:grid-cols-2">
          {data.incidents.map((inc) => (
            <li key={inc.name} className="card p-5">
              <div className="flex items-baseline gap-3">
                <span className="text-2xl font-semibold" style={{ color: "var(--accent)" }}>
                  {inc.year}
                </span>
                <h3 className="font-semibold">{inc.name}</h3>
              </div>
              <p className="mt-2 text-sm text-ink-2">{inc.text}</p>
              <p className="mt-2 text-sm">
                <span className="text-muted">{t.lesson}: </span>
                {inc.lesson}
              </p>
              <a className="link mt-2 inline-block text-xs" href={inc.src} target="_blank" rel="noreferrer">
                {t.source} ↗
              </a>
            </li>
          ))}
        </ol>
      </Section>

      {/* EARTH */}
      <Section eyebrow={t.eEyebrow} title={t.eTitle}>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {data.spinoffs.map((s) => (
            <article key={s.src} className="card p-5">
              <p className="eyebrow">{s.year}</p>
              <h3 className="mt-1 font-semibold">{s.name}</h3>
              <p className="mt-2 text-sm text-ink-2">{s.text}</p>
              <a className="link mt-3 inline-block text-xs" href={s.src} target="_blank" rel="noreferrer">
                {t.source} ↗
              </a>
            </article>
          ))}
        </div>
      </Section>

      {/* FUTURE */}
      <Section eyebrow={t.nEyebrow} title={t.nTitle}>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {data.upcoming.map((u) => (
            <div key={u.acronym} className="card p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{u.acronym}</h3>
                <span className="text-xs text-muted">{u.gravity}</span>
              </div>
              <p className="text-sm text-ink-2">{u.name}</p>
              <p className="mt-2 text-sm text-ink-2">{u.note}</p>
              <div className="mt-2">
                <SourceTag src={u.src} />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted">
          <AreaBadge area="fundamental" /> {t.nNote}
        </p>
      </Section>
    </>
  );
}
