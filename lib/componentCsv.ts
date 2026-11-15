/**
 * CSV export of the component simulations of a session (pure, testable with plain node; the browser only wraps the text in a Blob).
 *
 * The rows come from the SAME event list the timeline shows (RunRecord.events = sim.events); there is no parallel log.
 * One row per engine event plus one `event=summary` row per run. UTF-8 with BOM (Excel), comma separator, CRLF rows, double quotes
 * escaped by doubling, and spreadsheet-formula injection neutralised (a cell that starts with = + - @ tab or CR gets a leading apostrophe).
 *
 * `level` is the engine tag as is (measured | reported | predicted | estimated); `reported` (published by the experiment authors)
 * is kept apart from `measured` instead of being merged into it.
 * `t_real_equiv_s` equals `t_sim_s`: the component engine already runs in physical seconds; the on-screen playback speed is a UI control only.
 */
import type { CEvent } from "./componentSpread.ts";

export interface RunRecord {
  runId: string;
  timestampUtc: string;
  appVersion: string;
  env: string;
  startComponent: string;
  atm: { o2: number; pressureAtm: number; gravityG: number; flowCmS: number };
  forced: boolean;
  measuredOnly: boolean;
  /** measure id -> simulated second at which it was applied */
  measuresApplied: Record<string, number>;
  /** the engine's full event list for this run (what the timeline plays) */
  events: CEvent[];
  /** component id -> label, and the total number of components of the catalog */
  labels: Record<string, string>;
  componentCount: number;
}

export const CSV_COLUMNS = [
  "run_id", "timestamp_utc", "app_version", "env", "start_component", "o2", "pressure_atm", "gravity_g", "flow_cm_s",
  "forced_failure", "measured_only", "measure_applied", "t_sim_s", "t_real_equiv_s", "event", "component_id", "component_label",
  "state", "level", "source", "reason",
] as const;

/** a cell that a spreadsheet could read as a formula gets an apostrophe in front */
export function neutraliseFormula(s: string): string {
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

export function csvCell(v: string | number | boolean | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = neutraliseFormula(String(v));
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function csvRow(cells: (string | number | boolean | null | undefined)[]): string {
  return cells.map(csvCell).join(",");
}

const r1 = (n: number) => (Math.round(n * 10) / 10).toString();

/** `sourceOf` gives the source text of one event (the catalog's failure-mode source for a rupture, the engine otherwise) */
export function buildCsv(runs: RunRecord[], sourceOf: (e: CEvent, run: RunRecord) => string): string {
  const rows: string[] = [CSV_COLUMNS.join(",")];
  for (const run of runs) {
    const applied = Object.entries(run.measuresApplied).map(([id, at]) => `${id}@${r1(at)}s`).join("; ");
    const head = (): (string | number | boolean)[] => [
      run.runId, run.timestampUtc, run.appVersion, run.env, run.startComponent, run.atm.o2, run.atm.pressureAtm, run.atm.gravityG, run.atm.flowCmS,
      run.forced, run.measuredOnly, applied,
    ];
    for (const e of run.events) {
      rows.push(csvRow([...head(), r1(e.t), r1(e.t), "engine_event", e.componentId, run.labels[e.componentId] ?? e.componentId, e.state, e.tag, sourceOf(e, run), e.reason]));
    }
    const reached = new Set(run.events.filter((e) => e.state === "burning" || e.state === "damaged" || e.state === "ruptured" || e.state === "relieved").map((e) => e.componentId)).size;
    const rupt = run.events.find((e) => e.state === "ruptured");
    const last = run.events.length ? run.events[run.events.length - 1].t : 0;
    const summary = `components_reached=${reached}/${run.componentCount}; rupture=${rupt ? "yes" : "no"}; t_rupture_s=${rupt ? r1(rupt.t) : "n/a"}; t_extinction_s=n/a (the component engine does not model extinction)`;
    rows.push(csvRow([...head(), r1(last), r1(last), "summary", "", "", "summary", "estimated", "JaPax component engine", summary]));
  }
  return "﻿" + rows.join("\r\n") + "\r\n";
}

export function csvFileName(env: string, now: Date = new Date()): string {
  return `japax-simulation-${env.replace(/[^a-z0-9_-]/gi, "")}-${now.toISOString().slice(0, 10)}.csv`;
}
