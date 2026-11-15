"use client";

import Link from "next/link";
import lab from "@/data/lab.json";
import { useData, useT } from "@/lib/i18n";

/**
 * Which investigations inform which next-generation fire-safety equipment.
 * Application text comes from the investigation records (spaceApplication, sensors); row counts come from
 * data/lab.json. The "gap" lines are factual limits found in the Phase-1 audit (INFORME-FASE1.txt).
 */

const ROWS: Record<string, { n: number; plan?: boolean; note?: "teflon" | "inventory" | "noOutcomes" | "samples" | "publication" | "burns"; count?: number }> = {
  same: { n: lab.same.rows.length, note: "teflon" },
  "same-r": { n: lab.samer.rows.length },
  "daft-daft-2": { n: lab.daft.rows.length },
  flex: { n: lab.flex.rows.length },
  "flex-2": { n: lab.flex2.rows.length, plan: true },
  bass: { n: lab.bass.rows.length, note: "inventory" },
  "bass-ii": { n: lab.bass2.rows.length, note: "noOutcomes" },
  "saffire-i": { n: lab.saffire1.rows.length, note: "samples" },
  "saffire-ii": { n: lab.saffire2.rows.length },
  "saffire-iii": { n: lab.saffire3.rows.length, note: "publication" },
  // All table rows, and how many of them recorded a flame that actually burned (burn time > 0).
  "acme-cfi-g": {
    n: lab.cfigNormal.rows.length + lab.cfigInverse.rows.length,
    note: "burns",
    count: [...lab.cfigNormal.rows, ...lab.cfigInverse.rows].filter((r) => (r.burnTimeSec ?? 0) > 0).length,
  },
  "acme-flame-design": { n: lab.acmeNormal.rows.length + lab.acmeInverse.rows.length },
};

const SYSTEMS = [
  { id: "detect", color: "var(--a-detection)", ids: ["same", "same-r", "daft-daft-2"] },
  { id: "suppress", color: "var(--a-suppression)", ids: ["flex", "flex-2", "bass-ii"] },
  { id: "materials", color: "var(--a-prevention)", ids: ["bass", "bass-ii", "saffire-i", "saffire-ii", "saffire-iii"] },
  { id: "models", color: "var(--accent)", ids: ["acme-cfi-g", "acme-flame-design", "flex"] },
];

const T = {
  en: {
    eyebrow: "Next-generation equipment",
    title: "Which research builds which safety equipment?",
    intro: "Each card is a piece of fire-safety equipment for the Moon and beyond, with the NASA investigations that feed its design. The text comes from the investigation records; the gap line says what no experiment covers yet.",
    systems: {
      detect: { name: "Smoke and fire detectors", need: "Detectors must recognise low-gravity smoke, which behaves differently from smoke on Earth, and not confuse it with dust.", gap: "No smoke measurement exists at lunar oxygen or gravity: the tables are for the ISS atmosphere." },
      suppress: { name: "Extinguishing systems", need: "Suppression design needs to know how much CO₂ or helium stops a flame, and at which oxygen level.", gap: "FLEX burned liquid droplets, not materials, and nothing was tested at lunar gravity or above 34% oxygen." },
      materials: { name: "Material selection and screening", need: "Choosing cabin materials relies on knowing which ones keep burning in low gravity and at what airflow.", gap: "BASS-II reached only 22.2% oxygen, below the ~30% of a lunar habitat; SAFFIRE has a handful of samples." },
      models: { name: "Fire models and habitat design", need: "Computer models set the oxygen and pressure of habitats and suits, and they need measured flames to be checked against.", gap: "These flames are gas or droplet flames in microgravity; the models are not yet validated at 0.166 g." },
    } as Record<string, { name: string; need: string; gap: string }>,
    informs: "Informs",
    rows: "table rows",
    plan: "test plan, not results",
    notes: { teflon: "4 rows with values (Teflon)", inventory: "inventory only", noOutcomes: "conditions, no outcomes", samples: "2 samples", publication: "results in the publication", burns: "{n} with a burn" } as Record<string, string>,
    open: "Open",
    measured: "measured",
    chk: "Linked to the investigation record in the investigation catalogue",
  },
  es: {
    eyebrow: "Equipos de nueva generación",
    title: "¿Qué investigación construye qué equipo de seguridad?",
    intro: "Cada tarjeta es un equipo de seguridad contra incendios para la Luna y más allá, con las investigaciones de la NASA que alimentan su diseño. El texto viene de las fichas de cada investigación; la línea de brecha dice qué no cubre todavía ningún experimento.",
    systems: {
      detect: { name: "Detectores de humo y fuego", need: "Los detectores deben reconocer el humo en baja gravedad, que se comporta de forma distinta a como lo hace en la Tierra, y no confundirlo con polvo.", gap: "No hay medidas de humo con el oxígeno ni la gravedad lunares: las tablas son de la atmósfera de la ISS." },
      suppress: { name: "Sistemas de extinción", need: "El diseño de supresión necesita saber cuánto CO₂ o helio apaga una llama y con qué nivel de oxígeno.", gap: "FLEX quemó gotas de líquido, no materiales, y no se probó a gravedad lunar ni por encima del 34% de oxígeno." },
      materials: { name: "Selección y cribado de materiales", need: "Elegir los materiales de la cabina exige saber cuáles siguen ardiendo en baja gravedad y con qué flujo de aire.", gap: "BASS-II solo llegó al 22.2% de oxígeno, por debajo del ~30% de un hábitat lunar; SAFFIRE tiene unas pocas muestras." },
      models: { name: "Modelos de fuego y diseño de hábitats", need: "Los modelos por ordenador fijan el oxígeno y la presión de hábitats y trajes, y necesitan llamas medidas para contrastarlos.", gap: "Son llamas de gas o de gotas en microgravedad; los modelos aún no están validados a 0.166 g." },
    } as Record<string, { name: string; need: string; gap: string }>,
    informs: "Informa",
    rows: "filas de la tabla",
    plan: "plan de ensayos, no resultados",
    notes: { teflon: "4 filas con valores (Teflon)", inventory: "solo inventario", noOutcomes: "condiciones, sin resultados", samples: "2 muestras", publication: "resultados en la publicación", burns: "{n} con combustión" } as Record<string, string>,
    open: "Abrir",
    measured: "medido",
    chk: "Enlazado con la ficha de la investigación en el catálogo de investigaciones",
  },
};

export default function EquipmentMap() {
  const t = useT(T);
  const data = useData();

  return (
    <section className="mx-auto max-w-6xl px-4 pt-16" aria-labelledby="equip">
      <p className="eyebrow">{t.eyebrow}</p>
      <h2 id="equip" className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{t.title}</h2>
      <p className="mt-3 max-w-3xl text-sm text-ink-2">{t.intro}</p>

      <ul className="mt-5 grid gap-4 md:grid-cols-2">
        {SYSTEMS.map((s) => {
          const info = t.systems[s.id];
          const invs = s.ids.map((id) => data.investigations.find((i) => i.id === id)).filter((i): i is NonNullable<typeof i> => Boolean(i));
          return (
            <li key={s.id} className="card p-5" style={{ borderTop: `3px solid ${s.color}` }}>
              <h3 className="text-lg font-semibold">{info.name}</h3>
              <p className="mt-1 text-sm text-ink-2">{info.need}</p>
              <ul className="mt-3 space-y-2">
                {invs.map((inv) => {
                  const r = ROWS[inv.id];
                  return (
                    <li key={inv.id} className="rounded-lg bg-surface-2/60 p-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <Link href={`/explorer/${inv.id}`} className="font-semibold hover:underline" aria-label={`${t.open} ${inv.acronym}. ${t.chk}`}>{inv.acronym}</Link>
                        <span className="text-xs text-muted">
                          {inv.psiId}
                          {inv.doi && <> · <a className="link" href={`https://doi.org/${inv.doi}`} target="_blank" rel="noreferrer">DOI {inv.doi}</a></>}
                        </span>
                      </div>
                      {inv.spaceApplication && <p className="mt-1 text-sm text-ink-2">{t.informs}: {inv.spaceApplication}</p>}
                      {r && (
                        <p className="mt-1 text-xs text-muted">
                          {r.n} {t.rows}{r.plan ? ` · ${t.plan}` : r.note ? ` · ${t.notes[r.note].replace("{n}", String(r.count ?? ""))}` : ""}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-xs text-muted">{info.gap}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
