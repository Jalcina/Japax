// Run with: npm run test:lab   (node >= 23 strips TypeScript types natively)
import test from "node:test";
import assert from "node:assert/strict";
import { summarizeSpread, fmtBand } from "../lib/spreadSummary.ts";

const pt = (o) => ({ id: "x", program: "SAFFIRE-I", psiId: "PSI-98", doi: "d", material: "Cotton-fiberglass (SIBAL)", thickness: "0.37 mm", flowCmS: 20, o2Pct: [21, 22], direction: "Concurrent", gravity: "micro", rateMmS: 1, burnLengthCm: "1", burnSec: null, source: "s", ...o });

test("bands separate flow direction and only count thin fabric in microgravity", () => {
  const s = summarizeSpread([
    pt({ rateMmS: 1.8 }), pt({ rateMmS: 2.6, program: "SAFFIRE-II" }), pt({ rateMmS: 2.3, program: "SAFFIRE-III" }),
    pt({ direction: "Opposed", rateMmS: 0.98 }), pt({ direction: "Opposed", rateMmS: 1.3 }),
    pt({ material: "Silicone, 5 cm wide", gravity: "1g", rateMmS: 1.2 }), // ground test: not part of the microgravity bands
  ]);
  assert.deepEqual(s.withFlow, { min: 1.8, max: 2.6, n: 3 });
  assert.deepEqual(s.against, { min: 0.98, max: 1.3, n: 2 });
  assert.equal(s.groundN, 1);
  assert.deepEqual(s.programs, ["SAFFIRE-I", "SAFFIRE-II", "SAFFIRE-III"]);
});

test("a flame that ignited but did not spread is reported apart, never as a rate", () => {
  const s = summarizeSpread([pt({ rateMmS: 2 }), pt({ material: "Silicone, 5 cm wide", rateMmS: null })]);
  assert.equal(s.noSpreadN, 1);
  assert.deepEqual(s.withFlow, { min: 2, max: 2, n: 1 });
});

test("flow and oxygen ranges come only from the fabric points; no points gives no invented numbers", () => {
  const s = summarizeSpread([pt({ flowCmS: 20, o2Pct: [21.5, 21.7] }), pt({ flowCmS: 30, o2Pct: [21, 21.2] })]);
  assert.deepEqual(s.flowCmS, [20, 30]);
  assert.deepEqual(s.o2Pct, [21, 21.7]);
  const empty = summarizeSpread([]);
  assert.equal(empty.withFlow, null);
  assert.equal(empty.against, null);
  assert.equal(empty.flowCmS, null);
});

test("fmtBand collapses a single value and shows ranges otherwise", () => {
  assert.equal(fmtBand({ min: 2.1, max: 2.1, n: 1 }), "2.1 mm/s");
  assert.equal(fmtBand({ min: 1.8, max: 2.6, n: 3 }), "1.8-2.6 mm/s");
});
