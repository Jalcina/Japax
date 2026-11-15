// Run with: npm run test:lab   (node >= 23 strips TypeScript types natively)
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { toGraph, engineMeasures } from "../lib/componentCatalog.ts";
import { simulate } from "../lib/componentSpread.ts";
import { buildCsv, csvCell, csvFileName, neutraliseFormula, CSV_COLUMNS } from "../lib/componentCsv.ts";
import { ruptureReport } from "../lib/componentReport.ts";

const catalog = JSON.parse(readFileSync(new URL("../data/components/emu.catalog.json", import.meta.url), "utf8"));
const SUIT = { o2: 1, pressureAtm: 0.293, gravityG: 0, flowCmS: 0 };
const TANK = "emu-plss-o2-tank";
const sim = (o) => simulate({ ...toGraph(catalog), atm: SUIT, ignite: TANK, horizonS: 600, ...o });
const labels = Object.fromEntries(catalog.components.map((c) => [c.id, c.label]));
const record = (events, over = {}) => ({
  runId: "run-001", timestampUtc: "2026-11-15T10:00:00.000Z", appVersion: "0.1.0", env: "suit", startComponent: TANK, atm: SUIT,
  forced: false, measuredOnly: false, measuresApplied: {}, events, labels, componentCount: catalog.components.length, ...over,
});

/** minimal RFC 4180 parser: quotes, doubled quotes, commas and newlines inside quotes */
function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\r") { /* skip */ }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
const col = (name) => CSV_COLUMNS.indexOf(name);

test("CSV: BOM, header with the minimum columns, one row per engine event plus one summary row", () => {
  const r = sim();
  const csv = buildCsv([record(r.events)], () => "src");
  assert.equal(csv.charCodeAt(0), 0xfeff);
  const rows = parseCsv(csv.slice(1));
  assert.deepEqual(rows[0], [...CSV_COLUMNS]);
  for (const c of ["run_id", "timestamp_utc", "app_version", "env", "start_component", "o2", "pressure_atm", "gravity_g", "flow_cm_s", "forced_failure", "measured_only", "measure_applied", "t_sim_s", "t_real_equiv_s", "event", "component_id", "component_label", "state", "level", "source"]) assert.ok(col(c) >= 0, c);
  assert.equal(rows.length - 1, r.events.length + 1);
  const ev = rows.slice(1, -1);
  r.events.forEach((e, i) => {
    assert.equal(ev[i][col("component_id")], e.componentId);
    assert.equal(ev[i][col("state")], e.state);
    assert.equal(ev[i][col("level")], e.tag);
    assert.equal(Number(ev[i][col("t_sim_s")]), Math.round(e.t * 10) / 10);
    assert.equal(ev[i][col("event")], "engine_event");
  });
  const s = rows.at(-1);
  assert.equal(s[col("event")], "summary");
  assert.match(s[col("reason")], /rupture=yes; t_rupture_s=75/);
  assert.match(s[col("reason")], /components_reached=6\/6/);
});

test("CSV: a run that does not end in a rupture is exported too, with rupture=no", () => {
  const starved = simulate({ ...toGraph(catalog), atm: { o2: 0.21, pressureAtm: 1, gravityG: 0, flowCmS: 0 }, ignite: "emu-upper-garment", horizonS: 600 });
  const rows = parseCsv(buildCsv([record(starved.events, { startComponent: "emu-upper-garment" })], () => "").slice(1));
  assert.match(rows.at(-1)[col("reason")], /rupture=no; t_rupture_s=n\/a/);
});

test("CSV: every ignition is its own run_id and all runs of the session are in the file", () => {
  const a = sim(), b = sim({ forceRupture: TANK });
  const rows = parseCsv(buildCsv([record(a.events, { runId: "run-001" }), record(b.events, { runId: "run-002", forced: true })], () => "").slice(1));
  assert.equal(rows.length - 1, a.events.length + 1 + b.events.length + 1);
  assert.deepEqual([...new Set(rows.slice(1).map((r) => r[col("run_id")]))], ["run-001", "run-002"]);
  assert.equal(rows.slice(1).filter((r) => r[col("event")] === "summary").length, 2);
  assert.equal(rows.slice(1).find((r) => r[0] === "run-002")[col("forced_failure")], "true");
});

test("CSV: commas, double quotes and line breaks are escaped and survive a round trip", () => {
  const ev = [{ t: 1, componentId: "x", state: "burning", tag: "estimated", reason: 'a, b "quoted"\nsecond line' }];
  const csv = buildCsv([record(ev, { labels: { x: 'Label, with "quotes"' } })], () => "src, with comma");
  const rows = parseCsv(csv.slice(1));
  assert.equal(rows[1][col("reason")], 'a, b "quoted"\nsecond line');
  assert.equal(rows[1][col("component_label")], 'Label, with "quotes"');
  assert.equal(rows[1][col("source")], "src, with comma");
  assert.equal(rows[1].length, CSV_COLUMNS.length);
});

test("CSV: cells that start with = + - @ tab or CR get an apostrophe (formula injection)", () => {
  for (const bad of ['=HYPERLINK("http://x")', "+1+1", "-2+3", "@SUM(A1)", "\tcmd", "\rcmd"]) {
    assert.ok(neutraliseFormula(bad).startsWith("'"), JSON.stringify(bad));
    assert.ok(csvCell(bad).replace(/^"/, "").startsWith("'"), JSON.stringify(bad));
  }
  assert.equal(neutraliseFormula("safe =text"), "safe =text");
  const ev = [{ t: 0, componentId: "x", state: "burning", tag: "estimated", reason: "=cmd|' /C calc'!A0" }];
  const rows = parseCsv(buildCsv([record(ev, { labels: { x: "@evil" } })], () => "+src").slice(1));
  assert.equal(rows[1][col("reason")][0], "'");
  assert.equal(rows[1][col("component_label")], "'@evil");
  assert.equal(rows[1][col("source")], "'+src");
});

test("CSV file name: japax-simulation-<env>-<date>.csv", () => {
  assert.equal(csvFileName("suit", new Date("2026-11-15T12:00:00Z")), "japax-simulation-suit-2026-11-15.csv");
  assert.equal(csvFileName("../x y", new Date("2026-11-15T12:00:00Z")), "japax-simulation-xy-2026-11-15.csv");
});

test("rupture report: tank as origin, heating then ruptured, with the facts of the engine", () => {
  const r = sim();
  const heat = ruptureReport(r.events, 10, catalog, TANK);
  assert.equal(heat.status, "heating");
  assert.equal(heat.exposureS, 10);
  assert.equal(heat.plannedRuptureAt, 75);
  assert.equal(heat.remainingToPlannedS, 65);
  assert.deepEqual(heat.remainingToWindowS, [20, 110]);
  const rupt = ruptureReport(r.events, 80, catalog, TANK);
  assert.equal(rupt.status, "ruptured");
  assert.equal(rupt.exposureS, 75);
  assert.equal(rupt.forced, false);
  assert.deepEqual(rupt.chain.map((c) => c.id), [TANK]);
  assert.ok(rupt.consequences.length > 0 && rupt.consequences.every((c) => c.t === 75));
});

test("rupture report: no notice before the fire reaches the tank; a chain from a garment ends at the tank", () => {
  const r = sim({ ignite: "emu-upper-garment" });
  const early = ruptureReport(r.events, 0, catalog, "emu-upper-garment");
  assert.equal(early.status, "none");
  const late = ruptureReport(r.events, 600, catalog, "emu-upper-garment");
  if (late.status !== "none") {
    assert.equal(late.chain[0].id, "emu-upper-garment");
    assert.equal(late.chain.at(-1).id, TANK);
    assert.ok(late.chain.every((c, i, a) => i === 0 || c.t >= a[i - 1].t));
  }
});

test("rupture report: forced scenario is flagged; a vent measure gives relieved; a catalog without energetic gives null", () => {
  const f = ruptureReport(sim({ forceRupture: TANK }).events, 5, catalog, TANK);
  assert.equal(f.status, "ruptured");
  assert.equal(f.forced, true);
  assert.equal(f.exposureS, 0);
  const vent = sim({ measures: engineMeasures(catalog, ["m-tank-vent"], 3) });
  const rel = ruptureReport(vent.events, 100, catalog, TANK);
  assert.equal(rel.status, "relieved");
  assert.equal(rel.relievedAt, 3);
  const noEnergetic = { ...catalog, components: catalog.components.map((c) => ({ ...c, energetic: undefined })) };
  assert.equal(ruptureReport(sim().events, 10, noEnergetic, TANK), null);
});
