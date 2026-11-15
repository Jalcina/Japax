// Run with: npm run test:lab   (node >= 23 strips TypeScript types natively)
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { toGraph, engineMeasures } from "../lib/componentCatalog.ts";
import { simulate, END_ID } from "../lib/componentSpread.ts";
import { buildCsv, CSV_COLUMNS } from "../lib/componentCsv.ts";
import { buildRunRecord, buildReportTxt, metricText } from "../lib/runRecord.ts";

const rd = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const emu = rd("../data/components/emu.catalog.json");
const iss = rd("../data/components/iss.catalog.json");
const SUIT = { o2: 1, pressureAtm: 0.293, gravityG: 0, flowCmS: 0 };
const STARVED = { o2: 0.21, pressureAtm: 1, gravityG: 0, flowCmS: 0 };
const ISS = { o2: 0.21, pressureAtm: 1, gravityG: 0, flowCmS: 10 };
const TANK = "emu-plss-o2-tank";
const run = (cat, atm, ignite, o = {}) => simulate({ ...toGraph(cat), atm, ignite, horizonS: 600, ...o });
const record = (cat, env, atm, source, s, over = {}) => buildRunRecord({
  runId: "run-001", timestampUtc: "2026-11-15T10:00:00.000Z", appVersion: "0.1.0", env, source, atm, atmTag: "estimated",
  forced: false, measuredOnly: false, applied: {}, events: s.events, catalog: cat, ...over,
});
const col = (n) => CSV_COLUMNS.indexOf(n);

function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\r") { /* skip */ }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

// one scenario per end reason the engine can emit
const SCENARIOS = {
  ruptured_and_settled: () => ({ cat: emu, env: "suit", atm: SUIT, src: TANK, s: run(emu, SUIT, TANK) }),
  self_extinguished: () => ({ cat: emu, env: "suit", atm: STARVED, src: "emu-upper-garment", s: run(emu, STARVED, "emu-upper-garment") }),
  extinguished_by_measure: () => ({ cat: iss, env: "iss", atm: ISS, src: "iss-unity", s: run(iss, ISS, "iss-unity", { horizonS: 7200, measures: engineMeasures(iss, ["m-iss-vent-off"], 0) }) }),
  horizon_reached: () => ({ cat: iss, env: "iss", atm: ISS, src: "iss-unity", s: run(iss, ISS, "iss-unity", { horizonS: 7200 }) }),
  burned_out: () => ({ cat: iss, env: "iss", atm: ISS, src: "iss-unity", s: run(iss, ISS, "iss-unity", { horizonS: 1e6 }) }),
};

test("the engine emits the terminal end event with each reason, exactly once, and nothing happens after it", () => {
  for (const [reason, mk] of Object.entries(SCENARIOS)) {
    const { s } = mk();
    assert.equal(s.end.reason, reason, reason);
    const ends = s.events.filter((e) => e.state === "end");
    assert.equal(ends.length, 1, reason);
    assert.equal(s.events.at(-1), ends[0], `${reason}: end is the last event`);
    assert.equal(ends[0].componentId, END_ID);
    assert.equal(ends[0].endReason, reason);
    assert.ok(s.events.every((e) => e.t <= s.end.t), `${reason}: no event after the end time`);
    assert.ok(s.end.why.length > 10);
  }
});

test("a run is deterministic: simulating again gives the same events (no events or metrics appear after the end)", () => {
  const a = SCENARIOS.ruptured_and_settled().s, b = SCENARIOS.ruptured_and_settled().s;
  assert.deepEqual(a.events, b.events);
  const r = record(emu, "suit", SUIT, TANK, a);
  assert.equal(r.timeline.at(-1).state, "end");
  assert.equal(r.endT, a.end.t);
  assert.ok(r.timeline.every((e) => e.t <= r.endT));
});

test("RunRecord is immutable (deeply frozen)", () => {
  const { cat, env, atm, src, s } = SCENARIOS.ruptured_and_settled();
  const r = record(cat, env, atm, src, s);
  assert.ok(Object.isFrozen(r) && Object.isFrozen(r.timeline) && Object.isFrozen(r.timeline[0]) && Object.isFrozen(r.metrics[0]) && Object.isFrozen(r.atm));
  assert.throws(() => { r.endT = 1; }, TypeError);
  assert.throws(() => { r.timeline.push({}); }, TypeError);
});

test("completeness: no undefined, NaN or empty text in the record; every event has a tag and a source; missing data says why", () => {
  const optionalNull = new Set(["ignitionS", "burningS", "atS", "ruptureAt", "exposureS", "relievedAt", "plannedRuptureAt", "reachedAt", "remainingToPlannedS", "remainingToWindowS", "rupture"]);
  for (const [reason, mk] of Object.entries(SCENARIOS)) {
    const { cat, env, atm, src, s } = mk();
    const r = record(cat, env, atm, src, s);
    const bad = [];
    const walk = (v, path) => {
      if (v === undefined) bad.push(`${path}: undefined`);
      else if (typeof v === "number" && !Number.isFinite(v)) bad.push(`${path}: ${v}`);
      else if (typeof v === "string" && v.trim() === "") bad.push(`${path}: empty`);
      else if (v === null) { if (!optionalNull.has(path.split(".").pop().replace(/\[\d+\]/, ""))) bad.push(`${path}: null`); }
      else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`));
      else if (typeof v === "object") for (const [k, x] of Object.entries(v)) { if (k === "events") continue; walk(x, `${path}.${k}`); }
    };
    walk(r, reason);
    assert.deepEqual(bad, [], reason);
    assert.ok(r.timeline.length === s.events.length && r.timeline.every((e) => e.level && e.source));
    assert.equal(r.summary.length, 5);
    assert.equal(r.components.length, cat.components.length, "every component is listed, reached or not");
    assert.equal(r.phases.length, 4);
    assert.ok(r.factors.length >= 5 && r.measures.length >= 1 && r.gaps.length >= 1);
    for (const m of r.metrics) if (m.value === "not available") assert.ok(m.note.startsWith("not available:"), `${reason}/${m.key}`);
    for (const c of r.components) if (c.ignitionS === null) { assert.notEqual(c.finalState, "burning"); assert.ok(c.propagatedFrom.startsWith("not available:")); assert.ok(c.note.length > 0); }
  }
});

test("components that did not burn appear as not reached with the reason (ISS with the ventilation off)", () => {
  const { cat, env, atm, src, s } = SCENARIOS.extinguished_by_measure();
  const r = record(cat, env, atm, src, s, { applied: { "m-iss-vent-off": 0 } });
  const destiny = r.components.find((c) => c.id === "iss-destiny");
  assert.equal(destiny.finalState, "not_reached");
  assert.match(destiny.note, /starves/);
  assert.equal(r.measures.find((m) => m.id === "m-iss-vent-off").status, "applied");
  assert.equal(r.measures.filter((m) => m.status === "offered").length, r.measures.length - 1);
});

test("parity: every event of the RunRecord is in the CSV and every metric of the window exists in the CSV summary row", () => {
  for (const [reason, mk] of Object.entries(SCENARIOS)) {
    const { cat, env, atm, src, s } = mk();
    const r = record(cat, env, atm, src, s);
    const rows = parseCsv(buildCsv([r]).slice(1)).slice(1);
    const ev = rows.filter((x) => x[col("event")] === "engine_event");
    assert.equal(ev.length, r.timeline.length, reason);
    r.timeline.forEach((e, i) => {
      assert.equal(ev[i][col("component_id")], e.componentId);
      assert.equal(ev[i][col("component_label")], e.component);
      assert.equal(ev[i][col("state")], e.state);
      assert.equal(ev[i][col("level")], e.level);
      assert.equal(ev[i][col("source")], e.source);
      assert.equal(ev[i][col("reason")], e.reason);
      assert.equal(Number(ev[i][col("t_sim_s")]), Math.round(e.t * 10) / 10);
    });
    const summary = rows.find((x) => x[col("event")] === "summary");
    for (const m of r.metrics) assert.ok(summary[col("reason")].includes(metricText(m)), `${reason}: metric ${m.key} missing in the CSV`);
  }
});

test("runs cut early are closed with their own end reason and only contain events up to that moment", () => {
  const s = SCENARIOS.ruptured_and_settled().s;
  for (const reason of ["interrupted_by_user", "in_progress", "extinguished_by_suppression_system"]) {
    const r = record(emu, "suit", SUIT, TANK, s, { endAt: { t: 40, reason } });
    assert.equal(r.endReason, reason);
    assert.equal(r.endT, 40);
    assert.ok(r.timeline.every((e) => e.t <= 40));
    assert.equal(r.timeline.at(-1).state, "end");
    assert.ok(r.timeline.at(-1).source.length > 0);
    assert.equal(r.metrics.find((m) => m.key === "time_to_rupture_s").value, "not available", "no rupture happened before the cut");
  }
  const sup = record(emu, "suit", SUIT, TANK, s, { endAt: { t: 40, reason: "extinguished_by_suppression_system" } });
  assert.equal(sup.metrics.find((m) => m.key === "time_to_extinction_s").value, "40");
});

test("the .txt report is generated only from the RunRecord and lists every event, every component and every metric", () => {
  const { cat, env, atm, src, s } = SCENARIOS.ruptured_and_settled();
  const r = record(cat, env, atm, src, s);
  const txt = buildReportTxt(r);
  for (const sec of ["Summary", "Conditions and assumptions", "Timeline", "Components", "Measures", "Rupture", "Safety ladder", "Metrics", "Data gaps"]) assert.ok(txt.includes(sec), sec);
  for (const e of r.timeline) assert.ok(txt.includes(e.reason), `event ${e.state} ${e.t}`);
  for (const c of cat.components) assert.ok(txt.includes(c.label), c.id);
  for (const m of r.metrics) assert.ok(txt.includes(m.key), m.key);
  assert.ok(!/undefined|NaN/.test(txt));
});

test("an environment without an energetic component says so instead of inventing a rupture", () => {
  const { cat, env, atm, src, s } = SCENARIOS.burned_out();
  const r = record(cat, env, atm, src, s);
  assert.equal(r.rupture, null);
  assert.match(r.summary[2], /no verified energetic component/);
  assert.match(r.metrics.find((m) => m.key === "time_to_rupture_s").note, /no verified energetic component/);
});
