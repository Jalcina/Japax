/**
 * Component catalog helpers (pure, testable with plain node): types of data/components/<env>.catalog.json and
 * <env>.map.json, validation, resolution of a tapped mesh/material to a component, and conversion to the graph
 * consumed by lib/componentSpread.ts.
 *
 * HONESTY: every Fact carries a tag and a source; validateCatalog fails when one does not.
 */
import type { EnergeticSpec, GEdge, GMeasure, GNode } from "./componentSpread.ts";
import type { MaterialGuess } from "./labPhysics.ts";

export type FactTag = "measured" | "reported" | "predicted" | "estimated";
export interface CFact { tag: FactTag; text: string; src: string }
export interface CNeighbor { id: string; path: "contact" | "cable" | "proximity"; distanceM: number; distanceNote: string }
export type EngineAction = { kind: "cut_edge"; from: string; to: string } | { kind: "relieve"; target: string };
export interface CMeasure {
  id: string;
  kind: "prevent" | "suppress";
  appliesTo: string[];
  action: string;
  timeWindowS?: number;
  effect: CFact;
  evidence: FactTag;
  engine: EngineAction;
}
export interface CEnergetic extends EnergeticSpec { contents: string; pressureNote: CFact; failureMode: CFact; heatToRuptureS: [number, number] }
export interface CComponent {
  id: string;
  label: string;
  function: string;
  virtual?: boolean;
  material: MaterialGuess;
  flammability: CFact;
  neighbors: CNeighbor[];
  measures: CMeasure[];
  energetic?: CEnergetic;
}
export interface Catalog { env: string; version: number; model: string; components: CComponent[]; gaps: string[] }
export interface ComponentMap {
  env: string;
  model: string;
  method: string;
  entries: Record<string, string>;
  ignored: Record<string, string>;
  unidentified: string[];
}
export type Resolution = { componentId: string | null; method: "mesh" | "material" | "meshprefix" | "ignored" | "unidentified"; key?: string };

const TAGS: FactTag[] = ["measured", "reported", "predicted", "estimated"];

function checkFact(where: string, f: CFact | undefined, out: string[]) {
  if (!f) { out.push(`${where}: missing Fact`); return; }
  if (!TAGS.includes(f.tag)) out.push(`${where}: Fact without a valid tag`);
  if (!f.text || !f.text.trim()) out.push(`${where}: Fact without text`);
  if (!f.src || !f.src.trim()) out.push(`${where}: Fact without src`);
}

/** Returns the list of problems; an empty list means the catalog is valid. */
export function validateCatalog(c: Catalog): string[] {
  const out: string[] = [];
  const ids = new Set(c.components.map((x) => x.id));
  if (ids.size !== c.components.length) out.push("duplicate component ids");
  for (const comp of c.components) {
    const w = comp.id;
    if (!comp.material) out.push(`${w}: no material`);
    if (!comp.neighbors?.length) out.push(`${w}: no neighbours`);
    if (!comp.measures?.length) out.push(`${w}: no measure`);
    checkFact(`${w} flammability`, comp.flammability, out);
    for (const n of comp.neighbors ?? []) {
      if (!ids.has(n.id)) out.push(`${w}: neighbour ${n.id} does not exist`);
      if (!(n.distanceM > 0)) out.push(`${w}: neighbour ${n.id} without a distance`);
    }
    for (const m of comp.measures ?? []) {
      checkFact(`${w} measure ${m.id}`, m.effect, out);
      if (!m.engine) out.push(`${w} measure ${m.id}: no engine action`);
      for (const a of m.appliesTo ?? []) if (!ids.has(a)) out.push(`${w} measure ${m.id}: appliesTo ${a} does not exist`);
      if (m.engine?.kind === "cut_edge" && (!ids.has(m.engine.from) || !ids.has(m.engine.to))) out.push(`${w} measure ${m.id}: cut_edge ends do not exist`);
      if (m.engine?.kind === "relieve" && !ids.has(m.engine.target)) out.push(`${w} measure ${m.id}: relieve target does not exist`);
    }
    if (comp.energetic) {
      checkFact(`${w} energetic.pressureNote`, comp.energetic.pressureNote, out);
      checkFact(`${w} energetic.failureMode`, comp.energetic.failureMode, out);
      const [lo, hi] = comp.energetic.heatToRuptureS ?? [0, 0];
      if (!(lo > 0 && hi >= lo)) out.push(`${w}: invalid heatToRuptureS range`);
    }
  }
  return out;
}

const sanitise = (s: string) => s.replace(/[\s[\]:./]/g, "_");

/** three.js may rewrite node names (not material names); accept the raw name and its sanitised form. */
function lookup<T>(table: Record<string, T>, prefix: string, name: string): { key: string; value: T } | null {
  const raw = `${prefix}:${name}`;
  if (raw in table) return { key: raw, value: table[raw] };
  const want = sanitise(raw);
  for (const k of Object.keys(table)) if (sanitise(k) === want) return { key: k, value: table[k] };
  return null;
}

/** Resolution order: mesh, then material, then meshprefix, then "unidentified" (never an invented name). */
export function resolveComponent(map: ComponentMap, pick: { mesh?: string; material?: string }): Resolution {
  if (pick.mesh) {
    const hit = lookup(map.entries, "mesh", pick.mesh);
    if (hit) return { componentId: hit.value, method: "mesh", key: hit.key };
  }
  if (pick.material) {
    const hit = lookup(map.entries, "material", pick.material);
    if (hit) return { componentId: hit.value, method: "material", key: hit.key };
    if (lookup(map.ignored, "material", pick.material)) return { componentId: null, method: "ignored" };
  }
  if (pick.mesh) {
    for (const k of Object.keys(map.entries)) {
      if (k.startsWith("meshprefix:") && pick.mesh.startsWith(k.slice("meshprefix:".length))) return { componentId: map.entries[k], method: "meshprefix", key: k };
    }
  }
  return { componentId: null, method: "unidentified" };
}

/** Graph for the engine. Neighbour lists are written on both sides, so each pair is kept once. */
export function toGraph(c: Catalog): { nodes: GNode[]; edges: GEdge[] } {
  const nodes: GNode[] = c.components.map((x) => ({
    id: x.id,
    material: x.material,
    energetic: x.energetic ? { kind: x.energetic.kind, heatToRuptureS: x.energetic.heatToRuptureS, blastRadiusM: x.energetic.blastRadiusM, o2Enrich: x.energetic.o2Enrich } : undefined,
  }));
  const seen = new Set<string>();
  const edges: GEdge[] = [];
  for (const x of c.components) {
    for (const n of x.neighbors) {
      const key = [x.id, n.id].sort().join("|") + n.path;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ from: x.id, to: n.id, path: n.path, distanceM: n.distanceM });
    }
  }
  return { nodes, edges };
}

export function measuresFor(c: Catalog, componentId: string): CMeasure[] {
  const seen = new Set<string>();
  const out: CMeasure[] = [];
  for (const comp of c.components) {
    for (const m of comp.measures) {
      if (m.appliesTo.includes(componentId) && !seen.has(m.id)) { seen.add(m.id); out.push(m); }
    }
  }
  return out;
}

/** Applied catalog measures -> engine measures (all applied at the same simulated time). */
export function engineMeasures(c: Catalog, applied: string[], atS: number): GMeasure[] {
  const out: GMeasure[] = [];
  const seen = new Set<string>();
  for (const comp of c.components) {
    for (const m of comp.measures) {
      if (!applied.includes(m.id) || seen.has(m.id)) continue;
      seen.add(m.id);
      out.push(m.engine.kind === "cut_edge" ? { id: m.id, kind: "cut_edge", from: m.engine.from, to: m.engine.to, atS } : { id: m.id, kind: "relieve", target: m.engine.target, atS });
    }
  }
  return out;
}
