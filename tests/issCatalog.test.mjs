// Run with: npm run test:lab   (node >= 23 strips TypeScript types natively)
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateCatalog, resolveComponent, toGraph, engineMeasures } from "../lib/componentCatalog.ts";
import { simulate } from "../lib/componentSpread.ts";
import { ruptureReport } from "../lib/componentReport.ts";

const rd = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const catalog = JSON.parse(rd("../data/components/iss.catalog.json"));
const map = JSON.parse(rd("../data/components/iss.map.json"));
const ISS = { o2: 0.21, pressureAtm: 1, gravityG: 0, flowCmS: 10 };
const run = (o) => simulate({ ...toGraph(catalog), atm: ISS, ignite: "iss-unity", horizonS: 7200, ...o });
const ev = (r, id, state) => r.events.find((e) => e.componentId === id && e.state === state);

/** meshes of the GLB as the app sees them: material name, or the node name when the mesh has no material */
function glbKeys() {
  const b = readFileSync(new URL("../public/models/iss_hd.glb", import.meta.url));
  const j = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString("utf8"));
  const keys = [];
  for (const n of j.nodes) {
    if (n.mesh === undefined) continue;
    for (const p of j.meshes[n.mesh].primitives) {
      const mat = j.materials[p.material]?.name;
      keys.push(mat ? `material:${mat}` : `mesh:${n.name}`);
    }
  }
  return keys;
}

test("ISS catalog is valid: every Fact has tag and src, neighbours exist, each component has a measure that applies to it", () => {
  assert.deepEqual(validateCatalog(catalog), []);
});

test("ISS has at least 8 pressurised components and no energetic one (declared as a gap, not invented)", () => {
  assert.ok(catalog.components.length >= 8);
  assert.equal(catalog.components.some((c) => c.energetic), false);
  assert.ok(catalog.gaps.some((g) => /Energetic components: none verified/.test(g)));
  assert.equal(ruptureReport(run().events, 100, catalog, "iss-unity"), null);
});

test("ISS map covers every mesh/material of iss_hd.glb (the mesh without a material goes by mesh name) and only points at real components", () => {
  const known = new Set([...Object.keys(map.entries), ...Object.keys(map.ignored), ...map.unidentified]);
  const missing = glbKeys().filter((k) => !known.has(k));
  assert.deepEqual(missing, []);
  const ids = new Set(catalog.components.map((c) => c.id));
  for (const [k, id] of Object.entries(map.entries)) assert.ok(ids.has(id), `${k} -> ${id}`);
  assert.ok("mesh:IGOAL_SSREF_13" in map.ignored);
  for (const c of catalog.components) assert.ok(Object.values(map.entries).includes(c.id), `${c.id} has no mesh or material mapped to it`);
});

test("ISS resolution: material to component, ignored parts carry their reason, mesh name wins for the material-less mesh", () => {
  assert.equal(resolveComponent(map, { mesh: "IGOAL_SSREF_28", material: "Node 1" }).componentId, "iss-unity");
  const truss = resolveComponent(map, { mesh: "IGOAL_SSREF_3", material: "Truss" });
  assert.equal(truss.method, "ignored");
  assert.match(truss.note, /no oxidiser/);
  const m13 = resolveComponent(map, { mesh: "IGOAL_SSREF_13", material: "" });
  assert.equal(m13.method, "ignored");
  assert.match(m13.note, /no material/);
  assert.equal(resolveComponent(map, { mesh: "x", material: "not-in-the-map" }).method, "unidentified");
});

test("ISS engine: the fire crosses to the neighbours in minutes to hours, worst case, and every event is estimated", () => {
  const r = run();
  assert.ok(ev(r, "iss-destiny", "burning").t > 600);
  assert.ok(r.events.every((e) => e.tag === "estimated"));
});

test("ISS measures: closing a hatch lengthens the path, shutting off the ventilation starves the flame (also mid-transit)", () => {
  const base = run();
  const cut = run({ measures: engineMeasures(catalog, ["m-iss-hatch-unity-destiny"], 0) });
  assert.ok(ev(base, "iss-destiny", "burning"));
  // Destiny is still reached the long way round (Unity, Harmony/Tranquility, Destiny) but later than directly
  assert.ok(ev(cut, "iss-destiny", "burning").t > ev(base, "iss-destiny", "burning").t);
  const vent0 = run({ measures: engineMeasures(catalog, ["m-iss-vent-off"], 0) });
  assert.equal(ev(vent0, "iss-destiny", "burning"), undefined);
  assert.ok(ev(vent0, "iss-destiny", "not_reached"));
  const mid = run({ measures: engineMeasures(catalog, ["m-iss-vent-off"], 300) });
  assert.equal(ev(mid, "iss-destiny", "burning"), undefined);
  assert.equal(ev(mid, "iss-destiny", "not_reached").t, 300);
  // applied after the front has already arrived: nothing changes for that edge
  const late = run({ measures: engineMeasures(catalog, ["m-iss-vent-off"], 5000) });
  assert.equal(ev(late, "iss-destiny", "burning").t, ev(base, "iss-destiny", "burning").t);
});

test("set_flow with a flame that does not starve (100 % O2) only slows the front instead of stopping it", () => {
  const g = toGraph(catalog);
  const atm = { o2: 1, pressureAtm: 0.293, gravityG: 0, flowCmS: 10 };
  const base = simulate({ ...g, atm, ignite: "iss-unity", horizonS: 60000 });
  const slow = simulate({ ...g, atm, ignite: "iss-unity", horizonS: 60000, measures: [{ id: "x", kind: "set_flow", flowCmS: 0, atS: 0 }] });
  const a = ev(base, "iss-destiny", "burning"), b = ev(slow, "iss-destiny", "burning");
  assert.ok(a && b);
  assert.ok(b.t >= a.t);
});
