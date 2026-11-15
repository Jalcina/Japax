/**
 * The immutable record of ONE simulation run (pure, testable with plain node). It is the single source of truth: the results window,
 * the CSV (lib/componentCsv.ts) and the .txt report (buildReportTxt) are generated ONLY from it, never from a parallel log.
 *
 * COMPLETENESS RULE: nothing is summarised away and no field is empty. When a datum does not exist the text says "not available" and why.
 * Times are simulated seconds; in this engine they equal real-equivalent seconds (the on-screen playback speed is a UI control only).
 */
import type { Catalog, CMeasure } from "./componentCatalog.ts";
import { END_ID, type CEvent, type EndReason } from "./componentSpread.ts";
import { energeticOf, ruptureReport, shortLabel, type RuptureReport } from "./componentReport.ts";
import { spreadFactors, type Atm } from "./labPhysics.ts";
import { esText, MATERIAL_ES, END_REASON_ES } from "./componentEs.ts";

export interface TimelineRow { t: number; componentId: string; component: string; state: string; level: string; source: string; reason: string }
export interface ComponentRow {
  id: string; name: string; material: string; finalState: string;
  ignitionS: number | null; burningS: number | null; propagatedFrom: string; damage: string; note: string;
}
export interface MetricRow { key: string; label: string; value: string; unit: string; note: string }
export interface MeasureRow { id: string; action: string; status: "applied" | "offered"; atS: number | null; ladder: string; effect: string; tag: string; source: string }
export interface PhaseRow { phase: string; walked: string; evidence: string }
export interface FactorRow { name: string; value: string; tag: string; source: string }

export interface RunRecord {
  runId: string;
  timestampUtc: string;
  appVersion: string;
  env: string;
  startComponent: string;
  startLabel: string;
  atm: Atm;
  /** tag of the atmosphere values themselves (estimated for the Moon and the suit) */
  atmTag: string;
  forced: boolean;
  measuredOnly: boolean;
  measuresApplied: Record<string, number>;
  endReason: EndReason;
  endT: number;
  endWhy: string;
  summary: string[];
  /** the engine's events for this run, the terminal event included: what the timeline plays */
  events: CEvent[];
  timeline: TimelineRow[];
  components: ComponentRow[];
  metrics: MetricRow[];
  measures: MeasureRow[];
  rupture: RuptureReport | null;
  phases: PhaseRow[];
  factors: FactorRow[];
  gaps: string[];
  labels: Record<string, string>;
  componentCount: number;
}

export const END_TEXT_UI: Record<string, string> = {
  extinguished_by_suppression_system: "the lab's own suppression system put the surface fire out",
  interrupted_by_user: "the run was stopped before it ended (a new ignition was started or the environment was left); events after that moment never happened",
  in_progress: "the run had not ended yet when this record was taken; events after that moment have not happened",
};

/** Safety-ladder evidence per environment, from app/safety/SafetyView.tsx (known / partial / unknown). */
export const SAFETY_EVIDENCE: Record<string, Record<string, string>> = {
  iss: {
    prevent: "known: BASS-II burned materials in microgravity at air-like oxygen (PSI-25)",
    detect: "known: SAME measured spacecraft smoke particles, 100-200 nm on average",
    spread: "partial: Saffire-I/II/III observed spread on large samples; spread is observed, not modelled",
    suppress: "partial: FLEX (PSI-69) droplet tests with CO2 and helium; the flammability limit is lower in reduced gravity",
  },
  "iss-interior": {
    prevent: "known: BASS-II burned materials in microgravity at air-like oxygen (PSI-25)",
    detect: "known: SAME measured spacecraft smoke particles, 100-200 nm on average",
    spread: "partial: Saffire-I/II/III observed spread on large samples; spread is observed, not modelled",
    suppress: "partial: FLEX (PSI-69) droplet tests with CO2 and helium; the flammability limit is lower in reduced gravity",
  },
  moon: {
    prevent: "partial: no BASS-II solid-material test reached 26.5 % O2; BRE gas flames kept burning without airflow in oxygen-enriched air",
    detect: "unknown: the smoke baseline comes from ISS air; no detector results at lunar oxygen, pressure or gravity",
    spread: "unknown: PSI holds no partial-gravity combustion data; LUCI (2025) and FM2 are the first",
    suppress: "partial: of the FLEX tests at lunar-like conditions few ended in extinction; suppression there is the least understood step",
  },
  earth: {
    prevent: "not available: the safety page has no entry for Earth",
    detect: "not available: the safety page has no entry for Earth",
    spread: "not available: the PSI experiments are microgravity tests, so 1 g on Earth is the least evidenced side of the lab",
    suppress: "not available: the safety page has no entry for Earth",
  },
  suit: {
    prevent: "unknown: no verified test at 100 % O2 and 4.3 psi",
    detect: "unknown: no verified data",
    spread: "unknown: no verified data",
    suppress: "unknown: no verified data",
  },
};

const r1 = (n: number) => (Math.round(n * 10) / 10).toString();

export function deepFreeze<T>(o: T): T {
  if (o && typeof o === "object" && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o as Record<string, unknown>)) deepFreeze(v);
  }
  return o;
}

export interface BuildInput {
  runId: string;
  timestampUtc: string;
  appVersion: string;
  env: string;
  source: string;
  atm: Atm;
  atmTag: string;
  forced: boolean;
  measuredOnly: boolean;
  applied: Record<string, number>;
  /** full engine events of the run (the terminal event included) */
  events: CEvent[];
  catalog: Catalog;
  /** set when the run did NOT reach the engine's own end: it is cut at that moment with that reason */
  endAt?: { t: number; reason: EndReason };
  /** language of the generated text; English (the default) is the canonical, tested record, Spanish is a display translation of it */
  lang?: "en" | "es";
}

export function buildRunRecord(inp: BuildInput): RunRecord {
  const cat = inp.catalog;
  const es = inp.lang === "es";
  const tr = (en: string, sp: string) => (es ? sp : en);
  const X = (t: string) => (es ? esText(t) : t);
  const NA = (why: string) => tr(`not available: ${why}`, `no disponible: ${why}`);
  const NAV = tr("not available", "no disponible");
  /** the end reason as the reader should see it (the raw code stays in `endReason` and in the end_reason metric value) */
  const reasonName = (r: string) => (es ? END_REASON_ES[r] ?? r : r);
  const comp = new Map(cat.components.map((c) => [c.id, c]));
  const label = (id: string) => (id === END_ID ? X("(whole simulation)") : X(comp.get(id)?.label ?? id));
  const tank = energeticOf(cat);

  // cut the run when it was stopped early; otherwise the engine's own terminal event closes it
  let events = inp.events.slice();
  if (inp.endAt) {
    const at = inp.endAt;
    events = events.filter((e) => e.state !== "end" && e.t <= at.t);
    events.push({ t: at.t, componentId: END_ID, state: "end", tag: "estimated", endReason: at.reason, reason: `Simulation ended (${at.reason}): ${END_TEXT_UI[at.reason] ?? "stopped"}` });
  }
  const endEv = events[events.length - 1];
  const endReason = endEv.endReason as EndReason;
  const endT = endEv.t;
  const endWhy0 = endEv.reason.replace(/^Simulation ended \([a-z_]+\): /, "");
  const endWhy = X(endWhy0);

  const measureById = new Map<string, CMeasure>();
  for (const c of cat.components) for (const m of c.measures) measureById.set(m.id, m);
  const sourceOf = (e: CEvent): string => {
    const m = /measure "([^"]+)"/.exec(e.reason);
    const mm = m ? measureById.get(m[1]) : undefined;
    if (mm) return X(mm.effect.src);
    if (tank?.energetic && e.componentId === tank.id && (e.state === "ruptured" || e.state === "relieved")) return X(tank.energetic.failureMode.src);
    if (e.state === "end") return X("JaPax component engine: end rule of lib/componentSpread.ts");
    if (e.state === "not_reached" && e.tag === "reported") return X("labPhysics.spreadFactors: PSI-20 ACME BRE (reported), no airflow near 21 % O2 in 0 g");
    return X("JaPax component engine (lib/componentSpread) with labPhysics.spreadFactors; SAFFIRE anchor NTRS 20180005168 scaled by estimated factors");
  };

  const timeline: TimelineRow[] = events.map((e) => ({
    t: e.t, componentId: e.componentId, component: label(e.componentId), state: e.state, level: e.tag, source: sourceOf(e), reason: X(e.reason),
  }));

  const startLabel = label(inp.source);
  const components: ComponentRow[] = cat.components.map((c) => {
    const ev = events.filter((e) => e.componentId === c.id);
    const burn = ev.find((e) => e.state === "burning");
    const rup = ev.find((e) => e.state === "ruptured");
    const dmg = ev.find((e) => e.state === "damaged");
    const rel = ev.find((e) => e.state === "relieved");
    const nr = ev.find((e) => e.state === "not_reached");
    const exe = ev.find((e) => e.state === "extinguished");
    const finalState = rup ? "ruptured" : dmg ? "damaged" : exe ? "extinguished" : burn ? "burning" : rel ? "relieved" : nr ? "not_reached" : "intact";
    const from = !burn ? NA(tr("the component never ignited in this run", "el componente nunca se encendió en esta simulación"))
      : burn.cause?.startsWith("spread:") ? label(burn.cause.slice(7))
      : burn.cause?.startsWith("rupture:") ? tr(`blast of ${label(burn.cause.slice(8))}`, `explosión de ${label(burn.cause.slice(8))}`)
      : X("ignition point chosen by the user");
    const damage = rup ? tr(`ruptured at t = ${r1(rup.t)} s`, `roto a t = ${r1(rup.t)} s`) : dmg ? tr(`damaged at t = ${r1(dmg.t)} s (${dmg.reason})`, `dañado a t = ${r1(dmg.t)} s (${X(dmg.reason)})`) : tr("none", "ninguno");
    const note = !burn ? (nr ? X(nr.reason) : X("no path ignited it within this run")) : exe ? X(exe.reason) : tr("burns until the end of the run: the engine has no burn-out model", "arde hasta el final de la simulación: el motor no tiene modelo de agotamiento del combustible");
    return { id: c.id, name: X(c.label), material: es ? (MATERIAL_ES[c.material] ?? c.material) : c.material, finalState, ignitionS: burn ? burn.t : null, burningS: burn ? Math.max(0, (exe?.t ?? endT) - burn.t) : null, propagatedFrom: from, damage, note };
  });

  const rupture = tank ? ruptureReport(events, endT, cat, inp.source) : null;
  const ruptEv = events.find((e) => e.state === "ruptured");
  const reached = components.filter((c) => c.finalState === "burning" || c.finalState === "damaged" || c.finalState === "ruptured" || c.finalState === "extinguished").length;
  const damaged = components.filter((c) => c.finalState === "damaged" || c.finalState === "ruptured").length;
  const burnEvents = events.filter((e) => e.state === "burning");
  const speeds = burnEvents.map((e) => e.speedMmS).filter((s): s is number => typeof s === "number");
  const extinguished = endReason === "extinguished_by_measure" || endReason === "self_extinguished" || endReason === "extinguished_by_suppression_system";

  const metrics: MetricRow[] = [
    { key: "duration_s", label: tr("Simulated duration", "Duración simulada"), value: r1(endT), unit: "s", note: tr("from ignition to the end event", "desde la ignición hasta el evento final") },
    { key: "real_equivalent_s", label: tr("Real-equivalent duration", "Duración en tiempo real equivalente"), value: r1(endT), unit: "s", note: tr("equal to the simulated duration: the component engine already runs in physical seconds", "igual a la duración simulada: el motor de componentes ya trabaja en segundos físicos") },
    { key: "components_reached", label: tr("Components reached", "Componentes alcanzados"), value: tr(`${reached} of ${cat.components.length}`, `${reached} de ${cat.components.length}`), unit: tr("components", "componentes"), note: tr("burning, damaged or ruptured", "ardiendo, dañados o rotos") },
    { key: "components_damaged", label: tr("Components damaged or ruptured", "Componentes dañados o rotos"), value: String(damaged), unit: tr("components", "componentes"), note: damaged ? tr("see the Components table", "véase la tabla de Componentes") : tr("none in this run", "ninguno en esta simulación") },
    { key: "components_not_reached", label: tr("Components not reached", "Componentes no alcanzados"), value: String(cat.components.length - reached), unit: tr("components", "componentes"), note: tr("kept intact or blocked; reasons in the Components table", "se mantuvieron intactos o bloqueados; los motivos están en la tabla de Componentes") },
    { key: "first_burning_component", label: tr("First component to burn", "Primer componente en arder"), value: startLabel, unit: tr("name", "nombre"), note: tr("ignition point chosen by the user", "punto de ignición elegido por el usuario") },
    speeds.length
      ? { key: "max_front_speed_mm_s", label: tr("Fastest fire front between components", "Frente de fuego más rápido entre componentes"), value: r1(Math.max(...speeds)), unit: "mm/s", note: tr("estimated: SAFFIRE anchor scaled by estimated factors", "estimado: ancla SAFFIRE escalada con factores estimados") }
      : { key: "max_front_speed_mm_s", label: tr("Fastest fire front between components", "Frente de fuego más rápido entre componentes"), value: NAV, unit: "mm/s", note: NA(tr("the fire did not spread from one component to another in this run", "el fuego no se propagó de un componente a otro en esta simulación")) },
    { key: "affected_area_cm2", label: tr("Affected surface area", "Superficie afectada"), value: NAV, unit: "cm2", note: NA(tr("the component engine does not compute burned area; the surface-fire layer of the live panel shows it while the fire burns", "el motor de componentes no calcula el área quemada; la capa de fuego de superficie del panel en vivo la muestra mientras el fuego arde")) },
    ruptEv
      ? { key: "time_to_rupture_s", label: tr("Time to rupture", "Tiempo hasta la rotura"), value: r1(ruptEv.t), unit: "s", note: ruptEv.forced ? tr("forced demo scenario, not a prediction", "escenario de demostración forzado, no una predicción") : tr("mid-point of an assumed heating window (estimated, no dataset)", "punto medio de una ventana de calentamiento supuesta (estimado, sin conjunto de datos)") }
      : { key: "time_to_rupture_s", label: tr("Time to rupture", "Tiempo hasta la rotura"), value: NAV, unit: "s", note: NA(tank ? tr("no rupture in this run", "no hubo rotura en esta simulación") : tr("this environment has no verified energetic component", "este entorno no tiene ningún componente energético verificado")) },
    extinguished
      ? { key: "time_to_extinction_s", label: tr("Time to extinction", "Tiempo hasta la extinción"), value: r1(endT), unit: "s", note: tr(`ended by ${endReason}`, `terminó: ${reasonName(endReason)}`) }
      : { key: "time_to_extinction_s", label: tr("Time to extinction", "Tiempo hasta la extinción"), value: NAV, unit: "s", note: NA(tr(`the fire was not extinguished in this run (end reason: ${endReason})`, `el fuego no se apagó en esta simulación (motivo de fin: ${reasonName(endReason)})`)) },
    { key: "end_reason", label: tr("End reason", "Motivo de fin"), value: endReason, unit: tr("reason", "motivo"), note: endWhy },
  ];

  const ladderOf = (m: CMeasure) => (m.engine.kind === "set_flow" ? tr("Step 2 · cut the airflow", "Paso 2 · cortar el flujo de aire") : m.engine.kind === "relieve" ? tr("Step 4 · vent / relieve pressure", "Paso 4 · despresurizar / aliviar la presión") : m.engine.kind === "extinguish" ? tr("Step 3 · put the fire out (extinguisher)", "Paso 3 · apagar el fuego (extintor)") : tr("Step 4 · isolate the burning part", "Paso 4 · aislar la parte en llamas"));
  const measures: MeasureRow[] = [...measureById.values()].map((m) => ({
    id: m.id, action: X(m.action), status: m.id in inp.applied ? "applied" : "offered", atS: m.id in inp.applied ? inp.applied[m.id] : null,
    ladder: ladderOf(m), effect: X(m.effect.text), tag: m.effect.tag, source: X(m.effect.src),
  }));

  const applied = measures.filter((m) => m.status === "applied");
  const kindOf = (id: string) => measureById.get(id)?.kind;
  const ev0 = SAFETY_EVIDENCE[inp.env];
  const noEv = X("no entry for this environment in the safety page");
  const appliedIds = (k: string) => applied.filter((m) => kindOf(m.id) === k).map((m) => m.id).join(", ");
  const phases: PhaseRow[] = [
    { phase: tr("1 · Prevent", "1 · Prevenir"), walked: applied.some((m) => kindOf(m.id) === "prevent") ? tr(`applied: ${appliedIds("prevent")}`, `aplicadas: ${appliedIds("prevent")}`) : tr("no preventive measure applied in this run", "no se aplicó ninguna medida preventiva en esta simulación"), evidence: ev0?.prevent ? X(ev0.prevent) : noEv },
    { phase: tr("2 · Detect", "2 · Detectar"), walked: NA(tr("the component engine does not model detection; the live panel\u0027s delay is the user\u0027s, not a measured time", "el motor de componentes no modela la detección; el retraso del panel en vivo es el del usuario, no un tiempo medido")), evidence: ev0?.detect ? X(ev0.detect) : noEv },
    { phase: tr("3 · Spread", "3 · Propagación"), walked: tr(`${reached} of ${cat.components.length} components reached`, `${reached} de ${cat.components.length} componentes alcanzados`), evidence: ev0?.spread ? X(ev0.spread) : noEv },
    { phase: tr("4 · Suppress", "4 · Suprimir"), walked: applied.some((m) => kindOf(m.id) === "suppress") ? tr(`applied: ${appliedIds("suppress")}`, `aplicadas: ${appliedIds("suppress")}`) : tr("no suppressing measure applied in this run", "no se aplicó ninguna medida supresora en esta simulación"), evidence: ev0?.suppress ? X(ev0.suppress) : noEv },
  ];

  const origin = comp.get(inp.source);
  const factors: FactorRow[] = spreadFactors(inp.atm, origin?.material ?? "fabric").factors.map((f) => ({ name: X(f.label), value: f.value.toFixed(2), tag: f.tag, source: `${X(f.src)}. ${X(f.why)}` }));

  const lastBurn = burnEvents.length ? Math.max(...burnEvents.map((e) => e.t)) : 0;
  const o2p = Math.round(inp.atm.o2 * 100), psi = (inp.atm.pressureAtm * 14.696).toFixed(1);
  const summary: string[] = [
    tr(`The fire started at ${startLabel} (ignition point chosen by the user, ${inp.forced ? "forced failure scenario on" : "physical path"}) with ${o2p} % oxygen, ${psi} psi, ${inp.atm.gravityG} g and ${inp.atm.flowCmS} cm/s of airflow.`,
       `El fuego empezó en ${startLabel} (punto de ignición elegido por el usuario, ${inp.forced ? "escenario de fallo forzado activado" : "vía física"}) con ${o2p} % de oxígeno, ${psi} psi, ${inp.atm.gravityG} g y ${inp.atm.flowCmS} cm/s de flujo de aire.`),
    reached > 1 ? tr(`It reached ${reached} of ${cat.components.length} components; the last one ignited at t = ${r1(lastBurn)} s.`, `Alcanzó ${reached} de ${cat.components.length} componentes; el último se encendió a t = ${r1(lastBurn)} s.`) : tr(`It did not spread to any other component (${reached} of ${cat.components.length} reached).`, `No se propagó a ningún otro componente (${reached} de ${cat.components.length} alcanzados).`),
    ruptEv
      ? tr(`${rupture?.tankLabel ?? "An energetic component"} ruptured at t = ${r1(ruptEv.t)} s${ruptEv.forced ? " (forced demo scenario)" : ` after about ${r1(rupture?.exposureS ?? 0)} s of heating (assumed window, no dataset)`}.`,
           `${rupture?.tankLabel ? X(rupture.tankLabel) : "Un componente energético"} se rompió a t = ${r1(ruptEv.t)} s${ruptEv.forced ? " (escenario de demostración forzado)" : ` tras unos ${r1(rupture?.exposureS ?? 0)} s de calentamiento (ventana supuesta, sin conjunto de datos)`}.`)
      : tank ? tr("No energetic component ruptured in this run.", "Ningún componente energético se rompió en esta simulación.") : tr("This environment has no verified energetic component, so no rupture can occur in the model.", "Este entorno no tiene ningún componente energético verificado, así que en el modelo no puede haber rotura."),
    tr(`The run ended at t = ${r1(endT)} s (${endReason}): ${endWhy}.${applied.length ? ` Measures applied: ${applied.map((m) => `${m.id} at ${r1(m.atS ?? 0)} s`).join("; ")}.` : " No measure was applied."}`,
       `La simulación terminó a t = ${r1(endT)} s (${reasonName(endReason)}): ${endWhy}.${applied.length ? ` Medidas aplicadas: ${applied.map((m) => `${m.id} a los ${r1(m.atS ?? 0)} s`).join("; ")}.` : " No se aplicó ninguna medida."}`),
    tr("Times are simulated seconds and equal real-equivalent seconds in this engine. Everything is simulated (estimated) unless a row says measured or reported.", "Los tiempos son segundos simulados e iguales a los segundos reales equivalentes en este motor. Todo es simulado (estimado) salvo que una fila diga medido o reportado."),
  ];

  return deepFreeze({
    runId: inp.runId, timestampUtc: inp.timestampUtc, appVersion: inp.appVersion, env: inp.env, startComponent: inp.source, startLabel,
    atm: { ...inp.atm }, atmTag: inp.atmTag, forced: inp.forced, measuredOnly: inp.measuredOnly, measuresApplied: { ...inp.applied },
    endReason, endT, endWhy, summary, events, timeline, components, metrics, measures, rupture, phases, factors,
    gaps: cat.gaps.map(X), labels: { ...Object.fromEntries(cat.components.map((c) => [c.id, X(c.label)])), [END_ID]: X("(whole simulation)") }, componentCount: cat.components.length,
  });
}

/** One metric as `key=value unit` (the CSV summary row and the window use the same strings) */
export const metricText = (m: MetricRow) => `${m.key}=${m.value}${m.value === "not available" ? "" : ` ${m.unit}`}`;

/** The complete .txt report, generated only from the RunRecord. `lang` only translates the headings and labels; the record itself carries its own language. */
export function buildReportTxt(run: RunRecord, lang: "en" | "es" = "en"): string {
  const es = lang === "es";
  const tr = (en: string, sp: string) => (es ? sp : en);
  const X = (t: string) => (es ? esText(t) : t);
  const NAV = tr("not available", "no disponible");
  const isNA = (v: string) => v === "not available" || v === "no disponible";
  const L: string[] = [];
  const h = (t: string) => { L.push("", t, "-".repeat(t.length)); };
  L.push(
    tr(`JaPax simulation report · ${run.runId} · ${run.env}`, `Informe de simulación de JaPax · ${run.runId} · ${run.env}`),
    tr("SIMULATION, NOT A MEASUREMENT. Levels: measured, reported, predicted, estimated.", "SIMULACIÓN, NO UNA MEDICIÓN. Niveles: measured (medido), reported (reportado), predicted (predicho), estimated (estimado)."),
    tr(`Generated (UTC): ${run.timestampUtc} · app ${run.appVersion}`, `Generado (UTC): ${run.timestampUtc} · app ${run.appVersion}`),
  );
  h(tr("Summary", "Resumen"));
  run.summary.forEach((x) => L.push(`- ${x}`));
  h(tr("Conditions and assumptions", "Condiciones y suposiciones"));
  L.push(
    `${tr("Start component", "Componente de inicio")}: ${run.startLabel}`,
    `${tr("Oxygen", "Oxígeno")}: ${Math.round(run.atm.o2 * 100)} % [${run.atmTag}]`,
    `${tr("Pressure", "Presión")}: ${(run.atm.pressureAtm * 14.696).toFixed(1)} psi (${run.atm.pressureAtm} atm) [${run.atmTag}]`,
    `${tr("Gravity", "Gravedad")}: ${run.atm.gravityG} g`,
    `${tr("Airflow", "Flujo de aire")}: ${run.atm.flowCmS} cm/s`,
    `${tr("Mode", "Modo")}: ${run.forced ? tr("forced failure (demo scenario, not a prediction)", "fallo forzado (escenario de demostración, no una predicción)") : tr("physical path", "vía física")}`,
    `${tr("Measured only switch", "Interruptor «solo medido»")}: ${run.measuredOnly ? tr("on", "activado") : tr("off", "desactivado")}`,
    tr("Model factors (origin material):", "Factores del modelo (material de origen):"),
  );
  run.factors.forEach((f) => L.push(`  - ${f.name} = ${f.value} [${f.tag}] ${f.source}`));
  h(tr("Timeline (all events; t in s)", "Cronología (todos los eventos; t en s)"));
  run.timeline.forEach((e) => L.push(`t=${r1(e.t)} s | ${e.component} | ${e.state} | ${e.level} | ${e.source}\n    ${e.reason}`));
  h(tr("Components (times in s)", "Componentes (tiempos en s)"));
  run.components.forEach((c) => L.push(
    es
      ? `${c.name} [${c.id}] · material ${c.material} · final ${c.finalState} · ignición ${c.ignitionS === null ? "no disponible (nunca se encendió)" : r1(c.ignitionS) + " s"} · ardiendo ${c.burningS === null ? "no disponible (nunca se encendió)" : r1(c.burningS) + " s"} · desde ${c.propagatedFrom} · daño ${c.damage} · ${c.note}`
      : `${c.name} [${c.id}] · material ${c.material} · final ${c.finalState} · ignition ${c.ignitionS === null ? "not available (never ignited)" : r1(c.ignitionS) + " s"} · burning ${c.burningS === null ? "not available (never ignited)" : r1(c.burningS) + " s"} · from ${c.propagatedFrom} · damage ${c.damage} · ${c.note}`,
  ));
  h(tr("Measures", "Medidas"));
  run.measures.forEach((m) => L.push(
    es
      ? `${m.status === "applied" ? "APLICADA" : "OFRECIDA"}${m.atS === null ? "" : ` a los ${r1(m.atS)} s`} · ${m.id} · ${m.ladder} · ${m.action}\n    efecto [${m.tag}]: ${m.effect}\n    fuente: ${m.source}`
      : `${m.status.toUpperCase()}${m.atS === null ? "" : ` at ${r1(m.atS)} s`} · ${m.id} · ${m.ladder} · ${m.action}\n    effect [${m.tag}]: ${m.effect}\n    source: ${m.source}`,
  ));
  h(tr("Rupture", "Rotura"));
  if (!run.rupture || run.rupture.status === "none") L.push(run.rupture ? tr("No energetic component was reached.", "No se alcanzó ningún componente energético.") : tr("not available: this environment has no verified energetic component.", "no disponible: este entorno no tiene ningún componente energético verificado."));
  else {
    const r = run.rupture;
    L.push(
      `${tr("Status", "Estado")}: ${r.status}`,
      `${tr("Component", "Componente")}: ${X(r.tankLabel)}`,
      `${tr("Fire path", "Vía del fuego")}: ${r.chain.map((c) => `${X(c.label)} ${r1(c.t)} s`).join(" -> ") || NAV}`,
      `${tr("Heated for", "Calentado durante")}: ${r.exposureS === null ? NAV : r1(r.exposureS) + " s"}`,
      `${tr("Assumed window", "Ventana supuesta")}: ${r.window[0]}-${r.window[1]} s, ${tr("mid-point", "punto medio")} ${r1(r.usedS)} s [estimated]`,
      `${tr("Rupture at", "Rotura a los")}: ${r.ruptureAt === null ? tr("not available (no rupture)", "no disponible (sin rotura)") : r1(r.ruptureAt) + " s"}${r.forced ? tr(" (forced scenario)", " (escenario forzado)") : ""}`,
      `${tr("Neighbours hit", "Vecinos afectados")}: ${r.consequences.map((c) => `${X(c.label)} (${c.state}, ${r1(c.t)} s)`).join("; ") || tr("none", "ninguno")}`,
    );
  }
  h(tr("Safety ladder", "Escalera de seguridad"));
  run.phases.forEach((p) => L.push(`${p.phase}: ${p.walked}\n    ${tr("evidence", "evidencia")}: ${p.evidence}`));
  h(tr("Metrics", "Métricas"));
  run.metrics.forEach((m) => L.push(`${m.label} (${m.key}): ${m.value}${isNA(m.value) ? "" : ` ${m.unit}`} · ${m.note}`));
  h(tr("Data gaps of this environment", "Huecos de datos de este entorno"));
  run.gaps.forEach((g) => L.push(`- ${g}`));
  return L.join("\n") + "\n";
}

export { shortLabel };
