/**
 * Plain-language explanations of ONE RunRecord, written by Pax. Pure and deterministic: every sentence is built from fields of the
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
  { id: "what", en: "What happened?", es: "¿Qué ha pasado?" },
  { id: "order", en: "In what order did parts burn?", es: "¿En qué orden ardieron las partes?" },
  { id: "rupture", en: "What about the rupture?", es: "¿Y la rotura?" },
  { id: "measures", en: "Did my measures matter?", es: "¿Importaron mis medidas?" },
  { id: "trust", en: "How much can I trust this?", es: "¿Cuánto me puedo fiar?" },
];

export function availableTopics(run: RunRecord): ExplainTopic[] {
  return TOPICS.map((t) => t.id).filter((id) => id !== "rupture" || run.rupture !== null);
}

export function explainRun(run: RunRecord, topic: ExplainTopic, lang: Lang): string {
  const es = lang === "es";
  const reached = run.components.filter((c) => c.ignitionS !== null);
  const notReached = run.components.filter((c) => c.ignitionS === null);

  if (topic === "what") {
    const a = es
      ? `El fuego empezó en ${short(run.startLabel)} y la simulación terminó a los ${f1(run.endT)} s. Motivo: ${run.endWhy}.`
      : `The fire started at ${short(run.startLabel)} and the simulation ended at ${f1(run.endT)} s. Reason: ${run.endWhy}.`;
    const b = es
      ? `Llegó a ${reached.length} de ${run.componentCount} componentes.`
      : `It reached ${reached.length} of ${run.componentCount} components.`;
    const dmg = run.components.filter((c) => c.finalState === "ruptured" || c.finalState === "damaged");
    const c = dmg.length
      ? es
        ? ` Con daños: ${join(dmg.map((d) => short(d.name)), lang)}.`
        : ` Damaged: ${join(dmg.map((d) => short(d.name)), lang)}.`
      : "";
    return `${a} ${b}${c}`;
  }

  if (topic === "order") {
    const sorted = [...reached].sort((x, y) => (x.ignitionS ?? 0) - (y.ignitionS ?? 0));
    if (!sorted.length) return es ? "En esta simulación no llegó a arder ningún componente." : "No component ignited in this run.";
    const steps = sorted.slice(0, 6).map((c, i) => (es ? `${i === 0 ? "primero" : "luego"} ${short(c.name)} (${f1(c.ignitionS ?? 0)} s)` : `${i === 0 ? "first" : "then"} ${short(c.name)} (${f1(c.ignitionS ?? 0)} s)`));
    const extra = sorted.length > 6 ? (es ? ` y ${sorted.length - 6} más` : ` and ${sorted.length - 6} more`) : "";
    const nr = notReached.length
      ? es
        ? ` Nunca llegó a: ${join(notReached.slice(0, 5).map((c) => short(c.name)), lang)}${notReached.length > 5 ? ` y ${notReached.length - 5} más` : ""}.`
        : ` It never reached: ${join(notReached.slice(0, 5).map((c) => short(c.name)), lang)}${notReached.length > 5 ? ` and ${notReached.length - 5} more` : ""}.`
      : es ? " Alcanzó todos los componentes." : " It reached every component.";
    const lead = es ? "El fuego fue pasando así: " : "The fire moved like this: ";
    return `${lead}${steps.join(", ")}${extra}.${nr} ${es ? "Los tiempos son simulados y los calcula el modelo, no son medidas." : "The times are simulated by the model, not measurements."}`;
  }

  if (topic === "rupture") {
    const r = run.rupture;
    if (!r || r.status === "none") {
      return es ? "En esta simulación no llegó el fuego a ningún componente energético (por ejemplo un depósito a presión), así que no hubo rotura." : "The fire never reached an energetic component (for example a pressure vessel), so nothing ruptured.";
    }
    const name = short(r.tankLabel);
    if (r.status === "ruptured") {
      const exp = r.exposureS === null ? "" : es ? ` tras calentarse ${f1(r.exposureS)} s` : ` after being heated for ${f1(r.exposureS)} s`;
      const cons = r.consequences.length
        ? es ? ` Alcanzó a: ${join(r.consequences.map((c) => short(c.label)), lang)}.` : ` It hit: ${join(r.consequences.map((c) => short(c.label)), lang)}.`
        : es ? " No afectó a vecinos dentro del radio declarado." : " No neighbours were hit inside the declared radius.";
      return es
        ? `${name} se rompió a los ${f1(r.ruptureAt ?? 0)} s${exp}.${cons} El momento es una estimación: el modelo supone una ventana de calentamiento de ${r.window[0]}-${r.window[1]} s, que es una suposición y no un dato medido.${r.forced ? " Además, esta rotura fue forzada: es un escenario de demostración, no una predicción." : ""}`
        : `${name} ruptured at ${f1(r.ruptureAt ?? 0)} s${exp}.${cons} The timing is an estimate: the model assumes a ${r.window[0]}-${r.window[1]} s heating window, which is an assumption, not measured data.${r.forced ? " Also, this rupture was forced: it is a demo scenario, not a prediction." : ""}`;
    }
    if (r.status === "relieved") {
      return es
        ? `${name} llegó a calentarse, pero una medida le alivió la presión a tiempo${r.relievedAt === null ? "" : ` (${f1(r.relievedAt)} s)`} y no se rompió.`
        : `${name} got hot, but a measure relieved its pressure in time${r.relievedAt === null ? "" : ` (${f1(r.relievedAt)} s)`}, so it did not rupture.`;
    }
    return es
      ? `${name} se estaba calentando cuando terminó la simulación, sin llegar a romperse.`
      : `${name} was still heating when the simulation ended and had not ruptured.`;
  }

  if (topic === "measures") {
    const done = run.measures.filter((m) => m.status === "applied");
    if (!done.length) {
      return es
        ? `No aplicaste ninguna medida. Hay ${run.measures.length} disponibles: pruébalas mientras el fuego arde y mira cómo cambia el resultado.`
        : `You applied no measures. ${run.measures.length} are available: try them while the fire burns and see how the result changes.`;
    }
    const list = done.map((m) => (es ? `${m.action} (a los ${f1(m.atS ?? 0)} s)` : `${m.action} (at ${f1(m.atS ?? 0)} s)`));
    const stopped = run.endReason === "extinguished_by_measure";
    const tail = stopped
      ? es ? " La simulación terminó precisamente porque una medida detuvo el fuego." : " The run ended precisely because a measure stopped the fire."
      : es ? " Ninguna medida detuvo el fuego por completo en esta simulación." : " No measure stopped the fire completely in this run.";
    const nr = notReached.length
      ? es ? ` ${notReached.length} componente(s) quedaron sin alcanzar.` : ` ${notReached.length} component(s) were never reached.`
      : "";
    return (es ? `Aplicaste: ${list.join("; ")}.` : `You applied: ${list.join("; ")}.`) + tail + nr +
      (es ? " Ojo: el efecto de cada medida es una propuesta de ingeniería (hipótesis), sin datos de ensayo para este modelo." : " Note: each measure's effect is an engineering proposal (hypothesis), with no test data for this model.");
  }

  // trust
  const tag = es ? ({ measured: "medido", reported: "reportado", predicted: "predicho", estimated: "estimado" } as Record<string, string>)[run.atmTag] ?? run.atmTag : run.atmTag;
  return es
    ? `Esto es una simulación, no un experimento. Las condiciones (oxígeno, presión, gravedad) están marcadas como «${tag}». Cada dato lleva su nivel: medido y reportado vienen de experimentos de la NASA; predicho es un modelo calibrado con datos cercanos; estimado es una suposición nuestra y nunca se mezcla con lo medido. No hay datos de combustión en gravedad parcial en el archivo PSI, así que lo lunar es extrapolación. Pestaña «Evidencia y huecos» para el detalle.`
    : `This is a simulation, not an experiment. The conditions (oxygen, pressure, gravity) are tagged “${tag}”. Every datum carries its level: measured and reported come from NASA experiments; predicted is a model calibrated with nearby data; estimated is our own assumption and is never mixed with measured data. The PSI archive has no partial-gravity combustion data, so anything lunar is extrapolation. See the “Evidence and gaps” tab for the detail.`;
}
