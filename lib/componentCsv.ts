/**
 * CSV export of simulation runs (pure, testable with plain node; the browser only wraps the text in a Blob).
 *
 * The rows come from the RunRecord (lib/runRecord.ts), the single source of truth that the results window and the .txt report also use;
 * there is no parallel log. One row per engine event (the terminal `end` event included) plus one `event=summary` row per run whose
 * `reason` column carries every metric of the window as `key=value unit`. UTF-8 with BOM (Excel), comma separator, CRLF rows, double
 * quotes escaped by doubling, and spreadsheet-formula injection neutralised (a cell that starts with = + - @ tab or CR gets an apostrophe).
 *
 * `level` is the engine tag as is (measured | reported | predicted | estimated); `reported` is kept apart from `measured`.
 * `t_real_equiv_s` equals `t_sim_s`: the component engine already runs in physical seconds; the on-screen playback speed is a UI control only.
 */
import { metricText, type RunRecord } from "./runRecord.ts";

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

export function buildCsv(runs: RunRecord[]): string {
  const rows: string[] = [CSV_COLUMNS.join(",")];
  for (const run of runs) {
    const applied = Object.entries(run.measuresApplied).map(([id, at]) => `${id}@${r1(at)}s`).join("; ") || "none";
    const head = (): (string | number | boolean)[] => [
      run.runId, run.timestampUtc, run.appVersion, run.env, run.startComponent, run.atm.o2, run.atm.pressureAtm, run.atm.gravityG, run.atm.flowCmS,
      run.forced, run.measuredOnly, applied,
    ];
    for (const e of run.timeline) {
      rows.push(csvRow([...head(), r1(e.t), r1(e.t), "engine_event", e.componentId, e.component, e.state, e.level, e.source, e.reason]));
    }
    rows.push(csvRow([...head(), r1(run.endT), r1(run.endT), "summary", "", "", "summary", "estimated", "JaPax run record (lib/runRecord.ts)", run.metrics.map(metricText).join("; ")]));
  }
  return "﻿" + rows.join("\r\n") + "\r\n";
}

export function csvFileName(env: string, now: Date = new Date()): string {
  return `japax-simulation-${env.replace(/[^a-z0-9_-]/gi, "")}-${now.toISOString().slice(0, 10)}.csv`;
}
