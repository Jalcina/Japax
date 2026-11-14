// Keeps the Spanish dictionary complete: every key the Fire Lab asks for must exist, with the same {placeholders}.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ES from "../lib/labI18n.es.ts";

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
const ph = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
const unesc = (s) => s.replace(/\\"/g, '"').replace(/\\'/g, "'");

test("every entry keeps its placeholders", () => {
  for (const [k, v] of Object.entries(ES)) assert.equal(ph(v), ph(k), `placeholders differ for: ${k}`);
});

test("no Spanish entry is empty", () => {
  for (const [k, v] of Object.entries(ES)) assert.ok(v.trim().length > 0, `empty: ${k}`);
});

test("every literal passed to t() in FireLab3D has a Spanish entry", () => {
  const src = read("components/FireLab3D.tsx");
  const keys = [...src.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"/g)].map((m) => unesc(m[1]));
  assert.ok(keys.length > 60, `only ${keys.length} keys found`);
  assert.deepEqual(keys.filter((k) => !(k in ES)), []);
});

test("the fixed per-environment data (value, source, ELI5, banner) is translated", () => {
  const src = read("components/FireLab3D.tsx");
  const strs = [...src.matchAll(/\b(?:value|src|eli5|banner): "((?:[^"\\]|\\.)*)"/g)].map((m) => unesc(m[1]));
  assert.ok(strs.length > 40, `only ${strs.length} strings found`);
  const numeric = (k) => /^[\d.\s%()a-z]+$/i.test(k) && !/[a-z]{4}/i.test(k);
  assert.deepEqual(strs.filter((k) => !(k in ES) && !numeric(k)), []);
});

test("the facts, banners, sources and labels of fireCases and labPhysics are translated", () => {
  const strs = [];
  for (const f of ["lib/fireCases.ts", "lib/labPhysics.ts"]) {
    const src = read(f);
    for (const m of src.matchAll(/\b(?:text|eli5|src|basis|label|why|headline|note)\s*:\s*(?:raw === 0 \? )?'((?:[^'\\]|\\.)*)'/g)) strs.push(unesc(m[1]));
    for (const m of src.matchAll(/banners\.push\('((?:[^'\\]|\\.)*)'\)/g)) strs.push(unesc(m[1]));
    for (const m of src.matchAll(/^\s+(?:sibal|bass|bass2|bre|flex|helium|guide|same|saffire6|vent): '((?:[^'\\]|\\.)*)'/gm)) strs.push(unesc(m[1]));
  }
  assert.ok(strs.length > 50, `only ${strs.length} strings found`);
  assert.deepEqual(strs.filter((k) => !(k in ES)), []);
});
