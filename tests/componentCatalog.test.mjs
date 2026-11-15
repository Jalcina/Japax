// Run with: npm run test:lab   (node >= 23 strips TypeScript types natively)
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateCatalog, resolveComponent, toGraph, engineMeasures, measuresFor } from "../lib/componentCatalog.ts";
import { simulate } from "../lib/componentSpread.ts";

const rd = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const catalog = JSON.parse(rd("../data/components/emu.catalog.json"));
const map = JSON.parse(rd("../data/components/emu.map.json"));

const glbMaterials = (file) => {
  const b = readFileSync(new URL(file, import.meta.url));
  const len = b.readUInt32LE(12);
  return JSON.parse(b.subarray(20, 20 + len).toString("utf8")).materials.map((m) => m.name);
};

const SUIT = { o2: 1, pressureAtm: 0.293, gravityG: 0, flowCmS: 0 };
const STARVED = { o2: 0.21, pressureAtm: 1, gravityG: 0, flowCmS: 0 };
const ev = (r, id, state) => r.events.find((e) => e.componentId === id && e.state === state);
const run = (o) => { const g = toGraph(catalog); return simulate({ ...g, atm: SUIT, ignite: "emu-upper-garment", horizonS: 4000, ...o }); };

test("the EMU catalog is valid: neighbours exist, every Fact has tag and src, every component has a material, neighbours and a measure", () => {
  assert.deepEqual(validateCatalog(catalog), []);
});

test("validateCatalog catches a Fact without a source and a neighbour that does not exist", () => {
  const bad = structuredClone(catalog);
  bad.components[0].flammability.src = "";
  bad.components[1].neighbors.push({ id: "nope", path: "contact", distanceM: 1, distanceNote: "x" });
  const problems = validateCatalog(bad).join("\n");
  assert.match(problems, /emu-upper-garment.*src/);
  assert.match(problems, /nope/);
});

test("every material of emu.glb is mapped, ignored on purpose or declared unidentified, and nothing is listed twice", () => {
  const keys = [...Object.keys(map.entries), ...Object.keys(map.ignored), ...map.unidentified];
  assert.equal(new Set(keys).size, keys.length);
  for (const m of glbMaterials("../public/models/emu.glb")) assert.ok(keys.includes(`material:${m}`), `unmapped material ${m}`);
  assert.equal(keys.length, glbMaterials("../public/models/emu.glb").length);
});

test("every componentId in the map exists in the catalog", () => {
  const ids = new Set(catalog.components.map((c) => c.id));
  for (const id of Object.values(map.entries)) assert.ok(ids.has(id), id);
});

test("resolveComponent: material hit, ignored layer, unknown material and the sanitised-name variant", () => {
  assert.deepEqual(resolveComponent(map, { mesh: "x", material: "EMU:emusuit21_blinn12SG" }), { componentId: "emu-helmet-fittings", method: "material", key: "material:EMU:emusuit21_blinn12SG" });
  assert.equal(resolveComponent(map, { material: "EMU:emusuit21_lambert5SG" }).method, "ignored");
  assert.equal(resolveComponent(map, { material: "EMU:emusuit21_lambert4SG" }).componentId, "emu-lower-garment");
  const un = resolveComponent(map, { material: "EMU:emusuit21_lambert8SG" });
  assert.equal(un.componentId, null);
  assert.equal(un.method, "unidentified");
  assert.equal(resolveComponent(map, { material: "nothing-like-this" }).componentId, null);
  assert.equal(resolveComponent(map, { material: "EMU_emusuit21_blinn12SG" }).componentId, "emu-helmet-fittings");
});

test("the energetic component is the virtual PLSS tank and carries sourced facts", () => {
  const tank = catalog.components.find((c) => c.energetic);
  assert.equal(tank.id, "emu-plss-o2-tank");
  assert.equal(tank.virtual, true);
  assert.match(tank.energetic.failureMode.src, /NTRS 20110015690/);
  assert.match(tank.energetic.pressureNote.src, /NTRS 20150009506/);
});

test("toGraph keeps each pair once and carries the energetic spec to the engine", () => {
  const g = toGraph(catalog);
  const pairs = g.edges.map((e) => [e.from, e.to].sort().join("|") + e.path);
  assert.equal(new Set(pairs).size, pairs.length);
  assert.deepEqual(g.nodes.find((n) => n.id === "emu-plss-o2-tank").energetic.heatToRuptureS, [30, 120]);
});

test("a fire on the upper garment spreads to the rest of the suit and ends in a rupture of the O2 tank", () => {
  const r = run();
  assert.ok(ev(r, "emu-lower-garment", "burning"));
  assert.ok(ev(r, "emu-plss-o2-tank", "burning"));
  assert.ok(ev(r, "emu-plss-o2-tank", "ruptured"));
  assert.ok(r.events.some((e) => e.cause === "rupture:emu-plss-o2-tank"));
});

test("physical path is the default; forced failure is labelled and immediate", () => {
  assert.equal(ev(run(), "emu-plss-o2-tank", "ruptured").forced, undefined);
  const f = ev(run({ forceRupture: "emu-plss-o2-tank" }), "emu-plss-o2-tank", "ruptured");
  assert.equal(f.t, 0);
  assert.equal(f.forced, true);
});

test("applying the catalog measures changes the result: shield or vent stops the rupture, the waist break protects the legs", () => {
  const shield = run({ measures: engineMeasures(catalog, ["m-tank-shield"], 0) });
  assert.equal(ev(shield, "emu-plss-o2-tank", "ruptured"), undefined);
  const vent = run({ measures: engineMeasures(catalog, ["m-tank-vent"], 0) });
  assert.equal(ev(vent, "emu-plss-o2-tank", "ruptured"), undefined);
  assert.ok(ev(vent, "emu-plss-o2-tank", "relieved"));
  const waist = run({ measures: engineMeasures(catalog, ["m-waist-break"], 0) });
  assert.equal(ev(waist, "emu-lower-garment", "burning"), undefined);
});

test("a measure applied after the failure window does not prevent the rupture", () => {
  const late = run({ measures: engineMeasures(catalog, ["m-tank-vent"], 3000) });
  assert.ok(ev(late, "emu-plss-o2-tank", "ruptured"));
});

test("there is a case where the fire does NOT spread: no airflow at 21 % O2 in 0 g", () => {
  const r = run({ atm: STARVED });
  assert.equal(ev(r, "emu-lower-garment", "burning"), undefined);
  assert.ok(ev(r, "emu-lower-garment", "not_reached"));
  assert.equal(ev(r, "emu-plss-o2-tank", "ruptured"), undefined);
});

test("measuresFor lists the measures of one component and every measure has a tag, a source and an engine action", () => {
  const ms = measuresFor(catalog, "emu-plss-o2-tank");
  assert.deepEqual(ms.map((m) => m.id).sort(), ["m-tank-shield", "m-tank-vent"]);
  for (const c of catalog.components) for (const m of c.measures) {
    assert.ok(m.effect.tag && m.effect.src);
    assert.ok(["cut_edge", "relieve"].includes(m.engine.kind));
  }
});
