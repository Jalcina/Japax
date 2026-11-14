// Run with: npm run test:lab   (node >= 23 strips TypeScript types natively)
import test from "node:test";
import assert from "node:assert/strict";
import { spreadSpeed, spreadFactors, inferMaterial, ANCHOR_MM_S } from "../lib/labPhysics.ts";

const ISS = { o2: 0.21, pressureAtm: 1, gravityG: 0, flowCmS: 10 };

test("ISS fabric stays within the measured SAFFIRE range (1-2.6 mm/s)", () => {
  const { mmS } = spreadSpeed(ISS, "fabric");
  assert.ok(mmS > 0.5 && mmS < 2.6, `got ${mmS}`);
});

test("20 cm/s at 22 % O2 in 0 g reproduces the anchor", () => {
  const { mmS } = spreadSpeed({ o2: 0.22, pressureAtm: 1, gravityG: 0, flowCmS: 20 }, "fabric");
  assert.equal(mmS, ANCHOR_MM_S);
});

test("no airflow near 21 % O2 in 0 g starves the flame (PSI-20 BRE)", () => {
  assert.equal(spreadSpeed({ ...ISS, flowCmS: 0 }, "fabric").mmS, 0);
});

test("more oxygen never slows the fire", () => {
  let prev = -1;
  for (const o2 of [0.16, 0.21, 0.3, 0.5, 1]) {
    const v = spreadSpeed({ ...ISS, o2, flowCmS: 20 }, "fabric").mmS;
    assert.ok(v >= prev, `${o2} -> ${v} < ${prev}`);
    prev = v;
  }
});

test("1 g is faster than 0 g at the same atmosphere", () => {
  assert.ok(spreadSpeed({ ...ISS, gravityG: 1 }, "fabric").mmS > spreadSpeed(ISS, "fabric").mmS);
});

test("1 g with no forced flow does not starve (buoyant convection)", () => {
  assert.ok(spreadSpeed({ ...ISS, gravityG: 1, flowCmS: 0 }, "fabric").mmS > 0);
});

test("cable and plastic are slower than fabric; every factor carries a tag and a source", () => {
  const f = spreadSpeed(ISS, "fabric").mmS;
  assert.ok(spreadSpeed(ISS, "cable").mmS < f && spreadSpeed(ISS, "plastic").mmS < f);
  for (const x of spreadFactors(ISS, "fabric").factors) assert.ok(x.tag && x.src && x.why);
});

test("only the anchor is tagged measured; everything else is estimated or reported", () => {
  const tags = spreadFactors(ISS, "fabric").factors.filter((x) => x.tag === "measured").map((x) => x.key);
  assert.deepEqual(tags, ["anchor"]);
});

test("inferMaterial reads mesh names and stays quiet when they say nothing", () => {
  assert.equal(inferMaterial("Extravehicular_Mobility_Unit_3"), "fabric");
  assert.equal(inferMaterial("Power_Cable_02"), "cable");
  assert.equal(inferMaterial("Rack_Panel_A"), "plastic");
  assert.equal(inferMaterial("Object_12"), null);
  assert.equal(inferMaterial(""), null);
});
