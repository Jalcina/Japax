/**
 * Rupture notice (pure, testable with plain node): turns the engine's event list into the facts the UI shows when the fire
 * reaches an energetic component (an oxygen tank, a battery...). It reads the SAME events as the timeline; it never runs a
 * second simulation and never invents a number: every figure comes from an event or from the catalog.
 *
 * PHYSICS WORDING: the stored oxygen feeds the combustion and holds the pressure; it is not "the cause" by itself. The model
 * treats the rupture as the end of an ASSUMED heating window (catalog heatToRuptureS), not as a strength/pressure calculation.
 */
import type { CEvent } from "./componentSpread.ts";
import type { Catalog, CComponent } from "./componentCatalog.ts";

export type ReportStatus = "none" | "heating" | "ruptured" | "relieved";
export interface ChainStep { id: string; label: string; t: number }
export interface RuptureReport {
  status: ReportStatus;
  tankId: string;
  tankLabel: string;
  originId: string;
  /** components the fire crossed to get to the tank, in order, with the time each one started to burn */
  chain: ChainStep[];
  /** when the tank itself started to burn (simulated s) */
  reachedAt: number | null;
  /** s the tank has been heated at time `now` (heating) or until the rupture (ruptured) */
  exposureS: number | null;
  ruptureAt: number | null;
  plannedRuptureAt: number | null;
  window: [number, number];
  usedS: number;
  /** heating only: seconds left to the planned rupture and to the two ends of the assumed window */
  remainingToPlannedS: number | null;
  remainingToWindowS: [number, number] | null;
  forced: boolean;
  relievedAt: number | null;
  consequences: { id: string; label: string; t: number; state: string }[];
}

/** Short name: the catalog labels can carry a parenthesis ("... (not a selectable part of the 3D model)") */
export const shortLabel = (c: { label: string }) => c.label.replace(/\s*\(.*\)\s*$/, "");

export function energeticOf(cat: Catalog): CComponent | undefined {
  return cat.components.find((c) => c.energetic);
}

/** `now` is the simulated time on screen; events later than `now` are not shown yet (but the planned rupture time is known to the engine) */
export function ruptureReport(events: CEvent[], now: number, cat: Catalog, origin: string): RuptureReport | null {
  const tank = energeticOf(cat);
  if (!tank?.energetic) return null;
  const label = (id: string) => cat.components.find((x) => x.id === id)?.label ?? id;
  const burn = (id: string) => events.find((e) => e.componentId === id && e.state === "burning");
  const tb = burn(tank.id);
  const [lo, hi] = tank.energetic.heatToRuptureS;
  const base: RuptureReport = {
    status: "none", tankId: tank.id, tankLabel: shortLabel(tank), originId: origin, chain: [], reachedAt: null, exposureS: null,
    ruptureAt: null, plannedRuptureAt: null, window: [lo, hi], usedS: (lo + hi) / 2, remainingToPlannedS: null, remainingToWindowS: null,
    forced: false, relievedAt: null, consequences: [],
  };
  if (!tb || tb.t > now) return base;

  // walk back along the "spread:<id>" causes to the ignition point
  const chain: ChainStep[] = [];
  const seen = new Set<string>();
  for (let e: CEvent | undefined = tb; e && !seen.has(e.componentId); ) {
    seen.add(e.componentId);
    chain.unshift({ id: e.componentId, label: label(e.componentId), t: e.t });
    const parent: string | null = e.cause?.startsWith("spread:") ? e.cause.slice(7) : null;
    e = parent ? burn(parent) : undefined;
  }

  const rupt = events.find((e) => e.componentId === tank.id && e.state === "ruptured");
  const relieved = events.find((e) => e.componentId === tank.id && e.state === "relieved");
  const planned = rupt?.t ?? null;
  const ruptShown = rupt && rupt.t <= now ? rupt : undefined;
  const relShown = relieved && relieved.t <= now ? relieved : undefined;
  const out: RuptureReport = { ...base, chain, reachedAt: tb.t, plannedRuptureAt: planned, forced: !!rupt?.forced };

  if (ruptShown) {
    out.status = "ruptured";
    out.ruptureAt = ruptShown.t;
    out.exposureS = ruptShown.t - tb.t;
    out.consequences = events
      .filter((e) => e.t <= now && e.cause === `rupture:${tank.id}` && (e.state === "damaged" || e.state === "burning"))
      .map((e) => ({ id: e.componentId, label: label(e.componentId), t: e.t, state: e.state }));
  } else if (relShown) {
    out.status = "relieved";
    out.relievedAt = relShown.t;
    out.exposureS = Math.max(0, relShown.t - tb.t);
  } else {
    out.status = "heating";
    out.exposureS = Math.max(0, now - tb.t);
    out.remainingToPlannedS = planned === null ? null : Math.max(0, planned - now);
    out.remainingToWindowS = [Math.max(0, lo - out.exposureS), Math.max(0, hi - out.exposureS)];
  }
  return out;
}
