/**
 * Deterministic technical summaries of ONE RunRecord, written by Pax. Pure and deterministic: every sentence is built from fields of the
 * record (nothing is invented, no AI call, works offline). Numbers are the record's own; what is a model estimate is said so.
 */
import type { RunRecord } from "./runRecord.ts";

export type Lang = "en" | "es";
export type ExplainTopic = "what" | "order" | "rupture" | "measures" | "trust";

const f1 = (n: number) => (Math.round(n * 10) / 10).toString();
const short = (n: string) => n.replace(/\s*\([^()]*\)\s*$/, "");
const join = (xs: string[], lang: Lang) =>
  xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} ${lang === "es" ? "y" : "and"} ${xs.at(-1)}`;

export const TOPICS: { id: ExplainTopic; en: string; es: string }[] = [
  { id: "what", en: "Run summary", es: "Resumen de la simulación" },
  { id: "order", en: "Ignition sequence", es: "Secuencia de ignición" },
  { id: "rupture", en: "Rupture assessment", es: "Evaluación de la rotura" },
  { id: "measures", en: "Effect of mitigation measures", es: "Efecto de las medidas de mitigación" },
  { id: "trust", en: "Evidence level and limitations", es: "Nivel de evidencia y limitaciones" },
];

/** Compact text of the run (all taken from the RunRecord) that is sent with a free question so Pax can answer about THIS run. */
export function runContextText(run: RunRecord): string {
  const lines: string[] = [];
  lines.push(`Environment: ${run.env}. Fire started at: ${short(run.startLabel)}. Run ended at ${f1(run.endT)} s. End reason: ${run.endReason} (${run.endWhy}).`);
  lines.push(`Conditions (tag ${run.atmTag}): O2 ${Math.round(run.atm.o2 * 100)} %, pressure ${run.atm.pressureAtm} atm, gravity ${run.atm.gravityG} g, airflow ${run.atm.flowCmS} cm/s. Forced failure demo: ${run.forced ? "yes" : "no"}.`);
  lines.push("Components (final state, ignition second, burning seconds):");
  for (const c of run.components) lines.push(`- ${short(c.name)} [${c.material}]: ${c.finalState}${c.ignitionS === null ? ", never reached" : `, ignited ${f1(c.ignitionS)} s, burned ${c.burningS === null ? "n/a" : f1(c.burningS)} s, from ${c.propagatedFrom}`}`);
  const done = run.measures.filter((m) => m.status === "applied");
  lines.push(done.length ? `Measures applied: ${done.map((m) => `${m.action} at ${f1(m.atS ?? 0)} s (${m.tag})`).join("; ")}.` : "Measures applied: none.");
  const r = run.rupture;
  if (r && r.status !== "none") lines.push(`Energetic component ${short(r.tankLabel)}: ${r.status}${r.ruptureAt === null ? "" : ` at ${f1(r.ruptureAt)} s`}; assumed heating window ${r.window[0]}-${r.window[1]} s (assumption); forced: ${r.forced ? "yes" : "no"}.`);
  lines.push(`Summary: ${run.summary.join(" ")}`);
  return lines.join("\n").slice(0, 3900);
}

export function availableTopics(run: RunRecord): ExplainTopic[] {
  return TOPICS.map((t) => t.id).filter((id) => id !== "rupture" || run.rupture !== null);
}

export function explainRun(run: RunRecord, topic: ExplainTopic, lang: Lang): string {
  const es = lang === "es";
  const reached = run.components.filter((c) => c.ignitionS !== null);
  const notReached = run.components.filter((c) => c.ignitionS === null);

  if (topic === "what") {
    const a = es
      ? `Ignición en ${short(run.startLabel)}; la simulación terminó a los ${f1(run.endT)} s. Causa de finalización: ${run.endWhy}.`
      : `Ignition at ${short(run.startLabel)}; the run ended at ${f1(run.endT)} s. End condition: ${run.endWhy}.`;
    const b = es
      ? `El fuego alcanzó ${reached.length} de ${run.componentCount} componentes.`
      : `The fire reached ${reached.length} of ${run.componentCount} components.`;
    const dmg = run.components.filter((c) => c.finalState === "ruptured" || c.finalState === "damaged");
    const c = dmg.length
      ? es
        ? ` Componentes dañados: ${join(dmg.map((d) => short(d.name)), lang)}.`
        : ` Damaged components: ${join(dmg.map((d) => short(d.name)), lang)}.`
      : "";
    return `${a} ${b}${c}`;
  }

  if (topic === "order") {
    const sorted = [...reached].sort((x, y) => (x.ignitionS ?? 0) - (y.ignitionS ?? 0));
    if (!sorted.length) return es ? "Ningún componente alcanzó la ignición en esta simulación." : "No component ignited in this run.";
    const steps = sorted.slice(0, 6).map((c, i) => (es ? `${i === 0 ? "primero" : "luego"} ${short(c.name)} (${f1(c.ignitionS ?? 0)} s)` : `${i === 0 ? "first" : "then"} ${short(c.name)} (${f1(c.ignitionS ?? 0)} s)`));
    const extra = sorted.length > 6 ? (es ? ` y ${sorted.length - 6} más` : ` and ${sorted.length - 6} more`) : "";
    const nr = notReached.length
      ? es
        ? ` No alcanzados: ${join(notReached.slice(0, 5).map((c) => short(c.name)), lang)}${notReached.length > 5 ? ` y ${notReached.length - 5} más` : ""}.`
        : ` Not reached: ${join(notReached.slice(0, 5).map((c) => short(c.name)), lang)}${notReached.length > 5 ? ` and ${notReached.length - 5} more` : ""}.`
      : es ? " Se alcanzaron todos los componentes." : " All components were reached.";
    const lead = es ? "Secuencia de ignición: " : "Ignition sequence: ";
    return `${lead}${steps.join(", ")}${extra}.${nr} ${es ? "Los tiempos son resultados del modelo, no mediciones." : "The times are model outputs, not measurements."}`;
  }

  if (topic === "rupture") {
    const r = run.rupture;
    if (!r || r.status === "none") {
      return es ? "El fuego no alcanzó ningún componente energético (p. ej., un recipiente a presión); no se produjo rotura." : "The fire did not reach any energetic component (e.g. a pressure vessel); no rupture occurred.";
    }
    const name = short(r.tankLabel);
    if (r.status === "ruptured") {
      const exp = r.exposureS === null ? "" : es ? ` tras ${f1(r.exposureS)} s de exposición térmica` : ` after ${f1(r.exposureS)} s of thermal exposure`;
      const cons = r.consequences.length
        ? es ? ` Componentes afectados: ${join(r.consequences.map((c) => short(c.label)), lang)}.` : ` Affected components: ${join(r.consequences.map((c) => short(c.label)), lang)}.`
        : es ? " Sin componentes afectados dentro del radio declarado." : " No components were affected within the declared radius.";
      return es
        ? `${name} se rompió a los ${f1(r.ruptureAt ?? 0)} s${exp}.${cons} El instante de rotura es una estimación: el modelo asume una ventana de calentamiento de ${r.window[0]}-${r.window[1]} s (supuesto, no dato medido).${r.forced ? " Además, esta rotura fue forzada: es un escenario de demostración, no una predicción." : ""}`
        : `${name} ruptured at ${f1(r.ruptureAt ?? 0)} s${exp}.${cons} The rupture time is an estimate: the model assumes a ${r.window[0]}-${r.window[1]} s heating window (an assumption, not measured data).${r.forced ? " Also, this rupture was forced: it is a demo scenario, not a prediction." : ""}`;
    }
    if (r.status === "relieved") {
      return es
        ? `${name} se calentó, pero una medida alivió su presión a tiempo${r.relievedAt === null ? "" : ` (${f1(r.relievedAt)} s)`} y no se rompió.`
        : `${name} heated up, but a measure relieved its pressure in time${r.relievedAt === null ? "" : ` (${f1(r.relievedAt)} s)`}, so it did not rupture.`;
    }
    return es
      ? `${name} seguía en calentamiento al finalizar la simulación, sin rotura.`
      : `${name} was still heating at the end of the run, with no rupture.`;
  }

  if (topic === "measures") {
    const done = run.measures.filter((m) => m.status === "applied");
    if (!done.length) {
      return es
        ? `No se aplicó ninguna medida de mitigación. Hay ${run.measures.length} disponibles; aplícalas durante la propagación para evaluar su efecto.`
        : `No mitigation measures were applied. ${run.measures.length} are available; apply them during propagation to assess their effect.`;
    }
    const list = done.map((m) => (es ? `${m.action} (a los ${f1(m.atS ?? 0)} s)` : `${m.action} (at ${f1(m.atS ?? 0)} s)`));
    const stopped = run.endReason === "extinguished_by_measure";
    const tail = stopped
      ? es ? " La simulación finalizó porque una medida detuvo el fuego." : " The run ended because a measure stopped the fire."
      : es ? " Ninguna medida detuvo el fuego por completo en esta simulación." : " No measure stopped the fire completely in this run.";
    const nr = notReached.length
      ? es ? ` ${notReached.length} componente(s) quedaron sin alcanzar.` : ` ${notReached.length} component(s) were never reached.`
      : "";
    return (es ? `Medidas aplicadas: ${list.join("; ")}.` : `Measures applied: ${list.join("; ")}.`) + tail + nr +
      (es ? " Nota: el efecto de cada medida es una propuesta de ingeniería (hipótesis), sin datos de ensayo para este modelo." : " Note: each measure's effect is an engineering proposal (hypothesis), with no test data for this model.");
  }

  // trust
  const tag = es ? ({ measured: "medido", reported: "reportado", predicted: "predicho", estimated: "estimado" } as Record<string, string>)[run.atmTag] ?? run.atmTag : run.atmTag;
  return es
    ? `Salida de simulación, no un experimento. Las condiciones de contorno (O₂, presión, gravedad) llevan la etiqueta «${tag}». Niveles de evidencia: medido y reportado proceden de experimentos de NASA; predicho es un modelo calibrado con datos próximos; estimado es un supuesto de ingeniería y nunca se mezcla con datos medidos. PSI no contiene datos de combustión en gravedad parcial, por lo que todo resultado lunar es una extrapolación. Detalle en la pestaña «Evidencia y brechas».`
    : `Simulation output, not an experiment. The boundary conditions (O₂, pressure, gravity) are tagged “${tag}”. Evidence levels: measured and reported derive from NASA experiments; predicted is a model calibrated against nearby data; estimated is an engineering assumption and is never mixed with measured data. The PSI archive holds no partial-gravity combustion data, so any lunar result is an extrapolation. See the “Evidence and gaps” tab for the detail.`;
}
