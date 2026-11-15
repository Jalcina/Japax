/**
 * Level A of the component engine: a pure, deterministic graph of components (no three.js, no DOM).
 * Nodes are components, edges are the `neighbors` of the catalog. It decides WHICH component burns WHEN; the
 * surface-cell fire (labFire) only draws the front inside the active component and consumes these events.
 *
 * HONESTY: edge delays reuse labPhysics.spreadFactors (anchored on the measured SAFFIRE spread, every other factor is
 * estimated). Rupture timing and blast effects have NO dataset: they are tagged "estimated" and use declared ranges.
 */
import { spreadFactors, type Atm, type MaterialGuess } from "./labPhysics.ts";
import type { Tag } from "./fireCases.ts";

export interface EnergeticSpec {
  kind: "pressure_vessel" | "propellant" | "battery";
  /** seconds a burning component needs before it fails: a RANGE, never a single invented number */
  heatToRuptureS: [number, number];
  /** declared radius (m) inside which the neighbours suffer the rupture */
  blastRadiusM: number;
  /** 0..1, how strongly the release enriches the local oxygen (documented assumption) */
  o2Enrich: number;
}
export interface GNode { id: string; material: MaterialGuess; energetic?: EnergeticSpec }
export interface GEdge { from: string; to: string; path: "contact" | "cable" | "proximity"; distanceM: number }
export type GMeasure =
  | { id: string; kind: "cut_edge"; from: string; to: string; atS: number }
  | { id: string; kind: "relieve"; target: string; atS: number }
  /** from `atS` on the airflow is `flowCmS` (e.g. the ventilation is shut off); fronts already travelling slow down or starve from that moment */
  | { id: string; kind: "set_flow"; flowCmS: number; atS: number };
export type CState = "burning" | "not_reached" | "ruptured" | "relieved" | "damaged" | "end";
/** Why a run ended. The engine emits the first five; the UI adds the last three (the user or the lab's own suppression system stopped it). */
export type EndReason =
  | "extinguished_by_measure" | "self_extinguished" | "burned_out" | "ruptured_and_settled" | "horizon_reached"
  | "extinguished_by_suppression_system" | "interrupted_by_user" | "in_progress";
/** componentId of the terminal event */
export const END_ID = "(simulation)";
export interface CEvent {
  t: number;
  componentId: string;
  state: CState;
  tag: Tag;
  reason: string;
  cause?: string;
  forced?: boolean;
  /** spread events: the front speed used (mm/s), so metrics never have to parse the reason text */
  speedMmS?: number;
  /** only on the terminal event */
  endReason?: EndReason;
}
export interface SimInput {
  nodes: GNode[];
  edges: GEdge[];
  atm: Atm;
  ignite: string;
  horizonS: number;
  measures?: GMeasure[];
  /** demo mode: the energetic component fails at t=0. Always labelled as a forced scenario, not a prediction. */
  forceRupture?: string;
}

type Job = { t: number; kind: "ignite" | "rupture"; id: string; cause?: string; reason: string; tag: Tag; forced?: boolean; speedMmS?: number };

const END_TEXT: Record<string, string> = {
  extinguished_by_measure: "a measure stopped the fire from reaching at least one component, and nothing else was left to ignite",
  self_extinguished: "the flame starved before reaching the next component (not enough airflow for this oxygen level and gravity)",
  burned_out: "every component the fire could reach within the horizon has been reached; nothing is left to ignite",
  ruptured_and_settled: "an energetic component ruptured and its consequences have played out; nothing else is left to ignite",
  horizon_reached: "the look-ahead limit of this environment was reached while the fire could still spread",
};

export function simulate(input: SimInput): { events: CEvent[]; end: { t: number; reason: EndReason; why: string } } {
  const { nodes, edges, atm, ignite, horizonS } = input;
  const measures = input.measures ?? [];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const events: CEvent[] = [];
  const burning = new Map<string, number>();
  const blocked = new Map<string, { t: number; reason: string; tag: Tag; measure?: boolean }>();
  let truncated = false;
  const jobs: Job[] = [{ t: 0, kind: "ignite", id: ignite, reason: "ignition point chosen by the user", tag: "estimated" }];

  const relief = (id: string) => measures.find((m): m is Extract<GMeasure, { kind: "relieve" }> => m.kind === "relieve" && m.target === id);
  const cutAt = (a: string, b: string) => measures.find((m): m is Extract<GMeasure, { kind: "cut_edge" }> => m.kind === "cut_edge" && ((m.from === a && m.to === b) || (m.from === b && m.to === a)));

  if (input.forceRupture && byId.get(input.forceRupture)?.energetic) {
    jobs.push({ t: 0, kind: "rupture", id: input.forceRupture, reason: "FORCED FAILURE scenario for the demo, not a prediction", tag: "estimated", forced: true });
  }

  const take = (): Job | undefined => {
    let bi = -1;
    for (let i = 0; i < jobs.length; i++) {
      if (bi < 0 || jobs[i].t < jobs[bi].t || (jobs[i].t === jobs[bi].t && jobs[i].kind === "ignite" && jobs[bi].kind === "rupture")) bi = i;
    }
    return bi < 0 ? undefined : jobs.splice(bi, 1)[0];
  };

  for (let j = take(); j; j = take()) {
    if (j.t > horizonS) { truncated = true; continue; }
    const node = byId.get(j.id);
    if (!node) continue;
    if (j.kind === "ignite") {
      if (burning.has(j.id)) continue;
      burning.set(j.id, j.t);
      events.push({ t: j.t, componentId: j.id, state: "burning", tag: j.tag, reason: j.reason, cause: j.cause, speedMmS: j.speedMmS });
      for (const e of edges) {
        if (e.path === "proximity") continue; // proximity alone never carries the fire (only a blast does)
        const other = e.from === j.id ? e.to : e.to === j.id ? e.from : null;
        if (!other || burning.has(other)) continue;
        const target = byId.get(other);
        if (!target) continue;
        const sp = spreadFactors(atm, target.material);
        if (sp.mmS <= 0) {
          blocked.set(other, { t: j.t, reason: "the flame starves: " + sp.note, tag: "reported" });
          continue;
        }
        let arrive = j.t + (e.distanceM * 1000) / sp.mmS;
        let how = `front reaches it at ${sp.mmS.toFixed(1)} mm/s (${sp.note})`;
        let speed = sp.mmS;
        const fl = measures.find((m): m is Extract<GMeasure, { kind: "set_flow" }> => m.kind === "set_flow");
        if (fl && fl.atS < arrive) {
          // the airflow changes while the front is travelling: part of the distance at the old speed, the rest at the new one (or the flame starves)
          const sp2 = spreadFactors({ ...atm, flowCmS: fl.flowCmS }, target.material);
          const from = Math.max(fl.atS, j.t);
          if (sp2.mmS <= 0) {
            blocked.set(other, { t: from, reason: `airflow changed by measure "${fl.id}" at ${fl.atS} s: the flame starves (${sp2.note})`, tag: "estimated", measure: true });
            continue;
          }
          speed = sp2.mmS;
          const left = Math.max(0, e.distanceM * 1000 - (from - j.t) * sp.mmS);
          arrive = from + left / sp2.mmS;
          how = `front slowed to ${sp2.mmS.toFixed(1)} mm/s after measure "${fl.id}" at ${fl.atS} s (${sp2.note})`;
        }
        const cut = cutAt(e.from, e.to);
        if (cut && cut.atS <= arrive) {
          blocked.set(other, { t: j.t, reason: `edge cut by measure "${cut.id}" at ${cut.atS} s`, tag: "estimated", measure: true });
          continue;
        }
        jobs.push({ t: arrive, kind: "ignite", id: other, cause: `spread:${j.id}`, reason: how, tag: "estimated", speedMmS: speed });
      }
      if (node.energetic && input.forceRupture !== j.id) {
        const [lo, hi] = node.energetic.heatToRuptureS;
        const mid = (lo + hi) / 2;
        const tr = j.t + mid;
        const r = relief(j.id);
        if (!(r && r.atS <= tr)) {
          jobs.push({ t: tr, kind: "rupture", id: j.id, reason: `heated for about ${mid} s (assumed range ${lo}-${hi} s, no dataset)`, tag: "estimated" });
        }
      }
    } else {
      events.push({ t: j.t, componentId: j.id, state: "ruptured", tag: "estimated", reason: j.reason, forced: j.forced || undefined });
      const spec = node.energetic;
      if (!spec) continue;
      for (const e of edges) {
        const other = e.from === j.id ? e.to : e.to === j.id ? e.from : null;
        if (!other || e.distanceM > spec.blastRadiusM || !byId.has(other)) continue;
        events.push({ t: j.t, componentId: other, state: "damaged", tag: "estimated", cause: `rupture:${j.id}`, reason: `inside the declared blast radius (${spec.blastRadiusM} m, assumption)` });
        if (!burning.has(other)) {
          jobs.push({ t: j.t, kind: "ignite", id: other, cause: `rupture:${j.id}`, reason: "ignited by the released fuel/oxidiser (estimated)", tag: "estimated" });
        }
      }
    }
  }

  for (const m of measures) {
    if (m.kind !== "relieve") continue;
    const rupt = events.find((e) => e.componentId === m.target && e.state === "ruptured");
    if (!rupt || m.atS < rupt.t) {
      events.push({ t: m.atS, componentId: m.target, state: "relieved", tag: "estimated", reason: `pressure relieved by measure "${m.id}" before the failure window closes` });
    }
  }
  for (const [id, b] of blocked) {
    if (!burning.has(id)) events.push({ t: b.t, componentId: id, state: "not_reached", tag: b.tag, reason: b.reason });
  }
  events.sort((a, b) => a.t - b.t);

  // the terminal event: why and when the run ends. Priority: still spreading at the look-ahead limit, rupture, a measure that blocked
  // the front, a flame that starved by itself, otherwise everything reachable has burned.
  const unburnt = (pred: (b: { measure?: boolean }) => boolean) => [...blocked].some(([id, b]) => !burning.has(id) && pred(b));
  const reason: EndReason = truncated ? "horizon_reached"
    : events.some((e) => e.state === "ruptured") ? "ruptured_and_settled"
    : unburnt((b) => !!b.measure) ? "extinguished_by_measure"
    : unburnt((b) => !b.measure) ? "self_extinguished"
    : "burned_out";
  const t = truncated ? horizonS : events.length ? events[events.length - 1].t : 0;
  const why = END_TEXT[reason];
  events.push({ t, componentId: END_ID, state: "end", tag: "estimated", reason: `Simulation ended (${reason}): ${why}`, endReason: reason });
  return { events, end: { t, reason, why } };
}
