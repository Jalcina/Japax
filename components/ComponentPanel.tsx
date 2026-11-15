"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { SceneApi } from "@/components/ImmersiveScene";
import catalogJson from "@/data/components/emu.catalog.json";
import mapJson from "@/data/components/emu.map.json";
import { engineMeasures, resolveComponent, toGraph, type CComponent, type CFact, type Catalog, type ComponentMap, type Resolution } from "@/lib/componentCatalog";
import { simulate, type CEvent } from "@/lib/componentSpread";
import { LabBlast } from "@/lib/labBlast";
import { spreadFactors, type Atm } from "@/lib/labPhysics";

const CATALOG = catalogJson as unknown as Catalog;
const MAP = mapJson as unknown as ComponentMap;
const GRAPH = toGraph(CATALOG);
const BY_ID = new Map(CATALOG.components.map((c) => [c.id, c]));
const TANK = CATALOG.components.find((c) => c.energetic) as CComponent;
/** the suit model is fitted to 3.1 scene units for about 2 m, so one metre is about 1.55 units */
const UNITS_PER_M = 1.55;
const HORIZON_S = 600;

const TAGC: Record<string, string> = {
  measured: "bg-emerald-500/15 text-emerald-300",
  reported: "bg-sky-500/15 text-sky-300",
  predicted: "bg-violet-500/15 text-violet-300",
  estimated: "bg-amber-500/15 text-amber-300",
};
type Shown = "intact" | "not_reached" | "burning" | "damaged" | "relieved" | "ruptured";
const RANK: Record<Shown, number> = { intact: 0, not_reached: 1, burning: 2, damaged: 3, relieved: 4, ruptured: 5 };
const LABEL: Record<Shown, string> = { intact: "Intact", not_reached: "Not reached", burning: "Burning", damaged: "Damaged", relieved: "Pressure relieved", ruptured: "Ruptured" };
const MEASURED = new Set(["measured", "reported"]);

export interface PanelPick { name: string; material: string; n: number }

function Chip({ tag }: { tag: string }) {
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${TAGC[tag] ?? TAGC.estimated}`}>{tag}</span>;
}
function FactLine({ f, hide }: { f: CFact; hide: boolean }) {
  if (hide && !MEASURED.has(f.tag)) return <p className="text-xs text-muted">Hidden: this statement is not measured data (switch off “measured only” to see it).</p>;
  return (
    <p className="text-xs text-ink-2">
      <Chip tag={f.tag} /> {f.text} <span className="text-muted">Source: {f.src}</span>
    </p>
  );
}

function suitCentre(api: SceneApi): THREE.Vector3 {
  const box = new THREE.Box3();
  api.scene.traverse((o) => {
    const m = o as THREE.Mesh;
    const mat = Array.isArray(m.material) ? m.material[0] : m.material;
    if (m.isMesh && mat?.name?.startsWith("EMU:")) box.expandByObject(m);
  });
  const c = box.getCenter(new THREE.Vector3());
  c.y = box.min.y + 0.68 * (box.max.y - box.min.y);
  return c;
}

/** Where the PLSS sits: the centre of the (hidden) jetpack meshes of the model; falls back to the middle of the suit. */
function tankAnchor(api: SceneApi): THREE.Vector3 {
  const box = new THREE.Box3();
  api.scene.traverse((o) => {
    const m = o as THREE.Mesh;
    const mat = Array.isArray(m.material) ? m.material[0] : m.material;
    if (m.isMesh && /jetpack/i.test(mat?.name ?? "")) box.expandByObject(m);
  });
  const suit = new THREE.Box3();
  api.scene.traverse((o) => {
    const m = o as THREE.Mesh;
    const mat = Array.isArray(m.material) ? m.material[0] : m.material;
    if (m.isMesh && m.visible && mat?.name?.startsWith("EMU:") && !/jetpack/i.test(mat.name)) suit.expandByObject(m);
  });
  const c = suitCentre(api);
  // the back is the side the hidden jetpack meshes lean to (default: -z); the marker sits on the visible back surface, on the centre line
  const dir = box.isEmpty() || Math.abs(box.getCenter(new THREE.Vector3()).z - c.z) < 1e-3 ? -1 : Math.sign(box.getCenter(new THREE.Vector3()).z - c.z);
  return new THREE.Vector3(c.x, box.isEmpty() ? c.y : box.getCenter(new THREE.Vector3()).y, (dir < 0 ? suit.min.z : suit.max.z) + dir * 0.05);
}

export default function ComponentPanel({ api, atm: atmIn, pick }: { api: SceneApi | null; atm: Atm; pick: PanelPick | null }) {
  // the parent rebuilds this object on every render; key it on its values so the simulation is not rerun for nothing
  const atm = useMemo<Atm>(() => ({ o2: atmIn.o2, pressureAtm: atmIn.pressureAtm, gravityG: atmIn.gravityG, flowCmS: atmIn.flowCmS }), [atmIn.o2, atmIn.pressureAtm, atmIn.gravityG, atmIn.flowCmS]);
  const [res, setRes] = useState<Resolution | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [forced, setForced] = useState(false);
  const [measuredOnly, setMeasuredOnly] = useState(false);
  const [applied, setApplied] = useState<Record<string, number>>({});
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(4);
  const blast = useRef<LabBlast | null>(null);
  const fired = useRef(false);
  const tint = useRef(new Map<THREE.Material, { c: THREE.Color; i: number }>());

  const start = useCallback((id: string | null, r: Resolution | null) => {
    setRes(r);
    setSource(id);
    setApplied({});
    setT(0);
    setPlaying(!!id);
  }, []);

  // a new tap on the suit: identify what it is and restart the component simulation from it
  useEffect(() => {
    if (!pick) return;
    const r = resolveComponent(MAP, { mesh: pick.name, material: pick.material });
    start(r.componentId, r);
  }, [pick, start]);

  const ms = useMemo(() => Object.entries(applied).flatMap(([id, atS]) => engineMeasures(CATALOG, [id], atS)), [applied]);
  const sim = useMemo(
    () => (source ? simulate({ ...GRAPH, atm, ignite: source, horizonS: HORIZON_S, measures: ms, forceRupture: forced ? TANK.id : undefined }) : null),
    [source, atm, ms, forced],
  );
  const maxT = useMemo(() => Math.min(HORIZON_S, Math.max(30, (sim?.events.at(-1)?.t ?? 0) + 15)), [sim]);

  useEffect(() => {
    if (!playing || !sim) return;
    const id = setInterval(() => setT((v) => {
      const nv = v + 0.1 * speed;
      if (nv >= maxT) { setPlaying(false); return maxT; }
      return nv;
    }), 100);
    return () => clearInterval(id);
  }, [playing, speed, sim, maxT]);

  const visible = useMemo(() => (sim?.events ?? []).filter((e) => e.t <= t && (!measuredOnly || MEASURED.has(e.tag))), [sim, t, measuredOnly]);
  const states = useMemo(() => {
    const out: Record<string, Shown> = {};
    for (const c of CATALOG.components) out[c.id] = "intact";
    for (const e of sim?.events ?? []) {
      if (e.t > t) continue;
      if (RANK[e.state as Shown] > RANK[out[e.componentId]]) out[e.componentId] = e.state as Shown;
    }
    return out;
  }, [sim, t]);
  // `states` is a new object on every clock tick; the scene tint only has to run when a state really changes
  const stateKey = CATALOG.components.map((c) => states[c.id]).join("|");
  const statesRef = useRef(states);
  statesRef.current = states;

  // the visual layers: tint the real meshes of the components that burn, and draw the rupture
  useEffect(() => {
    if (!api) return;
    const b = new LabBlast(api, TANK.energetic!.blastRadiusM * UNITS_PER_M);
    blast.current = b;
    return () => { b.dispose(); blast.current = null; };
  }, [api]);

  // clickable 3D marker on the back of the suit: a real <button> (keyboard + screen reader) projected from a 3D anchor each frame
  useEffect(() => {
    if (!api) return;
    const host = document.querySelector<HTMLCanvasElement>("#fire-lab canvas")?.parentElement;
    if (!host) return;
    if (getComputedStyle(host).position === "static") host.style.position = "relative";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "PLSS O2 tank";
    btn.setAttribute("aria-label", "PLSS (portable life-support backpack) oxygen tank, a virtual component on the back of the suit: start the fire here");
    btn.setAttribute("data-testid", "tank-marker");
    btn.style.cssText = "position:absolute;left:0;top:0;z-index:5;padding:6px 12px;min-height:32px;border-radius:9999px;border:1px solid #fbbf24;background:rgba(10,12,18,.82);color:#fde68a;font:600 11px system-ui;cursor:pointer;white-space:nowrap;display:none;will-change:transform";
    btn.onclick = () => start(TANK.id, { componentId: TANK.id, method: "material", key: "virtual component" });
    host.appendChild(btn);
    let anchor = tankAnchor(api);
    const ok = (a: THREE.Vector3) => Number.isFinite(a.x + a.y + a.z);
    const v = new THREE.Vector3();
    let frame = 0, occluded = false, dead = false;
    api.addUpdater((_dt, _t, camera) => {
      if (dead) return;
      // the model may finish loading after the scene is announced: an empty bounding box gives a non-finite anchor, so try again
      if (!ok(anchor)) { anchor = tankAnchor(api); if (!ok(anchor)) { btn.style.display = "none"; return; } }
      v.copy(anchor).project(camera);
      const r = host.getBoundingClientRect();
      const inView = v.z < 1 && Math.abs(v.x) < 1 && Math.abs(v.y) < 1;
      if (!inView) { btn.style.display = "none"; return; }
      const sx = (v.x * 0.5 + 0.5) * r.width, sy = (-v.y * 0.5 + 0.5) * r.height;
      // hide when the body is between the camera and the tank (checked ~6 times a second)
      if (frame++ % 10 === 0) {
        const hit = api.raycast(r.left + sx, r.top + sy);
        occluded = !!hit && hit.point.distanceTo(camera.position) < anchor.distanceTo(camera.position) - 0.35;
      }
      btn.style.display = occluded ? "none" : "block";
      btn.style.transform = `translate(${Math.round(sx)}px,${Math.round(sy)}px) translate(-50%,-50%)`;
    });
    return () => { dead = true; btn.remove(); };
  }, [api, start]);

  useEffect(() => {
    if (!api) return;
    const touched = tint.current;
    const restore = () => {
      touched.forEach((o, m) => { const mm = m as THREE.MeshStandardMaterial; mm.emissive.copy(o.c); mm.emissiveIntensity = o.i; });
      touched.clear();
    };
    restore();
    api.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      for (const mat of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        const id = resolveComponent(MAP, { material: mat.name }).componentId;
        const st = id ? statesRef.current[id] : undefined;
        const mm = mat as THREE.MeshStandardMaterial;
        if (!st || st === "intact" || st === "not_reached" || !mm.emissive) continue;
        if (!touched.has(mat)) touched.set(mat, { c: mm.emissive.clone(), i: mm.emissiveIntensity });
        mm.emissive.set(st === "burning" ? 0xff5a10 : st === "damaged" || st === "ruptured" ? 0x661100 : 0x2255aa);
        mm.emissiveIntensity = st === "burning" ? 0.9 : 0.6;
      }
    });
    return restore;
  }, [api, stateKey]);

  useEffect(() => {
    const rupt = sim?.events.find((e) => e.state === "ruptured");
    if (rupt && t >= rupt.t && !fired.current) {
      fired.current = true;
      if (api) blast.current?.trigger(suitCentre(api));
    } else if ((!rupt || t < rupt.t) && fired.current) {
      fired.current = false;
      blast.current?.clear();
    }
  }, [t, sim, api]);

  const comp = source ? BY_ID.get(source) : undefined;
  const rupture = sim?.events.find((e) => e.state === "ruptured");
  const relieved = sim?.events.find((e) => e.state === "relieved");
  const reached = Object.values(states).filter((s) => s === "burning" || s === "damaged" || s === "ruptured" || s === "relieved").length;
  const allMeasures = useMemo(() => {
    const seen = new Set<string>();
    return CATALOG.components.flatMap((c) => c.measures).filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)));
  }, []);
  const last: CEvent | undefined = visible.at(-1);
  const label = (id: string) => BY_ID.get(id)?.label ?? id;
  const speedNow = spreadFactors(atm, "fabric").mmS;

  const apply = (id: string) => setApplied((a) => (id in a ? a : { ...a, [id]: Math.round(t * 10) / 10 }));

  const download = () => {
    const lines = [
      "JaPax component sheet (simulation, not a measurement)",
      `Ignition component: ${comp ? comp.label : "unidentified"}`,
      `Conditions: O2 ${Math.round(atm.o2 * 100)} %, ${(atm.pressureAtm * 14.696).toFixed(1)} psi, ${atm.gravityG} g, airflow ${atm.flowCmS} cm/s`,
      `Forced failure: ${forced ? "yes (demo scenario, not a prediction)" : "no (physical path)"}`,
      `Measures applied: ${Object.entries(applied).map(([id, at]) => `${id} at ${at} s`).join("; ") || "none"}`,
      "",
      "Timeline (simulated seconds):",
      ...(sim?.events ?? []).map((e) => `  t=${e.t.toFixed(1)} s  ${label(e.componentId)}: ${e.state} [${e.tag}] ${e.reason}`),
      "",
      "Data gaps:",
      ...CATALOG.gaps.map((g) => `  - ${g}`),
    ];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "japax-component-sheet.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card p-4" id="component-panel">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-semibold">Component engine</h3>
        <span className="rounded bg-fuchsia-500/15 px-1.5 py-0.5 text-[10px] font-medium text-fuchsia-300">simulation</span>
      </div>
      <p className="mt-1 text-xs text-muted">Tap a part of the suit to identify it and see how a fire could move between components. The timeline, the colours on the model and the numbers come from the same engine.</p>
      <label className="mt-2 flex items-center gap-2 text-xs text-ink-2">
        <input type="checkbox" checked={measuredOnly} onChange={(e) => setMeasuredOnly(e.target.checked)} />
        Measured only (hide our simulation)
      </label>

      {pick && <p className="mt-2 text-[11px] text-muted" data-testid="model-part">Model part tapped: {pick.material || "(no material name)"} · mesh {pick.name || "(unnamed)"}</p>}

      {!source && (
        <div className="mt-3 text-sm">
          {res ? (
            <p className="rounded-lg border border-line p-2.5 text-xs text-ink-2">
              {res.method === "ignored" ? "This layer is hidden in the 3D scene, so it has no component." : "Unidentified surface: the 3D model does not say what this part is. The fire still starts there, but the component engine has no data for it."} Pick a labelled part, or start at the oxygen tank below.
            </p>
          ) : (
            <p className="text-xs text-ink-2">No part selected yet.</p>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={() => start(TANK.id, { componentId: TANK.id, method: "material", key: "virtual component" })}
          className="rounded-lg border border-line-2 px-3 py-1.5 text-sm text-ink-2 hover:text-ink">
          Start at the PLSS oxygen tank
        </button>
        <label className="flex items-center gap-2 text-sm text-ink-2">
          <input type="checkbox" checked={forced} onChange={(e) => { setForced(e.target.checked); setT(0); setPlaying(!!source); }} />
          Forced failure (demo scenario, not a prediction)
        </label>
      </div>
      <p className="mt-1 text-[11px] text-muted">PLSS = the portable life-support backpack. The suit model has no separately selectable oxygen tank, so it is a virtual component (tap the “PLSS O2 tank” marker on the back of the suit). Its effects are drawn at the torso.</p>

      {comp && (
        <div className="mt-3 rounded-lg border border-line p-3">
          <p className="text-sm font-semibold">{comp.label}</p>
          <p className="text-xs text-ink-2">{comp.function}</p>
          <p className="mt-1 text-xs text-muted">
            Material class: {comp.material}. Identified by: {res?.method === "material" && !comp.virtual ? "material name in the model (manual label, medium confidence)" : comp.virtual ? "virtual component (not in the 3D model)" : res?.method}.
          </p>
          <FactLine f={comp.flammability} hide={measuredOnly} />
          {comp.energetic && (
            <div className="mt-2 space-y-1 border-t border-line pt-2">
              <p className="text-xs font-semibold text-amber-300">Energetic component: {comp.energetic.kind.replace("_", " ")}, contents {comp.energetic.contents}</p>
              <FactLine f={comp.energetic.pressureNote} hide={measuredOnly} />
              <FactLine f={comp.energetic.failureMode} hide={measuredOnly} />
            </div>
          )}
        </div>
      )}

      {sim && (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <button onClick={() => setPlaying((p) => !p)} className="rounded-lg border border-line-2 px-3 py-1.5">{playing ? "Pause" : t >= maxT ? "Finished" : "Play"}</button>
            <button onClick={() => { setT(0); setPlaying(true); }} className="rounded-lg border border-line-2 px-3 py-1.5 text-ink-2 hover:text-ink">Restart</button>
            <label className="text-ink-2">Speed
              <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="ml-1 rounded-lg border border-line-2 bg-surface px-1.5 py-1 text-ink">
                <option value={1}>×1</option><option value={4}>×4</option><option value={16}>×16</option>
              </select>
            </label>
          </div>
          <div className="mt-2">
            <label htmlFor="cp-time" className="flex justify-between text-xs text-ink-2"><span>Simulated time</span><span className="tabular-nums">{t.toFixed(0)} s</span></label>
            <input id="cp-time" type="range" min={0} max={maxT} step={0.5} value={t} onChange={(e) => { setPlaying(false); setT(Number(e.target.value)); }} className="w-full" />
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border border-line p-2"><p className="text-muted">Components reached</p><p className="text-lg font-semibold tabular-nums">{reached} / {CATALOG.components.length}</p><Chip tag="estimated" /></div>
            <div className="rounded-lg border border-line p-2"><p className="text-muted">Garment spread speed</p><p className="text-lg font-semibold tabular-nums">{speedNow.toFixed(1)} mm/s</p><Chip tag="estimated" /></div>
            <div className="col-span-2 rounded-lg border border-line p-2">
              <p className="text-muted">Oxygen tank outcome</p>
              <p className="font-semibold">{rupture ? `Ruptures at about ${rupture.t.toFixed(0)} s${rupture.forced ? " (forced scenario)" : ` (mid-point of an assumed ${TANK.energetic!.heatToRuptureS[0]}-${TANK.energetic!.heatToRuptureS[1]} s heating window, no dataset)`}` : relieved ? `Rupture avoided: pressure relieved at ${relieved.t.toFixed(0)} s` : "No rupture in this run"}</p>
              <Chip tag="estimated" />
            </div>
          </div>

          <h4 className="mt-3 text-sm font-semibold">Components</h4>
          <ul className="mt-1 grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
            {CATALOG.components.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 rounded border border-line px-2 py-1">
                <span>{c.label}</span>
                <span className={states[c.id] === "burning" ? "text-orange-300" : states[c.id] === "intact" ? "text-muted" : "text-amber-300"}>{LABEL[states[c.id]]}</span>
              </li>
            ))}
          </ul>

          <h4 className="mt-3 text-sm font-semibold">Timeline</h4>
          <p className="sr-only" aria-live="polite">{last ? `${label(last.componentId)}: ${LABEL[last.state as Shown]} at ${last.t.toFixed(0)} seconds` : ""}</p>
          <ol className="mt-1 space-y-1 text-xs">
            {visible.length === 0 && <li className="text-muted">{measuredOnly ? "Nothing measured to show: every event of this simulation is estimated." : "Press Play."}</li>}
            {visible.map((e, i) => (
              <li key={i} className="rounded border border-line px-2 py-1">
                <span className="tabular-nums text-ink">t = {e.t.toFixed(0)} s</span> · {label(e.componentId)} · <strong>{LABEL[e.state as Shown]}</strong> <Chip tag={e.tag} />
                {e.forced && <span className="ml-1 text-fuchsia-300">forced scenario</span>}
                <span className="block text-muted">{e.reason}</span>
              </li>
            ))}
          </ol>
        </>
      )}

      <h4 className="mt-3 text-sm font-semibold">Measures</h4>
      <p className="text-[11px] text-muted">Applied at the current simulated time. Every measure here is an engineering proposal (hypothesis); none has test data for this suit.</p>
      <ul className="mt-1 space-y-2">
        {allMeasures.map((m) => (
          <li key={m.id} className="rounded-lg border border-line p-2 text-xs">
            <p className="font-medium text-ink">{m.action}</p>
            {measuredOnly ? <p className="text-muted">Hidden: not measured data.</p> : <FactLine f={m.effect} hide={false} />}
            <button onClick={() => apply(m.id)} disabled={!source || m.id in applied}
              className="mt-1 rounded-lg bg-accent px-3 py-1 text-xs font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40">
              {m.id in applied ? `Applied at ${applied[m.id]} s` : "Apply measure"}
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button onClick={download} disabled={!sim} className="rounded-lg border border-line-2 px-3 py-1.5 text-xs text-ink-2 hover:text-ink disabled:opacity-40">Download component sheet (.txt)</button>
      </div>
      <details className="mt-3 text-xs">
        <summary className="cursor-pointer text-ink-2 hover:text-ink">Data gaps</summary>
        <ul className="mt-1 list-disc space-y-1 pl-4 text-muted">{CATALOG.gaps.map((g, i) => <li key={i}>{g}</li>)}</ul>
      </details>
    </div>
  );
}
