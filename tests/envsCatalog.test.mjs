// Run with: npm run test:lab   (node >= 23 strips TypeScript types natively)
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateCatalog, resolveComponent, toGraph, engineMeasures } from "../lib/componentCatalog.ts";
import { simulate } from "../lib/componentSpread.ts";
import { buildRunRecord } from "../lib/runRecord.ts";

const rd = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const load = (n) => ({ cat: JSON.parse(rd(`../data/components/${n}.catalog.json`)), map: JSON.parse(rd(`../data/components/${n}.map.json`)) });
const E = { "iss-interior": load("iss-interior"), earth: load("earth"), "earth-planet": load("earth-planet"), moon: load("moon") };
const scene = rd("../components/ImmersiveScene.tsx");
const ATM = { "iss-interior": { o2: 0.21, pressureAtm: 1, gravityG: 0, flowCmS: 10 }, earth: { o2: 0.21, pressureAtm: 1, gravityG: 1, flowCmS: 10 }, "earth-planet": { o2: 0.21, pressureAtm: 1, gravityG: 1, flowCmS: 10 }, moon: { o2: 0.3, pressureAtm: 0.694, gravityG: 0.166, flowCmS: 10 } };
const run = (env, ignite, o = {}) => simulate({ ...toGraph(E[env].cat), atm: ATM[env], ignite, horizonS: 7200, ...o });
const ev = (r, id, state) => r.events.find((e) => e.componentId === id && e.state === state);

test("every new environment catalog is valid (tags, sources, neighbours, a measure that applies to each component) and has no invented energetic component", () => {
  for (const [env, { cat }] of Object.entries(E)) {
    assert.deepEqual(validateCatalog(cat), [], env);
    assert.ok(cat.components.length >= 2, env);
    assert.equal(cat.components.some((c) => c.energetic), false, `${env}: no verified energetic component`);
    assert.ok(cat.gaps.some((g) => /Energetic components: none/.test(g)), `${env}: the missing energetic component is declared`);
  }
  assert.equal(E["iss-interior"].cat.components.length, 8);
  assert.equal(E.moon.cat.components.length, 6);
});

test("the procedural scenes name the objects that the maps refer to (ImmersiveScene.tsx)", () => {
  for (const n of ["isscab_hull", "isscab_strip", "isscab_handrail", "isscab_endring", "isscab_bulkhead", "isscab_probe", "earth_pad", "earth_extinguisher", "earth_ground", "earth_ridge", "earthplanet_surface", "earthplanet_clouds", "moon_ground", "moon_ridge"]) assert.ok(scene.includes(`"${n}"`), n);
  assert.ok(scene.includes("`isscab_rack_${i}`") && scene.includes("`earth_cone_${i}`"));
});

test("the lunar module map covers all 134 meshes of lm.glb by prefix, ignored name or declared unidentified", () => {
  const b = readFileSync(new URL("../public/models/lm.glb", import.meta.url));
  const j = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString("utf8"));
  const names = j.nodes.filter((n) => n.mesh !== undefined).map((n) => (n.name || "").replace(/\s/g, "_"));
  assert.equal(names.length, 134);
  const { map } = E.moon;
  const prefixes = [...Object.keys(map.entries), ...map.unidentified].filter((k) => k.startsWith("meshprefix:")).map((k) => k.slice(11));
  const ignored = new Set(Object.keys(map.ignored).filter((k) => k.startsWith("mesh:")).map((k) => k.slice(5)));
  const missing = names.filter((n) => !ignored.has(n) && !prefixes.some((p) => n.startsWith(p)));
  assert.deepEqual(missing, []);
  const ids = new Set(E.moon.cat.components.map((c) => c.id));
  for (const [k, id] of Object.entries(map.entries)) assert.ok(ids.has(id), `${k} -> ${id}`);
});

test("resolution: a tap on a part gives its component; ignored parts give their reason; opaque LM parts are unidentified, never invented", () => {
  assert.equal(resolveComponent(E.moon.map, { mesh: "group31_12_1" }).componentId, "lm-landing-gear");
  assert.equal(resolveComponent(E.moon.map, { mesh: "polySurfa2" }).componentId, "lm-ascent");
  assert.equal(resolveComponent(E.moon.map, { mesh: "group13_g4" }).componentId, "lm-rcs");
  assert.equal(resolveComponent(E.moon.map, { mesh: "group61_p1" }).method, "unidentified");
  assert.equal(resolveComponent(E.moon.map, { mesh: "pSphere27" }).method, "ignored");
  assert.equal(resolveComponent(E["iss-interior"].map, { mesh: "isscab_rack_3_door" }).componentId, "isscab-rack-3");
  assert.equal(resolveComponent(E["iss-interior"].map, { mesh: "isscab_hull" }).method, "ignored");
  assert.equal(resolveComponent(E.earth.map, { mesh: "earth_cone_2" }).componentId, "earth-cone-2");
  assert.match(resolveComponent(E.earth.map, { mesh: "earth_ground" }).note, /bare ground/);
  assert.equal(resolveComponent(E["earth-planet"].map, { mesh: "earthplanet_surface" }).componentId, "earthplanet-surface");
});

test("Earth fire site: the spill carries the fire to the four cones (not into the steel extinguisher); extinguisher, blanket and barriers change the result", () => {
  const base = run("earth", "earth-pan");
  for (let i = 0; i < 4; i++) assert.ok(ev(base, `earth-cone-${i}`, "burning"), `cone ${i}`);
  assert.match(ev(base, "earth-extinguisher", "not_reached").reason, /non-combustible/);
  assert.equal(base.end.reason, "burned_out");
  const t0 = ev(base, "earth-cone-0", "burning").t;
  assert.ok(t0 > 5);
  for (const m of ["m-earth-extinguish", "m-earth-blanket"]) {
    const out = run("earth", "earth-pan", { measures: engineMeasures(E.earth.cat, [m], 5, "earth-pan") });
    assert.equal(ev(out, "earth-pan", "extinguished").t, 5, m);
    assert.equal(ev(out, "earth-cone-0", "burning"), undefined, m);
    assert.equal(out.end.reason, "extinguished_by_measure", m);
    assert.ok(out.events.every((e) => e.t <= out.end.t));
  }
  const bar = run("earth", "earth-pan", { measures: engineMeasures(E.earth.cat, ["m-earth-barrier-0"], 0) });
  assert.equal(ev(bar, "earth-cone-0", "burning"), undefined);
  assert.ok(ev(bar, "earth-cone-1", "burning"));
  assert.equal(bar.end.reason, "extinguished_by_measure");
});

test("ISS interior: the fire runs round the ring of racks; ventilation off starves it; the extinguisher stops it; a barrier forces the long way round", () => {
  const base = run("iss-interior", "isscab-rack-0");
  for (let i = 0; i < 8; i++) assert.ok(ev(base, `isscab-rack-${i}`, "burning"), `rack ${i}`);
  const vent = run("iss-interior", "isscab-rack-0", { measures: engineMeasures(E["iss-interior"].cat, ["m-isscab-vent-off"], 0) });
  assert.equal(ev(vent, "isscab-rack-1", "burning"), undefined);
  assert.equal(vent.end.reason, "extinguished_by_measure");
  const fe = run("iss-interior", "isscab-rack-0", { measures: engineMeasures(E["iss-interior"].cat, ["m-isscab-extinguish"], 100, "isscab-rack-0") });
  assert.equal(ev(fe, "isscab-rack-0", "extinguished").t, 100);
  assert.equal(ev(fe, "isscab-rack-4", "burning"), undefined);
  // the long way round the ring takes seven crossings, so look far ahead
  const bar = run("iss-interior", "isscab-rack-0", { horizonS: 20000, measures: engineMeasures(E["iss-interior"].cat, ["m-isscab-barrier-0-1"], 0) });
  assert.ok(ev(bar, "isscab-rack-1", "burning").t > ev(base, "isscab-rack-1", "burning").t * 3);
});

test("Lunar module: the metal landing gear and antennas are inert (not reached, non-combustible), the cabin and thruster insulation burn", () => {
  const r = run("moon", "lm-ascent");
  assert.ok(ev(r, "lm-descent", "burning") && ev(r, "lm-rcs", "burning") && ev(r, "lm-radar", "burning"));
  const gear = ev(r, "lm-landing-gear", "not_reached");
  assert.ok(gear, "the gear is reached only through the descent stage and is inert");
  assert.match(gear.reason, /non-combustible/);
  assert.equal(ev(r, "lm-antennas", "burning"), undefined);
  assert.notEqual(r.end.reason, "self_extinguished", "an inert neighbour is not a flame that starved");
});

test("Mars: the catalog is valid, every mesh of perseverance.glb is covered, and with 0.13 % oxygen the fire cannot spread (it ends by itself)", () => {
  const { cat, map } = load("mars");
  assert.deepEqual(validateCatalog(cat), []);
  assert.equal(cat.components.length, 8);
  const b = readFileSync(new URL("../public/models/perseverance.glb", import.meta.url));
  const j = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString("utf8"));
  const san = (s) => s.replace(/\s/g, "_").replace(/[[\]\\.:/]/g, "");
  const names = j.nodes.filter((n) => n.mesh !== undefined).map((n) => san(n.name || ""));
  assert.equal(names.length, 68);
  const prefixes = [...Object.keys(map.entries), ...map.unidentified].filter((k) => k.startsWith("meshprefix:")).map((k) => k.slice(11));
  const ignored = new Set(Object.keys(map.ignored).filter((k) => k.startsWith("mesh:")).map((k) => k.slice(5)));
  assert.deepEqual(names.filter((n) => !ignored.has(n) && !prefixes.some((p) => n.startsWith(p))), []);
  assert.equal(resolveComponent(map, { mesh: "hazcams_rear_wiring" }).componentId, "mars-hazcams");
  assert.equal(resolveComponent(map, { mesh: "turret_obj002" }).componentId, "mars-turret");
  assert.equal(resolveComponent(map, { mesh: "Cylinder001" }).method, "ignored");
  assert.equal(resolveComponent(map, { mesh: "bottom002" }).method, "unidentified");
  const mars = { o2: 0.0013, pressureAtm: 0.006, gravityG: 0.38, flowCmS: 5 };
  const r = simulate({ ...toGraph(cat), atm: mars, ignite: "mars-body", horizonS: 3600 });
  assert.equal(r.events.filter((e) => e.state === "burning").length, 1);
  assert.equal(r.end.reason, "self_extinguished");
  assert.ok(r.events.some((e) => e.state === "not_reached" && /below the 10 % lower edge/.test(e.reason)));
  const custom = simulate({ ...toGraph(cat), atm: { o2: 0.21, pressureAtm: 1, gravityG: 0.38, flowCmS: 10 }, ignite: "mars-body", horizonS: 3600 });
  assert.ok(custom.events.filter((e) => e.state === "burning").length > 1, "with breathable air the links work");
});

test("run records of the new environments are complete and say that no rupture is possible", () => {
  for (const env of Object.keys(E)) {
    const src = env === "iss-interior" ? "isscab-rack-0" : env === "earth" ? "earth-pan" : env === "earth-planet" ? "earthplanet-surface" : "lm-ascent";
    const r = buildRunRecord({ runId: "run-001", timestampUtc: "2026-11-15T10:00:00.000Z", appVersion: "0.1.0", env, source: src, atm: ATM[env], atmTag: "estimated", forced: false, measuredOnly: false, applied: {}, events: run(env, src).events, catalog: E[env].cat });
    assert.equal(r.rupture, null, env);
    assert.match(r.summary[2], /no verified energetic component/, env);
    assert.equal(r.components.length, E[env].cat.components.length, env);
    assert.ok(r.phases.every((p) => p.evidence.length > 0), env);
  }
});
