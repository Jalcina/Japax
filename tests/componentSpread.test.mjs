// Run with: npm run test:lab   (node >= 23 strips TypeScript types natively)
import test from "node:test";
import assert from "node:assert/strict";
import { simulate } from "../lib/componentSpread.ts";
import { spreadSpeed } from "../lib/labPhysics.ts";

const SUIT = { o2: 1, pressureAtm: 0.29, gravityG: 0, flowCmS: 10 };
const STARVED = { o2: 0.21, pressureAtm: 1, gravityG: 0, flowCmS: 0 };
const nodes = [
  { id: "glove", material: "fabric" },
  { id: "arm", material: "fabric" },
  { id: "hose", material: "cable" },
  { id: "tank", material: "liquid", energetic: { kind: "pressure_vessel", heatToRuptureS: [20, 60], blastRadiusM: 0.5, o2Enrich: 1 } },
];
const edges = [
  { from: "glove", to: "arm", path: "contact", distanceM: 0.2 },
  { from: "arm", to: "hose", path: "contact", distanceM: 0.1 },
  { from: "hose", to: "tank", path: "contact", distanceM: 0.1 },
  { from: "glove", to: "tank", path: "proximity", distanceM: 0.4 },
];
const run = (o) => simulate({ nodes, edges, atm: SUIT, ignite: "glove", horizonS: 4000, ...o });
const ev = (r, id, state) => r.events.find((e) => e.componentId === id && e.state === state);

test("the ignited component burns at t=0", () => {
  const r = run();
  assert.equal(ev(r, "glove", "burning").t, 0);
});

test("a neighbour on a contact edge ignites after distance / modelled speed", () => {
  const r = run();
  const mm = spreadSpeed(SUIT, "fabric").mmS;
  assert.ok(Math.abs(ev(r, "arm", "burning").t - 200 / mm) < 1e-6);
});

test("more oxygen never delays the arrival of the fire", () => {
  const lo = run({ atm: { ...SUIT, o2: 0.3 } });
  const hi = run({ atm: { ...SUIT, o2: 0.9 } });
  assert.ok(ev(hi, "arm", "burning").t <= ev(lo, "arm", "burning").t);
});

test("no airflow near 21 % O2 in 0 g: the fire does NOT reach the neighbour, and the result says why", () => {
  const r = run({ atm: STARVED });
  assert.equal(ev(r, "arm", "burning"), undefined);
  const nr = ev(r, "arm", "not_reached");
  assert.ok(nr);
  assert.equal(nr.tag, "reported");
  assert.match(nr.reason, /starve/i);
});

test("a proximity edge never carries the fire by itself", () => {
  const r = run({ nodes: nodes.filter((n) => n.id !== "hose"), edges: edges.filter((e) => e.path !== "contact" || e.from === "glove") });
  assert.equal(ev(r, "tank", "burning"), undefined);
});

test("an energetic component ruptures only after it has been heated for its window, never just by existing", () => {
  const r = run();
  const burn = ev(r, "tank", "burning").t;
  const rup = ev(r, "tank", "ruptured");
  assert.ok(rup);
  assert.ok(rup.t >= burn + 20 && rup.t <= burn + 60);
  const quiet = simulate({ nodes, edges: [], atm: SUIT, ignite: "glove", horizonS: 4000 });
  assert.equal(ev(quiet, "tank", "ruptured"), undefined);
});

test("rupture has consequences: neighbours inside the blast radius are hit, with their own tag", () => {
  const r = run();
  const rup = ev(r, "tank", "ruptured");
  const hit = r.events.filter((e) => e.cause === "rupture:tank");
  assert.ok(hit.length >= 1);
  assert.ok(hit.every((e) => e.t >= rup.t && typeof e.tag === "string"));
});

test("forced failure ruptures straight away and is labelled as a forced scenario", () => {
  const r = run({ forceRupture: "tank" });
  const rup = ev(r, "tank", "ruptured");
  assert.equal(rup.t, 0);
  assert.equal(rup.forced, true);
  assert.equal(rup.tag, "estimated");
});

test("cutting the cable edge stops the fire before the tank", () => {
  const r = run({ measures: [{ id: "cut-hose", kind: "cut_edge", from: "arm", to: "hose", atS: 0 }] });
  assert.equal(ev(r, "hose", "burning"), undefined);
  assert.equal(ev(r, "tank", "ruptured"), undefined);
});

test("relieving the pressure inside the window prevents the rupture; too late it does not", () => {
  const early = run({ measures: [{ id: "vent", kind: "relieve", target: "tank", atS: 0 }] });
  assert.equal(ev(early, "tank", "ruptured"), undefined);
  assert.ok(ev(early, "tank", "relieved"));
  const late = run({ measures: [{ id: "vent", kind: "relieve", target: "tank", atS: 3000 }] });
  assert.ok(ev(late, "tank", "ruptured"));
});

test("every event carries a tag and a reason, and the run is deterministic", () => {
  const a = run(), b = run();
  assert.deepEqual(a, b);
  assert.ok(a.events.length > 0 && a.events.every((e) => e.tag && e.reason));
});
