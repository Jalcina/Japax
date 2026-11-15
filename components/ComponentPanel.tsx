"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { SceneApi } from "@/components/ImmersiveScene";
import { engineMeasures, resolveComponent, toGraph, type CComponent, type CFact, type Resolution } from "@/lib/componentCatalog";
import ResultsDialog, { downloadText } from "@/components/ResultsDialog";
import { buildCsv, csvFileName } from "@/lib/componentCsv";
import { COMPONENT_ENVS, type EnvBundle } from "@/lib/componentEnvs";
import { energeticOf, ruptureReport, shortLabel } from "@/lib/componentReport";
import { simulate, type CEvent } from "@/lib/componentSpread";
import { buildRunRecord, type BuildInput, type RunRecord } from "@/lib/runRecord";
import { LabBlast } from "@/lib/labBlast";
import { spreadFactors, type Atm } from "@/lib/labPhysics";
import pkg from "@/package.json";
import { useTr } from "@/lib/i18n";
import { ENERGETIC_KIND_ES, END_REASON_ES, MATERIAL_ES, STATE_EN, STATE_ES, TAG_ES } from "@/lib/componentEs";

/** the suit model is fitted to 3.1 scene units for about 2 m, so one metre is about 1.55 units */
const UNITS_PER_M = 1.55;
const DEFAULT_HORIZON_S = 600;

const TAGC: Record<string, string> = {
  measured: "bg-emerald-500/15 text-emerald-300",
  reported: "bg-sky-500/15 text-sky-300",
  predicted: "bg-violet-500/15 text-violet-300",
  estimated: "bg-amber-500/15 text-amber-300",
};
type Shown = "intact" | "not_reached" | "burning" | "extinguished" | "damaged" | "relieved" | "ruptured";
const RANK: Record<Shown, number> = { intact: 0, not_reached: 1, burning: 2, extinguished: 2.5, damaged: 3, relieved: 4, ruptured: 5 };
const LABEL: Record<Shown | "end", string> = { intact: "Intact", not_reached: "Not reached", burning: "Burning", extinguished: "Extinguished", damaged: "Damaged", relieved: "Pressure relieved", ruptured: "Ruptured", end: "Simulation ended" };
const MEASURED = new Set(["measured", "reported"]);

export interface PanelPick { name: string; material: string; n: number }

function Chip({ tag }: { tag: string }) {
  const { lang } = useTr();
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${TAGC[tag] ?? TAGC.estimated}`}>{lang === "es" ? TAG_ES[tag] ?? tag : tag}</span>;
}
function FactLine({ f, hide }: { f: CFact; hide: boolean }) {
  const { t, X } = useTr();
  if (hide && !MEASURED.has(f.tag)) return <p className="text-xs text-muted">{t("Hidden: this statement is not measured data (switch off “measured only” to see it).")}</p>;
  return (
    <p className="text-xs text-ink-2">
      <Chip tag={f.tag} /> {X(f.text)} <span className="text-muted">{t("Source:")} {X(f.src)}</span>
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

const f1 = (n: number) => (Math.round(n * 10) / 10).toString();

/** The alert (rupture) or status (tank under heat) shown when the fire reaches an energetic component. Every figure comes from lib/componentReport. */
function RuptureNotice({ rep, atm, condTag, tank, applied }: { rep: NonNullable<ReturnType<typeof ruptureReport>>; atm: Atm; condTag: string; tank: CComponent; applied: Record<string, number> }) {
  const { lang, t, X } = useTr();
  const [lo, hi] = rep.window;
  const name = X(rep.tankLabel);
  const conds = t("O2 {o2} %, {psi} psi, {g} g, airflow {flow} cm/s", { o2: Math.round(atm.o2 * 100), psi: (atm.pressureAtm * 14.696).toFixed(1), g: atm.gravityG, flow: atm.flowCmS });
  const row = (k: string, v: string, tag: string) => (
    <li className="text-xs text-ink-2"><span className="font-medium text-ink">{k}:</span> {v} <Chip tag={tag} /></li>
  );
  if (rep.status === "heating") {
    return (
      <div role="status" className="mt-2 rounded-lg border border-amber-400/60 bg-amber-500/10 p-3" data-testid="heat-notice">
        <p className="text-sm font-semibold text-amber-200">{t("{name} under heat: the fire reached it at t = {t0} s and has heated it for {exp} s.", { name, t0: f1(rep.reachedAt ?? 0), exp: f1(rep.exposureS ?? 0) })}</p>
        <p className="text-xs text-ink-2">
          {rep.remainingToPlannedS !== null ? t("The model plans the rupture in {s} s (mid-point of an assumed {lo}-{hi} s heating window); across the whole window that is between {a} and {b} s left.", { s: f1(rep.remainingToPlannedS), lo, hi, a: f1(rep.remainingToWindowS?.[0] ?? 0), b: f1(rep.remainingToWindowS?.[1] ?? 0) }) : t("No rupture is planned in this run.")} <Chip tag="estimated" />
        </p>
      </div>
    );
  }
  if (rep.status === "relieved") {
    return (
      <div role="status" className="mt-2 rounded-lg border border-sky-400/50 bg-sky-500/10 p-3" data-testid="relief-notice">
        <p className="text-sm font-semibold text-sky-200">{t("{name}: pressure relieved at t = {t0} s, {exp} s after the fire reached it; no rupture in this run.", { name, t0: f1(rep.relievedAt ?? 0), exp: f1(rep.exposureS ?? 0) })}</p>
        <p className="text-xs text-muted">{t("Engineering proposal (hypothesis): the engine removes the stored pressure before the assumed window ends.")} <Chip tag="estimated" /></p>
      </div>
    );
  }
  const stateName = (s: string) => ((lang === "es" ? STATE_ES : STATE_EN)[s] ?? s);
  const consequences = rep.consequences.map((c) => `${X(c.label)} (${stateName(c.state).toLowerCase()}, t = ${f1(c.t)} s)`).join("; ");
  const measures = Object.entries(applied).map(([id, at]) => t("{id} at {s} s", { id, s: f1(at) })).join("; ");
  return (
    <div role="alert" className="mt-2 rounded-lg border border-red-400/70 bg-red-500/10 p-3" data-testid="rupture-alert">
      <p className="text-sm font-semibold text-red-200">
        {rep.forced
          ? t("{name} ruptured: forced demo scenario, the failure is imposed at t = 0 s without any heating.", { name })
          : t("{name} ruptured: the fire reached the tank and heated it for {exp} s.", { name, exp: f1(rep.exposureS ?? 0) })}
      </p>
      <ul className="mt-1 space-y-1">
        {row(t("Where it started"), t("{label} (ignition point chosen by the user, t = 0 s)", { label: X(rep.chain[0]?.label ?? rep.originId) }), "estimated")}
        {row(t("Fire path to the tank"), rep.chain.length > 1 ? rep.chain.map((s) => `${X(s.label)} ${f1(s.t)} s`).join(" → ") : t("the fire started at the tank itself"), "estimated")}
        {row(t("Time heated before the rupture"), rep.forced ? t("none (forced scenario)") : `${f1(rep.exposureS ?? 0)} s`, "estimated")}
        {row(t("Rupture window used"), t("assumed {lo}-{hi} s of heating, mid-point {mid} s (no dataset for this tank)", { lo, hi, mid: f1(rep.usedS) }), "estimated")}
        {row(t("Conditions"), conds, condTag)}
        {row(t("Path"), rep.forced ? t("forced scenario (demo, not a prediction)") : t("physical path: the heating window ran out"), "estimated")}
        {row(t("Neighbours hit"), consequences || t("none inside the declared radius of {r} m", { r: tank.energetic?.blastRadiusM ?? "?" }), "estimated")}
        {row(t("Measures"), measures ? t("applied ({list}) but they did not stop this rupture", { list: measures }) : t("none applied"), "estimated")}
      </ul>
      <p className="mt-2 text-xs text-ink-2">
        {t("Why: the oxygen is not the cause by itself. It feeds the combustion and holds the pressure; heating the vessel is what the model counts toward the rupture.")}{" "}
        {t("The window is an assumption, not a pressure or strength calculation.")} <Chip tag="estimated" />
      </p>
      {tank.energetic && <FactLine f={tank.energetic.failureMode} hide={false} />}
    </div>
  );
}

/** every run of this page session (cleared on reload): immutable RunRecords, finished or closed early. The run on screen is added when a file is built. */
const sessionRuns: RunRecord[] = [];
let runSeq = 0;
/** the last run that finished or was closed (any end reason): "View last results" reopens it at any time, even after a new ignition */
let lastRun: { build: (l?: "en" | "es") => RunRecord; source: string } | null = null;
/** the run on screen: the same inputs and the same engine events as the timeline */
interface CurRun { runId: string; ts: string; source: string; atm: Atm; forced: boolean; measuredOnly: boolean; applied: Record<string, number>; events: CEvent[]; t: number }

interface PanelProps {
  api: SceneApi | null; atm: Atm; pick: PanelPick | null; env: string;
  /** tag of the atmosphere values themselves (estimated for the Moon and the suit) */ condTag?: string;
  /** phase of the surface-fire layer (LabFire): "out" means the lab's own suppression system put the fire out */ labPhase?: string;
  /** every change opens the results window of the last run (a button elsewhere on the page); 0 = never */ resultsSignal?: number;
  /** tells the page how many runs this session has, so its own "View last results" button knows when to enable */ onRuns?: (n: number) => void;
}

/** Generic panel: it renders for every environment that has a catalog in lib/componentEnvs and for no other. */
export default function ComponentPanel(props: PanelProps) {
  const bundle = COMPONENT_ENVS[props.env];
  if (!bundle) return null;
  return <EnvPanel key={props.env} {...props} bundle={bundle} />;
}

function EnvPanel({ api, atm: atmIn, pick, env, bundle, condTag = "estimated", labPhase, resultsSignal = 0, onRuns }: PanelProps & { bundle: EnvBundle }) {
  const { lang, t: T, X } = useTr();
  const stateName = (st: string) => (lang === "es" ? STATE_ES : (LABEL as Record<string, string>))[st] ?? st;
  const CATALOG = bundle.catalog;
  const MAP = bundle.map;
  const HORIZON_S = bundle.horizonS ?? DEFAULT_HORIZON_S;
  const GRAPH = useMemo(() => toGraph(CATALOG), [CATALOG]);
  const BY_ID = useMemo(() => new Map(CATALOG.components.map((c) => [c.id, c])), [CATALOG]);
  const TANK = useMemo(() => energeticOf(CATALOG), [CATALOG]);
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
  /** meshes whose material was swapped for a tinted clone, with the original to give back */
  const tint = useRef(new Map<THREE.Mesh, THREE.Material | THREE.Material[]>());

  const cur = useRef<CurRun | null>(null); // the run on screen while it has not ended
  const runMeta = useRef<{ runId: string; ts: string } | null>(null);
  const mk = useRef<(c: CurRun, endAt?: BuildInput["endAt"], lang?: "en" | "es") => RunRecord>(() => { throw new Error("run record builder not ready"); });
  const [ended, setEnded] = useState<RunRecord | null>(null);
  /** inputs of the run that ended: the on-screen record is rebuilt from them when the language changes; files always use the English record */
  const endedSrc = useRef<{ c: CurRun; endAt?: BuildInput["endAt"] } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [, bump] = useState(0);

  /** stores a run that stopped (kept for the files and for "View last results") */
  const closeRun = (c: CurRun, endAt?: BuildInput["endAt"]) => {
    sessionRuns.push(mk.current(c, endAt));
    const build = mk.current; // the builder of this very environment, even if the panel unmounts later
    lastRun = { build: (l) => build(c, endAt, l), source: c.source };
  };

  const start = useCallback((id: string | null, r: Resolution | null) => {
    // a new ignition closes the run on screen as interrupted (kept for the files) and opens the next run_id
    if (cur.current) { closeRun(cur.current, { t: cur.current.t, reason: "interrupted_by_user" }); cur.current = null; }
    if (id) { runSeq += 1; runMeta.current = { runId: `run-${String(runSeq).padStart(3, "0")}`, ts: new Date().toISOString() }; } else runMeta.current = null;
    setEnded(null);
    endedSrc.current = null;
    setDialogOpen(false);
    bump((n) => n + 1);
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

  const ms = useMemo(() => Object.entries(applied).flatMap(([id, atS]) => engineMeasures(CATALOG, [id], atS, source ?? undefined)), [applied, source, CATALOG]);
  const sim = useMemo(
    () => (source ? simulate({ ...GRAPH, atm, ignite: source, horizonS: HORIZON_S, measures: ms, forceRupture: forced ? TANK?.id : undefined }) : null),
    [source, atm, ms, forced, GRAPH, TANK],
  );
  // the files and the window are built from these very events (sim.events), through the immutable RunRecord, never from a second log
  cur.current = sim && source && runMeta.current && !ended ? { runId: runMeta.current.runId, ts: runMeta.current.ts, source, atm, forced, measuredOnly, applied, events: sim.events, t } : null;
  mk.current = (c, endAt, l) => buildRunRecord({ lang: l, runId: c.runId, timestampUtc: c.ts, appVersion: pkg.version, env, source: c.source, atm: c.atm, atmTag: condTag, forced: c.forced, measuredOnly: c.measuredOnly, applied: c.applied, events: c.events, catalog: CATALOG, endAt });
  // leaving the environment closes the run on screen
  useEffect(() => () => { if (cur.current) { closeRun(cur.current, { t: cur.current.t, reason: "interrupted_by_user" }); cur.current = null; } }, []);
  /** the engine's own end of the run: playback stops exactly there */
  const endT = sim?.end.t ?? 0;
  const maxT = endT;

  const finishWith = (endAt?: BuildInput["endAt"]) => {
    if (!cur.current) return;
    const c = cur.current;
    closeRun(c, endAt);
    endedSrc.current = { c, endAt };
    const rec = mk.current(c, endAt, lang);
    cur.current = null;
    setEnded(rec);
    setDialogOpen(true); // opens once per run; it never reopens by itself (the "View results" button does)
    setPlaying(false);
    if (endAt) setT(endAt.t);
  };
  useEffect(() => {
    if (endedSrc.current) setEnded(mk.current(endedSrc.current.c, endedSrc.current.endAt, lang));
  }, [lang]);
  // natural end: the clock reached the engine's terminal event
  useEffect(() => {
    if (sim && source && !ended && cur.current && t >= endT) finishWith();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, sim, source, ended, endT]);
  // the surface-fire layer says its own suppression system put the fire out
  const prevLab = useRef(labPhase);
  useEffect(() => {
    const was = prevLab.current;
    prevLab.current = labPhase;
    if (labPhase === "out" && was !== "out" && cur.current && !ended) finishWith({ t: cur.current.t, reason: "extinguished_by_suppression_system" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labPhase, ended]);

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
    if (!api || !TANK?.energetic) return;
    const b = new LabBlast(api, TANK.energetic.blastRadiusM * UNITS_PER_M);
    blast.current = b;
    return () => { b.dispose(); blast.current = null; };
  }, [api, TANK]);

  // clickable 3D marker on the back of the suit: a real <button> (keyboard + screen reader) projected from a 3D anchor each frame
  useEffect(() => {
    // only for an energetic component the 3D model does not contain (the suit's oxygen tank); the anchor logic is suit-specific
    const tank = TANK;
    if (!api || !tank?.virtual || env !== "suit") return;
    const host = document.querySelector<HTMLCanvasElement>("#fire-lab canvas")?.parentElement;
    if (!host) return;
    if (getComputedStyle(host).position === "static") host.style.position = "relative";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = T("PLSS O2 tank");
    btn.setAttribute("aria-label", T("PLSS (portable life-support backpack) oxygen tank, a virtual component on the back of the suit: start the fire here"));
    btn.setAttribute("data-testid", "tank-marker");
    btn.style.cssText = "position:absolute;left:0;top:0;z-index:5;padding:6px 12px;min-height:32px;border-radius:9999px;border:1px solid #fbbf24;background:rgba(10,12,18,.82);color:#fde68a;font:600 11px system-ui;cursor:pointer;white-space:nowrap;display:none;will-change:transform";
    btn.onclick = () => start(tank.id, { componentId: tank.id, method: "material", key: "virtual component" });
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
  }, [api, start, TANK, env, lang]);

  useEffect(() => {
    if (!api) return;
    const touched = tint.current;
    // each mesh gets its own tinted clone (procedural scenes share one material between several components) and gives the original back
    const restore = () => {
      touched.forEach((orig, mesh) => { for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) m.dispose(); mesh.material = orig; });
      touched.clear();
    };
    restore();
    api.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const id = resolveComponent(MAP, { mesh: mesh.name || mesh.parent?.name || "", material: mats[0]?.name ?? "" }).componentId;
      const st = id ? statesRef.current[id] : undefined;
      if (!st || st === "intact" || st === "not_reached") return;
      const tinted = mats.map((m) => {
        const c = m.clone() as THREE.MeshStandardMaterial;
        if (!c.emissive) return c;
        c.emissive.set(st === "burning" ? 0xff5a10 : st === "damaged" || st === "ruptured" ? 0x661100 : 0x2255aa);
        c.emissiveIntensity = st === "burning" ? 0.9 : 0.6;
        return c;
      });
      touched.set(mesh, mesh.material);
      mesh.material = Array.isArray(mesh.material) ? tinted : tinted[0];
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
  const reached = Object.values(states).filter((s) => s === "burning" || s === "damaged" || s === "ruptured" || s === "relieved" || s === "extinguished").length;
  const allMeasures = useMemo(() => {
    const seen = new Set<string>();
    return CATALOG.components.flatMap((c) => c.measures).filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)));
  }, []);
  const last: CEvent | undefined = visible.at(-1);
  const label = (id: string) => X(BY_ID.get(id)?.label ?? id);
  const speedNow = spreadFactors(atm, "fabric").mmS;
  const rep = sim && TANK && source ? ruptureReport(sim.events, t, CATALOG, source) : null;

  // every file is built from RunRecords; the run on screen, if it has not ended, goes in as "in_progress" at the current time
  const allRuns = (): RunRecord[] => [...sessionRuns, ...(cur.current ? [mk.current(cur.current, { t: cur.current.t, reason: "in_progress" })] : [])];
  const runCount = sessionRuns.length + (cur.current ? 1 : 0);
  const downloadCsv = () => downloadText(csvFileName(env), buildCsv(allRuns()), "text/csv;charset=utf-8");

  const apply = (id: string) => setApplied((a) => (ended || id in a ? a : { ...a, [id]: Math.round(t * 10) / 10 }));
  const lightAgain = () => { const s = source ?? lastRun?.source ?? null; if (s) start(s, { componentId: s, method: "material", key: "light it again" }); };
  const hasLast = !!ended || !!lastRun;
  const openLast = () => { if (hasLast) setDialogOpen(true); };
  // the window of a run that is not the one on screen (the last one closed), rebuilt in the current language
  const dlgRun = dialogOpen ? (ended ?? lastRun?.build(lang) ?? null) : null;
  const dlgEn = () => (ended ? (endedSrc.current ? mk.current(endedSrc.current.c, endedSrc.current.endAt) : ended) : (lastRun?.build("en") as RunRecord));
  // a button elsewhere on the page asks for the last results
  const firstSignal = useRef(resultsSignal);
  useEffect(() => {
    if (resultsSignal !== firstSignal.current) { firstSignal.current = resultsSignal; openLast(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultsSignal]);
  useEffect(() => { onRuns?.(runCount); }, [runCount, onRuns]);

  return (
    <div className="card p-4" id="component-panel">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-semibold">{T("Component engine")}</h3>
        <span className="rounded bg-fuchsia-500/15 px-1.5 py-0.5 text-[10px] font-medium text-fuchsia-300">{T("simulation")}</span>
      </div>
      <p className="mt-1 text-xs text-muted">{T("Tap a part of the model to identify it and see how a fire could move between components. The timeline, the colours on the model and the numbers come from the same engine.")}</p>
      <label className="mt-2 flex items-center gap-2 text-xs text-ink-2">
        <input type="checkbox" checked={measuredOnly} onChange={(e) => setMeasuredOnly(e.target.checked)} />
        {T("Measured only (hide our simulation)")}
      </label>

      {pick && <p className="mt-2 text-[11px] text-muted" data-testid="model-part">{T("Model part tapped: {material} · mesh {mesh}", { material: pick.material || T("(no material name)"), mesh: pick.name || T("(unnamed)") })}</p>}

      {!source && (
        <div className="mt-3 text-sm">
          {res ? (
            <p className="rounded-lg border border-line p-2.5 text-xs text-ink-2">
              {res.method === "ignored" ? T("Not a component: {note}.", { note: X(res.note ?? "") || T("declared as not simulated in the map") }) : T("Unidentified surface: the 3D model does not say what this part is. The fire still starts there, but the component engine has no data for it.")} {TANK ? T("Pick a labelled part, or start at the {tank} below.", { tank: X(shortLabel(TANK)) }) : T("Pick a labelled part.")}
            </p>
          ) : (
            <p className="text-xs text-ink-2">{T("No part selected yet.")}</p>
          )}
        </div>
      )}

      {TANK && (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => start(TANK.id, { componentId: TANK.id, method: "material", key: TANK.virtual ? "virtual component" : "catalog" })}
              className="rounded-lg border border-line-2 px-3 py-1.5 text-sm text-ink-2 hover:text-ink">
              {T("Start at the {tank}", { tank: X(shortLabel(TANK)) })}
            </button>
            <label className="flex items-center gap-2 text-sm text-ink-2">
              <input type="checkbox" checked={forced} onChange={(e) => { setForced(e.target.checked); setT(0); setPlaying(!!source); }} />
              {T("Forced failure (demo scenario, not a prediction)")}
            </label>
          </div>
          {TANK.virtual && env === "suit" && <p className="mt-1 text-[11px] text-muted">{T("PLSS = the portable life-support backpack. The suit model has no separately selectable oxygen tank, so it is a virtual component (tap the “PLSS O2 tank” marker on the back of the suit). Its effects are drawn at the torso.")}</p>}
        </>
      )}

      {comp && (
        <div className="mt-3 rounded-lg border border-line p-3">
          <p className="text-sm font-semibold">{X(comp.label)}</p>
          <p className="text-xs text-ink-2">{X(comp.function)}</p>
          <p className="mt-1 text-xs text-muted">
            {T("Material class: {material}. Identified by: {how}.", { material: lang === "es" ? MATERIAL_ES[comp.material] ?? comp.material : comp.material, how: res?.method === "material" && !comp.virtual ? T("material name in the model (manual label, medium confidence)") : comp.virtual ? T("virtual component (not in the 3D model)") : res?.method ?? "" })}
          </p>
          <FactLine f={comp.flammability} hide={measuredOnly} />
          {comp.energetic && (
            <div className="mt-2 space-y-1 border-t border-line pt-2">
              <p className="text-xs font-semibold text-amber-300">{T("Energetic component: {kind}, contents {contents}", { kind: lang === "es" ? ENERGETIC_KIND_ES[comp.energetic.kind] ?? comp.energetic.kind.replace("_", " ") : comp.energetic.kind.replace("_", " "), contents: X(comp.energetic.contents) })}</p>
              <FactLine f={comp.energetic.pressureNote} hide={measuredOnly} />
              <FactLine f={comp.energetic.failureMode} hide={measuredOnly} />
            </div>
          )}
        </div>
      )}

      {sim && (
        <>
          {ended ? (
            <div className="mt-3 rounded-lg border border-line-2 bg-surface p-3" role="status" data-testid="ended-status">
              <p className="text-sm font-semibold">{T("Simulation ended · {reason}", { reason: lang === "es" ? END_REASON_ES[ended.endReason] ?? ended.endReason : ended.endReason })}</p>
              <p className="text-xs text-ink-2">{T("At t = {t0} s. The timeline, the numbers and the colours on the model are stopped. {why}.", { t0: ended.endT.toFixed(1), why: ended.endWhy })}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-sm">
                <button onClick={() => setDialogOpen(true)} className="rounded-lg border border-line-2 px-3 py-1.5" data-testid="view-results">{T("View results")}</button>
                <button onClick={lightAgain} className="rounded-lg bg-accent px-3 py-1.5 font-semibold text-black" data-testid="light-again-panel">{T("Light it again")}</button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <button onClick={() => setPlaying((p) => !p)} className="rounded-lg border border-line-2 px-3 py-1.5">{playing ? T("Pause") : T("Play")}</button>
              <button onClick={() => { setT(0); setPlaying(true); }} className="rounded-lg border border-line-2 px-3 py-1.5 text-ink-2 hover:text-ink">{T("Restart")}</button>
              <label className="text-ink-2">{T("Speed")}
                <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="ml-1 rounded-lg border border-line-2 bg-surface px-1.5 py-1 text-ink">
                  <option value={1}>×1</option><option value={4}>×4</option><option value={16}>×16</option><option value={64}>×64</option><option value={256}>×256</option>
                </select>
              </label>
            </div>
          )}
          <div className="mt-2">
            <label htmlFor="cp-time" className="flex justify-between text-xs text-ink-2"><span>{T("Simulated time")}</span><span className="tabular-nums">{t.toFixed(0)} s</span></label>
            <input id="cp-time" type="range" min={0} max={Math.max(maxT, 1)} step={0.5} value={t} disabled={!!ended} onChange={(e) => { setPlaying(false); setT(Number(e.target.value)); }} className="w-full" />
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border border-line p-2"><p className="text-muted">{T("Components reached")}</p><p className="text-lg font-semibold tabular-nums">{reached} / {CATALOG.components.length}</p><Chip tag="estimated" /></div>
            <div className="rounded-lg border border-line p-2"><p className="text-muted">{T("Spread speed (fabric reference)")}</p><p className="text-lg font-semibold tabular-nums">{speedNow.toFixed(1)} mm/s</p><Chip tag="estimated" /></div>
            {TANK?.energetic && (
              <div className="col-span-2 rounded-lg border border-line p-2">
                <p className="text-muted">{T("{tank} outcome", { tank: X(shortLabel(TANK)) })}</p>
                <p className="font-semibold">{rupture ? (rupture.forced ? T("Ruptures at about {s} s (forced scenario)", { s: rupture.t.toFixed(0) }) : T("Ruptures at about {s} s (mid-point of an assumed {lo}-{hi} s heating window, no dataset)", { s: rupture.t.toFixed(0), lo: TANK.energetic.heatToRuptureS[0], hi: TANK.energetic.heatToRuptureS[1] })) : relieved ? T("Rupture avoided: pressure relieved at {s} s", { s: relieved.t.toFixed(0) }) : T("No rupture in this run")}</p>
                <Chip tag="estimated" />
              </div>
            )}
          </div>

          {rep && rep.status !== "none" && (
            measuredOnly
              ? <p className="mt-2 text-xs text-muted">{T("Rupture notice hidden: it is built from simulated (estimated) events, not measured data.")}</p>
              : <RuptureNotice rep={rep} atm={atm} condTag={condTag} tank={TANK as NonNullable<typeof TANK>} applied={applied} />
          )}

          <h4 className="mt-3 text-sm font-semibold">{T("Components")}</h4>
          <ul className="mt-1 grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
            {CATALOG.components.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 rounded border border-line px-2 py-1">
                <span>{X(c.label)}</span>
                <span className={states[c.id] === "burning" ? "text-orange-300" : states[c.id] === "intact" ? "text-muted" : "text-amber-300"}>{stateName(states[c.id])}</span>
              </li>
            ))}
          </ul>

          <h4 className="mt-3 text-sm font-semibold">{T("Timeline")}</h4>
          <p className="sr-only" aria-live="polite">{last ? T("{component}: {state} at {s} seconds", { component: label(last.componentId), state: stateName(last.state), s: last.t.toFixed(0) }) : ""}</p>
          <ol className="mt-1 space-y-1 text-xs">
            {visible.length === 0 && <li className="text-muted">{measuredOnly ? T("Nothing measured to show: every event of this simulation is estimated.") : T("Press Play.")}</li>}
            {visible.map((e, i) => (
              <li key={i} className="rounded border border-line px-2 py-1">
                <span className="tabular-nums text-ink">t = {e.t.toFixed(0)} s</span> · {label(e.componentId)} · <strong>{stateName(e.state)}</strong> <Chip tag={e.tag} />
                {e.forced && <span className="ml-1 text-fuchsia-300">{T("forced scenario")}</span>}
                <span className="block text-muted">{X(e.reason)}</span>
              </li>
            ))}
          </ol>
        </>
      )}

      <h4 className="mt-3 text-sm font-semibold">{T("Measures")}</h4>
      <p className="text-[11px] text-muted">{T("Applied at the current simulated time. Every measure here is an engineering proposal (hypothesis); none has test data for this model.")}</p>
      {(!source || ended) && (
        <p className="mt-1 rounded border border-amber-400/40 px-2 py-1 text-[11px] text-amber-300" role="status" data-testid="measures-locked">
          {T(ended ? "The simulation ended, so measures are locked. Press “Light it again” to try another one." : "Measures unlock once a fire is burning: tap a part of the model to start one.")}
        </p>
      )}
      <ul className="mt-1 space-y-1.5">
        {allMeasures.map((m) => (
          <li key={m.id} className="rounded-lg border border-line p-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
              <p className="min-w-0 flex-1 basis-48 font-medium text-ink">{X(m.action)}</p>
              <button onClick={() => apply(m.id)} disabled={!source || !!ended || m.id in applied}
                className="min-h-9 shrink-0 rounded-lg bg-accent px-3 py-1 text-xs font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40">
                {m.id in applied ? T("Applied at {s} s", { s: applied[m.id] }) : T("Apply measure")}
              </button>
            </div>
            <details className="mt-1">
              <summary className="cursor-pointer text-[11px] text-ink-2 hover:text-ink">{T("Why and source")}</summary>
              {measuredOnly ? <p className="text-muted">{T("Hidden: not measured data.")}</p> : <FactLine f={m.effect} hide={false} />}
            </details>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button onClick={openLast} disabled={!hasLast} data-testid="view-last-results" className="min-h-9 rounded-lg border border-line-2 px-3 py-1.5 text-xs text-ink-2 hover:text-ink disabled:opacity-40">{T("View last results")}</button>
        <button onClick={downloadCsv} disabled={runCount === 0} data-testid="csv-download" className="min-h-9 rounded-lg border border-line-2 px-3 py-1.5 text-xs text-ink-2 hover:text-ink disabled:opacity-40">{T("Download data (.csv)")}</button>
      </div>
      <p className="mt-1 text-[11px] text-muted" data-testid="csv-hint">
        {runCount === 0
          ? T("No simulation recorded yet: tap a part of the model to start a run, then download its data.")
          : T(runCount === 1 ? "{n} run this session, one row per engine event plus a summary row per run. Built in your browser; nothing is uploaded. Times are simulated seconds (equal to real-equivalent seconds in this engine). The file is in English." : "{n} runs this session, one row per engine event plus a summary row per run. Built in your browser; nothing is uploaded. Times are simulated seconds (equal to real-equivalent seconds in this engine). The file is in English.", { n: runCount })}
      </p>
      <details className="mt-3 text-xs">
        <summary className="cursor-pointer text-ink-2 hover:text-ink">{T("Data gaps")}</summary>
        <ul className="mt-1 list-disc space-y-1 pl-4 text-muted">{CATALOG.gaps.map((g, i) => <li key={i}>{X(g)}</li>)}</ul>
      </details>
      {dlgRun && <ResultsDialog run={dlgRun} runEn={dlgEn} sessionRuns={allRuns} onClose={() => setDialogOpen(false)} onLightAgain={lightAgain} />}
    </div>
  );
}
