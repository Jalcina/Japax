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
const NA = (why: string) => `not available: ${why}`;

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
}

export function buildRunRecord(inp: BuildInput): RunRecord {
  const cat = inp.catalog;
  const comp = new Map(cat.components.map((c) => [c.id, c]));
  const label = (id: string) => (id === END_ID ? "(whole simulation)" : comp.get(id)?.label ?? id);
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
  const endWhy = endEv.reason.replace(/^Simulation ended \([a-z_]+\): /, "");

  const measureById = new Map<string, CMeasure>();
  for (const c of cat.components) for (const m of c.measures) measureById.set(m.id, m);
  const sourceOf = (e: CEvent): string => {
    const m = /measure "([^"]+)"/.exec(e.reason);
    const mm = m ? measureById.get(m[1]) : undefined;
    if (mm) return mm.effect.src;
    if (tank?.energetic && e.componentId === tank.id && (e.state === "ruptured" || e.state === "relieved")) return tank.energetic.failureMode.src;
    if (e.state === "end") return "JaPax component engine: end rule of lib/componentSpread.ts";
    if (e.state === "not_reached" && e.tag === "reported") return "labPhysics.spreadFactors: PSI-20 ACME BRE (reported), no airflow near 21 % O2 in 0 g";
    return "JaPax component engine (lib/componentSpread) with labPhysics.spreadFactors; SAFFIRE anchor NTRS 20180005168 scaled by estimated factors";
  };

  const timeline: TimelineRow[] = events.map((e) => ({
    t: e.t, componentId: e.componentId, component: label(e.componentId), state: e.state, level: e.tag, source: sourceOf(e), reason: e.reason,
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
    const from = !burn ? NA("the component never ignited in this run")
      : burn.cause?.startsWith("spread:") ? label(burn.cause.slice(7))
      : burn.cause?.startsWith("rupture:") ? `blast of ${label(burn.cause.slice(8))}`
      : "ignition point chosen by the user";
    const damage = rup ? `ruptured at t = ${r1(rup.t)} s` : dmg ? `damaged at t = ${r1(dmg.t)} s (${dmg.reason})` : "none";
    const note = !burn ? (nr ? nr.reason : "no path ignited it within this run") : exe ? exe.reason : "burns until the end of the run: the engine has no burn-out model";
    return { id: c.id, name: c.label, material: c.material, finalState, ignitionS: burn ? burn.t : null, burningS: burn ? Math.max(0, (exe?.t ?? endT) - burn.t) : null, propagatedFrom: from, damage, note };
  });

  const rupture = tank ? ruptureReport(events, endT, cat, inp.source) : null;
  const ruptEv = events.find((e) => e.state === "ruptured");
  const reached = components.filter((c) => c.finalState === "burning" || c.finalState === "damaged" || c.finalState === "ruptured" || c.finalState === "extinguished").length;
  const damaged = components.filter((c) => c.finalState === "damaged" || c.finalState === "ruptured").length;
  const burnEvents = events.filter((e) => e.state === "burning");
  const speeds = burnEvents.map((e) => e.speedMmS).filter((s): s is number => typeof s === "number");
  const extinguished = endReason === "extinguished_by_measure" || endReason === "self_extinguished" || endReason === "extinguished_by_suppression_system";

  const metrics: MetricRow[] = [
    { key: "duration_s", label: "Simulated duration", value: r1(endT), unit: "s", note: "from ignition to the end event" },
    { key: "real_equivalent_s", label: "Real-equivalent duration", value: r1(endT), unit: "s", note: "equal to the simulated duration: the component engine already runs in physical seconds" },
    { key: "components_reached", label: "Components reached", value: `${reached} of ${cat.components.length}`, unit: "components", note: "burning, damaged or ruptured" },
    { key: "components_damaged", label: "Components damaged or ruptured", value: String(damaged), unit: "components", note: damaged ? "see the Components table" : "none in this run" },
    { key: "components_not_reached", label: "Components not reached", value: String(cat.components.length - reached), unit: "components", note: "kept intact or blocked; reasons in the Components table" },
    { key: "first_burning_component", label: "First component to burn", value: startLabel, unit: "name", note: "ignition point chosen by the user" },
    speeds.length
      ? { key: "max_front_speed_mm_s", label: "Fastest fire front between components", value: r1(Math.max(...speeds)), unit: "mm/s", note: "estimated: SAFFIRE anchor scaled by estimated factors" }
      : { key: "max_front_speed_mm_s", label: "Fastest fire front between components", value: "not available", unit: "mm/s", note: NA("the fire did not spread from one component to another in this run") },
    { key: "affected_area_cm2", label: "Affected surface area", value: "not available", unit: "cm2", note: NA("the component engine does not compute burned area; the surface-fire layer of the live panel shows it while the fire burns") },
    ruptEv
      ? { key: "time_to_rupture_s", label: "Time to rupture", value: r1(ruptEv.t), unit: "s", note: ruptEv.forced ? "forced demo scenario, not a prediction" : "mid-point of an assumed heating window (estimated, no dataset)" }
      : { key: "time_to_rupture_s", label: "Time to rupture", value: "not available", unit: "s", note: NA(tank ? "no rupture in this run" : "this environment has no verified energetic component") },
    extinguished
      ? { key: "time_to_extinction_s", label: "Time to extinction", value: r1(endT), unit: "s", note: `ended by ${endReason}` }
      : { key: "time_to_extinction_s", label: "Time to extinction", value: "not available", unit: "s", note: NA(`the fire was not extinguished in this run (end reason: ${endReason})`) },
    { key: "end_reason", label: "End reason", value: endReason, unit: "reason", note: endWhy },
  ];

  const ladderOf = (m: CMeasure) => (m.engine.kind === "set_flow" ? "Step 2 · cut the airflow" : m.engine.kind === "relieve" ? "Step 4 · vent / relieve pressure" : m.engine.kind === "extinguish" ? "Step 3 · put the fire out (extinguisher)" : "Step 4 · isolate the burning part");
  const measures: MeasureRow[] = [...measureById.values()].map((m) => ({
    id: m.id, action: m.action, status: m.id in inp.applied ? "applied" : "offered", atS: m.id in inp.applied ? inp.applied[m.id] : null,
    ladder: ladderOf(m), effect: m.effect.text, tag: m.effect.tag, source: m.effect.src,
  }));

  const applied = measures.filter((m) => m.status === "applied");
  const kindOf = (id: string) => measureById.get(id)?.kind;
  const ev0 = SAFETY_EVIDENCE[inp.env];
  const noEv = "no entry for this environment in the safety page";
  const phases: PhaseRow[] = [
    { phase: "1 · Prevent", walked: applied.some((m) => kindOf(m.id) === "prevent") ? `applied: ${applied.filter((m) => kindOf(m.id) === "prevent").map((m) => m.id).join(", ")}` : "no preventive measure applied in this run", evidence: ev0?.prevent ?? noEv },
    { phase: "2 · Detect", walked: NA("the component engine does not model detection; the live panel's delay is the user's, not a measured time"), evidence: ev0?.detect ?? noEv },
    { phase: "3 · Spread", walked: `${reached} of ${cat.components.length} components reached`, evidence: ev0?.spread ?? noEv },
    { phase: "4 · Suppress", walked: applied.some((m) => kindOf(m.id) === "suppress") ? `applied: ${applied.filter((m) => kindOf(m.id) === "suppress").map((m) => m.id).join(", ")}` : "no suppressing measure applied in this run", evidence: ev0?.suppress ?? noEv },
  ];

  const origin = comp.get(inp.source);
  const factors: FactorRow[] = spreadFactors(inp.atm, origin?.material ?? "fabric").factors.map((f) => ({ name: f.label, value: f.value.toFixed(2), tag: f.tag, source: `${f.src}. ${f.why}` }));

  const lastBurn = burnEvents.length ? Math.max(...burnEvents.map((e) => e.t)) : 0;
  const summary: string[] = [
    `The fire started at ${startLabel} (ignition point chosen by the user, ${inp.forced ? "forced failure scenario on" : "physical path"}) with ${Math.round(inp.atm.o2 * 100)} % oxygen, ${(inp.atm.pressureAtm * 14.696).toFixed(1)} psi, ${inp.atm.gravityG} g and ${inp.atm.flowCmS} cm/s of airflow.`,
    reached > 1 ? `It reached ${reached} of ${cat.components.length} components; the last one ignited at t = ${r1(lastBurn)} s.` : `It did not spread to any other component (${reached} of ${cat.components.length} reached).`,
    ruptEv ? `${rupture?.tankLabel ?? "An energetic component"} ruptured at t = ${r1(ruptEv.t)} s${ruptEv.forced ? " (forced demo scenario)" : ` after about ${r1(rupture?.exposureS ?? 0)} s of heating (assumed window, no dataset)`}.` : tank ? "No energetic component ruptured in this run." : "This environment has no verified energetic component, so no rupture can occur in the model.",
    `The run ended at t = ${r1(endT)} s (${endReason}): ${endWhy}.${applied.length ? ` Measures applied: ${applied.map((m) => `${m.id} at ${r1(m.atS ?? 0)} s`).join("; ")}.` : " No measure was applied."}`,
    "Times are simulated seconds and equal real-equivalent seconds in this engine. Everything is simulated (estimated) unless a row says measured or reported.",
  ];

  return deepFreeze({
    runId: inp.runId, timestampUtc: inp.timestampUtc, appVersion: inp.appVersion, env: inp.env, startComponent: inp.source, startLabel,
    atm: { ...inp.atm }, atmTag: inp.atmTag, forced: inp.forced, measuredOnly: inp.measuredOnly, measuresApplied: { ...inp.applied },
    endReason, endT, endWhy, summary, events, timeline, components, metrics, measures, rupture, phases, factors,
    gaps: cat.gaps.slice(), labels: { ...Object.fromEntries(cat.components.map((c) => [c.id, c.label])), [END_ID]: "(whole simulation)" }, componentCount: cat.components.length,
  });
}

/** One metric as `key=value unit` (the CSV summary row and the window use the same strings) */
export const metricText = (m: MetricRow) => `${m.key}=${m.value}${m.value === "not available" ? "" : ` ${m.unit}`}`;

/** The complete .txt report, generated only from the RunRecord */
export function buildReportTxt(run: RunRecord): string {
  const L: string[] = [];
  const h = (t: string) => { L.push("", t, "-".repeat(t.length)); };
  L.push(`JaPax simulation report · ${run.runId} · ${run.env}`, "SIMULATION, NOT A MEASUREMENT. Levels: measured, reported, predicted, estimated.", `Generated (UTC): ${run.timestampUtc} · app ${run.appVersion}`);
  h("Summary");
  run.summary.forEach((s) => L.push(`- ${s}`));
  h("Conditions and assumptions");
  L.push(`Start component: ${run.startLabel}`, `Oxygen: ${Math.round(run.atm.o2 * 100)} % [${run.atmTag}]`, `Pressure: ${(run.atm.pressureAtm * 14.696).toFixed(1)} psi (${run.atm.pressureAtm} atm) [${run.atmTag}]`, `Gravity: ${run.atm.gravityG} g`, `Airflow: ${run.atm.flowCmS} cm/s`,
    `Mode: ${run.forced ? "forced failure (demo scenario, not a prediction)" : "physical path"}`, `Measured only switch: ${run.measuredOnly ? "on" : "off"}`, "Model factors (origin material):");
  run.factors.forEach((f) => L.push(`  - ${f.name} = ${f.value} [${f.tag}] ${f.source}`));
  h("Timeline (all events; t in s)");
  run.timeline.forEach((e) => L.push(`t=${r1(e.t)} s | ${e.component} | ${e.state} | ${e.level} | ${e.source}\n    ${e.reason}`));
  h("Components (times in s)");
  run.components.forEach((c) => L.push(`${c.name} [${c.id}] · material ${c.material} · final ${c.finalState} · ignition ${c.ignitionS === null ? "not available (never ignited)" : r1(c.ignitionS) + " s"} · burning ${c.burningS === null ? "not available (never ignited)" : r1(c.burningS) + " s"} · from ${c.propagatedFrom} · damage ${c.damage} · ${c.note}`));
  h("Measures");
  run.measures.forEach((m) => L.push(`${m.status.toUpperCase()}${m.atS === null ? "" : ` at ${r1(m.atS)} s`} · ${m.id} · ${m.ladder} · ${m.action}\n    effect [${m.tag}]: ${m.effect}\n    source: ${m.source}`));
  h("Rupture");
  if (!run.rupture || run.rupture.status === "none") L.push(run.rupture ? "No energetic component was reached." : "not available: this environment has no verified energetic component.");
  else {
    const r = run.rupture;
    L.push(`Status: ${r.status}`, `Component: ${r.tankLabel}`, `Fire path: ${r.chain.map((c) => `${c.label} ${r1(c.t)} s`).join(" -> ") || "not available"}`,
      `Heated for: ${r.exposureS === null ? "not available" : r1(r.exposureS) + " s"}`, `Assumed window: ${r.window[0]}-${r.window[1]} s, mid-point ${r1(r.usedS)} s [estimated]`,
      `Rupture at: ${r.ruptureAt === null ? "not available (no rupture)" : r1(r.ruptureAt) + " s"}${r.forced ? " (forced scenario)" : ""}`,
      `Neighbours hit: ${r.consequences.map((c) => `${c.label} (${c.state}, ${r1(c.t)} s)`).join("; ") || "none"}`);
  }
  h("Safety ladder");
  run.phases.forEach((p) => L.push(`${p.phase}: ${p.walked}\n    evidence: ${p.evidence}`));
  h("Metrics");
  run.metrics.forEach((m) => L.push(`${m.label} (${m.key}): ${m.value}${m.value === "not available" ? "" : ` ${m.unit}`} · ${m.note}`));
  h("Data gaps of this environment");
  run.gaps.forEach((g) => L.push(`- ${g}`));
  return L.join("\n") + "\n";
}

export { shortLabel };
