// Run with: npm run test:lab   (node >= 23 strips TypeScript types natively)
// Keeps the Spanish layer of the component engine complete: catalog sentences, panel/dialog literals and the Spanish run record.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { toGraph, engineMeasures } from "../lib/componentCatalog.ts";
import { simulate } from "../lib/componentSpread.ts";
import { buildRunRecord, buildReportTxt } from "../lib/runRecord.ts";
import { esText, setCatalogEs } from "../lib/componentEs.ts";
import ES from "../lib/labI18n.es.ts";

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
const dict = JSON.parse(read("data/components/es.json"));
setCatalogEs(dict);
const files = readdirSync(new URL("../data/components/", import.meta.url)).filter((f) => f.endsWith(".catalog.json"));
const catalogs = Object.fromEntries(files.map((f) => [f.replace(".catalog.json", ""), JSON.parse(read(`data/components/${f}`))]));

const SKIP = new Set(["id", "env", "version", "model", "material", "kind", "tag", "path", "from", "to", "target"]);
function sentences(o, k = "", out = new Set()) {
  if (typeof o === "string") { if (!SKIP.has(k) && (o.includes(" ") || k === "label") && /[a-z]{3}/.test(o)) out.add(o); }
  else if (Array.isArray(o)) o.forEach((x) => sentences(x, k, out));
  else if (o && typeof o === "object") for (const [kk, v] of Object.entries(o)) sentences(v, kk, out);
  return out;
}

test("every English sentence of every catalog has a Spanish entry", () => {
  const missing = [];
  for (const [env, cat] of Object.entries(catalogs)) for (const s of sentences(cat)) if (!(s in dict) && esText(s) === s) missing.push(`${env}: ${s}`);
  assert.deepEqual(missing, []);
});

test("the catalog dictionary has no stale or empty entries", () => {
  const all = new Set(Object.values(catalogs).flatMap((c) => [...sentences(c)]));
  for (const [en, es] of Object.entries(dict)) {
    assert.ok(es.trim().length > 0, `empty: ${en}`);
    assert.ok(all.has(en), `stale entry (no catalog uses it): ${en}`);
  }
});

test("every literal passed to t() in the panel and the results window has a Spanish entry", () => {
  const unesc = (s) => s.replace(/\\"/g, '"');
  const keys = [];
  for (const f of ["components/ComponentPanel.tsx", "components/ResultsDialog.tsx"]) {
    const src = read(f);
    for (const m of src.matchAll(/(?<![\w.])[tT]\(\s*"((?:[^"\\]|\\.)*)"/g)) keys.push(unesc(m[1]));
    for (const m of src.matchAll(/runCount === 1 \? "((?:[^"\\]|\\.)*)" : "((?:[^"\\]|\\.)*)"/g)) keys.push(unesc(m[1]), unesc(m[2]));
  }
  const rd = read("components/ResultsDialog.tsx");
  for (const m of rd.matchAll(/^  (?:measured|reported|predicted|estimated|"[a-z ]+"): "((?:[^"\\]|\\.)*)",\r?$/gm)) if (m[1].length > 25 && !m[1].startsWith("bg-")) keys.push(unesc(m[1]));
  assert.ok(keys.length > 100, `only ${keys.length} keys found`);
  assert.deepEqual([...new Set(keys)].filter((k) => !(k in ES)), []);
});

test("engine texts with numbers and measure ids are translated by template", () => {
  assert.equal(esText('fire put out by measure "x1" at 12 s'), "fuego apagado por la medida «x1» a los 12 s");
  assert.match(esText("Simulation ended (burned_out): every component the fire could reach within the horizon has been reached; nothing is left to ignite"), /^Simulación terminada \(burned_out\): se han alcanzado todos/);
  assert.match(esText("the flame starves: no airflow at ~21 % O2 in 0 g: the flame starves (PSI-20 BRE, reported)"), /^la llama se ahoga: sin flujo de aire/);
  assert.equal(esText("a sentence nobody translated"), "a sentence nobody translated");
});

// a rough detector of English left in a Spanish record
const ENGLISH = /\b(the|and|of|is|are|was|were|not|with|from|this|that|by|for|run|fire|it)\b/i;
const leaks = (rec) => {
  const bag = [];
  const add = (where, s) => { if (typeof s === "string" && ENGLISH.test(s)) bag.push(`${where}: ${s}`); };
  rec.summary.forEach((s, i) => add(`summary[${i}]`, s));
  rec.metrics.forEach((m) => { add(`metric ${m.key} label`, m.label); add(`metric ${m.key} note`, m.note); add(`metric ${m.key} unit`, m.unit); });
  rec.phases.forEach((p) => { add(`phase ${p.phase}`, p.walked); add(`phase ${p.phase} evidence`, p.evidence); });
  rec.components.forEach((c) => { add(`component ${c.id} name`, c.name); add(`component ${c.id} from`, c.propagatedFrom); add(`component ${c.id} damage`, c.damage); add(`component ${c.id} note`, c.note); });
  rec.timeline.forEach((e, i) => { add(`timeline[${i}] component`, e.component); add(`timeline[${i}] reason`, e.reason); add(`timeline[${i}] source`, e.source); });
  rec.measures.forEach((m) => { add(`measure ${m.id} action`, m.action); add(`measure ${m.id} effect`, m.effect); add(`measure ${m.id} ladder`, m.ladder); });
  rec.factors.forEach((f) => { add(`factor ${f.name}`, f.name); add(`factor ${f.name} source`, f.source); });
  rec.gaps.forEach((g, i) => add(`gap[${i}]`, g));
  return bag;
};

const ATM = { o2: 0.21, pressureAtm: 1, gravityG: 0, flowCmS: 10 };
const SUIT = { o2: 1, pressureAtm: 0.293, gravityG: 0, flowCmS: 0 };
function rec(cat, env, atm, source, lang, extra = {}) {
  const sim = simulate({ ...toGraph(cat), atm, ignite: source, horizonS: 600, ...(extra.sim ?? {}) });
  return buildRunRecord({ runId: "run-001", timestampUtc: "2026-11-15T10:00:00.000Z", appVersion: "0.1.0", env, source, atm, atmTag: "estimated", forced: !!extra.forced, measuredOnly: false, applied: extra.applied ?? {}, events: sim.events, catalog: cat, lang });
}

test("the English record is untouched by the language option", () => {
  const cat = catalogs.iss;
  const a = rec(cat, "iss", ATM, cat.components[0].id, undefined);
  const b = rec(cat, "iss", ATM, cat.components[0].id, "en");
  assert.deepEqual(a, b);
  assert.match(a.summary[0], /^The fire started at/);
});

test("a Spanish run record leaves no English sentences behind (every environment, with and without measures and rupture)", () => {
  const found = [];
  for (const [env, cat] of Object.entries(catalogs)) {
    const atm = env === "emu" ? SUIT : ATM;
    const first = cat.components[0].id;
    const r = rec(cat, env, atm, first, "es");
    assert.match(r.summary[0], /^El fuego empezó/, env);
    found.push(...leaks(r).map((x) => `${env} | ${x}`));
    const ms = cat.components.flatMap((c) => c.measures).slice(0, 2);
    if (ms.length) {
      const applied = Object.fromEntries(ms.map((m, i) => [m.id, 5 + i]));
      const sim = { measures: engineMeasures(cat, Object.keys(applied), 5, first) };
      found.push(...leaks(rec(cat, env, atm, first, "es", { applied, sim })).map((x) => `${env} measures | ${x}`));
    }
  }
  const tank = catalogs.emu.components.find((c) => c.energetic);
  found.push(...leaks(rec(catalogs.emu, "emu", SUIT, catalogs.emu.components[0].id, "es", { sim: { forceRupture: tank.id }, forced: true })).map((x) => `emu forced | ${x}`));
  assert.deepEqual(found, []);
});

test("the Spanish .txt report is headed in Spanish and the English one is unchanged", () => {
  const cat = catalogs.iss;
  const en = buildReportTxt(rec(cat, "iss", ATM, cat.components[0].id, "en"));
  const es = buildReportTxt(rec(cat, "iss", ATM, cat.components[0].id, "es"), "es");
  assert.match(en, /^JaPax simulation report/);
  assert.match(es, /^Informe de simulación de JaPax/);
  for (const h of ["Resumen", "Condiciones y suposiciones", "Cronología", "Componentes", "Medidas", "Rotura", "Escalera de seguridad", "Métricas", "Huecos de datos de este entorno"]) assert.ok(es.includes(h), h);
});

test("the short labels the panel shows (parenthesis dropped) are translated too", () => {
  const short = (s) => s.replace(/\s*\(.*\)\s*$/, "");
  const missing = [];
  for (const [env, cat] of Object.entries(catalogs)) for (const c of cat.components) if (esText(short(c.label)) === short(c.label) && short(esText(c.label)) !== short(c.label)) missing.push(`${env}: ${short(c.label)}`);
  assert.deepEqual(missing, []);
  assert.equal(esText("PLSS oxygen tank"), "Depósito de oxígeno del PLSS");
});

test("a Spanish record never shows a raw end-reason code to the reader", () => {
  const codes = /\b(burned_out|self_extinguished|extinguished_by_measure|ruptured_and_settled|horizon_reached|extinguished_by_suppression_system|interrupted_by_user|in_progress)\b/;
  for (const [env, cat] of Object.entries(catalogs)) {
    const r = rec(cat, env, env === "emu" ? SUIT : ATM, cat.components[0].id, "es");
    const shown = [...r.summary, ...r.metrics.filter((m) => m.key !== "end_reason").map((m) => m.note)];
    for (const s of shown) assert.ok(!codes.test(s), `${env}: ${s}`);
  }
});
