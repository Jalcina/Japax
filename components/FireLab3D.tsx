"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { ImmersiveEnv, PickInfo, SceneApi } from "@/components/ImmersiveScene";
import ComponentPanel, { type PanelPick } from "@/components/ComponentPanel";
import { componentEnvKey } from "@/lib/componentEnvs";
import { LabFire, type LabStats, type Phase } from "@/lib/labFire";
import { inferMaterial, spreadFactors } from "@/lib/labPhysics";
import { useData, useLang } from "@/lib/i18n";
import { tr } from "@/lib/labI18n";
import { AGENT_LIMIT, MATERIALS, factText, scenario, type Airflow, type Extinguisher, type Material, type Tag } from "@/lib/fireCases";

// three.js and the NASA models are only fetched when the lab is shown.
const ImmersiveScene = dynamic(() => import("@/components/ImmersiveScene"), {
  ssr: false,
  loading: () => <div className="h-[52vh] min-h-[320px] w-full rounded-xl border border-white/10 bg-black lg:h-[66vh]" aria-hidden="true" />,
});

type EnvId = "earth" | "iss" | "moon" | "suit";
const ENVS: EnvId[] = ["earth", "iss", "moon", "suit"];
const ENV_NAME: Record<EnvId, string> = { earth: "Earth", iss: "ISS", moon: "Lunar base", suit: "Spacesuit" };

const TAG: Record<Tag, string> = {
  measured: "bg-emerald-500/15 text-emerald-300",
  reported: "bg-sky-500/15 text-sky-300",
  predicted: "bg-violet-500/15 text-violet-300",
  estimated: "bg-amber-500/15 text-amber-300",
};
const SIM = "bg-fuchsia-500/15 text-fuchsia-300";

interface Cond { o2: number; pressureAtm: number; gravityG: number; flowCmS: number }
interface Fixed { value: string; tag: Tag; src: string; eli5: string }

/** Fixed, sourced conditions per environment. Nothing here is invented: each line says where it comes from. */
const FIXED: Record<EnvId, { cond: Cond; rows: Record<"o2" | "p" | "g" | "flow", Fixed>; banner?: string }> = {
  earth: {
    cond: { o2: 0.21, pressureAtm: 1, gravityG: 1, flowCmS: 0 },
    rows: {
      o2: { value: "21 %", tag: "reported", src: "Challenge statement (standard air)", eli5: "Air is mostly nitrogen. Oxygen is the part a fire eats: more oxygen, hungrier fire." },
      p: { value: "14.7 psi (1 atm)", tag: "reported", src: "Challenge statement", eli5: "How tightly the air is packed. Thinner air carries fewer oxygen molecules to the flame." },
      g: { value: "1 g", tag: "measured", src: "Physical constant", eli5: "Gravity makes hot air rise, so a flame pulls fresh air in from below and stretches into a teardrop." },
      flow: { value: "none forced", tag: "estimated", src: "No forced flow assumed; hot gases create their own", eli5: "Hot air rising is itself a wind that keeps feeding the fire." },
    },
    banner: "Earth (1 g): the PSI tables are microgravity tests, so this side of the lab is the least evidenced.",
  },
  iss: {
    cond: { o2: 0.21, pressureAtm: 1, gravityG: 0, flowCmS: 10 },
    rows: {
      o2: { value: "21 %", tag: "reported", src: "Challenge statement (standard cabin)", eli5: "The same air as on the ground. Oxygen is what a fire eats." },
      p: { value: "14.7 psi (1 atm)", tag: "reported", src: "Challenge statement (standard cabin)", eli5: "Normal air pressure inside the station." },
      g: { value: "0 g", tag: "measured", src: "Orbital free fall", eli5: "Everything falls together, so hot air does not rise and a flame is a round blue ball." },
      flow: { value: "about 10 cm/s", tag: "reported", src: "NASA challenge guide, ventilation level used in BASS tests", eli5: "A gentle breeze from the cabin fans. A flame in space needs a little of it to keep going." },
    },
  },
  moon: {
    cond: { o2: 0.3, pressureAtm: 0.694, gravityG: 0.166, flowCmS: 10 },
    rows: {
      o2: { value: "30 % or more", tag: "estimated", src: "Challenge statement; FM2 plans 21 % at 14.7 psia and 34 % at 8.2 psia (NTRS 20240015307)", eli5: "Moon bases are planned to use more oxygen so astronauts can use thinner air. More oxygen makes fire hungrier." },
      p: { value: "10.2 psi or less", tag: "estimated", src: "Challenge statement; FM2 (NTRS 20240015307)", eli5: "Thinner air than on Earth, to save weight in the habitat walls." },
      g: { value: "0.166 g", tag: "estimated", src: "Lunar gravity is a constant, but there is no PSI combustion data at this g (LUCI 2025 and FM2 are the first)", eli5: "About one sixth of Earth gravity. Nobody has measured how a flame behaves here, so the lab blends 0 g and 1 g." },
      flow: { value: "about 10 cm/s (assumed)", tag: "estimated", src: "Assumed equal to the ISS cabin; no lunar-habitat data", eli5: "We guess the habitat has fans like the station. This is a guess." },
    },
    banner: "Lunar gravity = extrapolation. No experimental combustion data in PSI; LUCI (2025) and FM2 are the first.",
  },
  suit: {
    cond: { o2: 1, pressureAtm: 0.293, gravityG: 0, flowCmS: 0 },
    rows: {
      o2: { value: "100 %", tag: "reported", src: "Challenge statement (suit atmosphere)", eli5: "Pure oxygen. A spark that would fizzle in air can burn fiercely." },
      p: { value: "4.3 psi (0.29 atm)", tag: "reported", src: "Challenge statement", eli5: "A low pressure so the suit stays flexible, balanced by very high oxygen." },
      g: { value: "0 g (in orbit)", tag: "estimated", src: "Assumed: suit worn in microgravity", eli5: "Floating in orbit, so no rising hot air." },
      flow: { value: "none assumed", tag: "estimated", src: "No suit airflow data", eli5: "Inside a suit there is no breeze we can cite." },
    },
    banner: "Spacesuit: 100 % O2 at 4.3 psi is outside every tested atmosphere (PSI tables reach about 34 % O2). Everything shown for it is estimated.",
  },
};

const airflowOf = (cm: number): Airflow => (cm < 1 ? "still" : cm < 5 ? "low" : "moderate");
const EXT_LABEL: Record<Extinguisher, string> = {
  none: "No system",
  "vent-off": "Cut ventilation",
  co2: "CO₂ (ISS extinguisher)",
  he: "Helium dilution",
  depressurize: "Vent the cabin",
};
const PHASE_LABEL: Record<Phase, string> = { idle: "Waiting for ignition", igniting: "Igniting", spreading: "Spreading", suppressing: "Going out", out: "Extinguished" };

const fmt = (x: number, d = 1) => (Number.isFinite(x) ? x.toFixed(d) : "—");

function Tile({ label, value, tag, eli5 }: { label: string; value: string; tag?: string; eli5: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface-2 p-2.5">
      <p className="text-[11px] uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums leading-tight">{value}</p>
      <p className="mt-1 text-[11px] leading-snug text-ink-2">{eli5}</p>
      {tag && <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${SIM}`}>{tag}</span>}
    </div>
  );
}

function Slider({ id, label, value, min, max, step, show, onChange, note }: { id: string; label: string; value: number; min: number; max: number; step: number; show: string; onChange: (v: number) => void; note?: string }) {
  return (
    <div>
      <label htmlFor={id} className="flex items-baseline justify-between text-sm">
        <span>{label}</span>
        <span className="tabular-nums text-ink-2">{show}</span>
      </label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 w-full" />
      {note && <p className="text-xs text-muted">{note}</p>}
    </div>
  );
}

export default function FireLab3D({ fixedEnv, onOpenEvidence }: { fixedEnv?: EnvId; onOpenEvidence?: () => void } = {}) {
  const { lang } = useLang();
  const data = useData();
  // O2, pressure and gravity come from the single environment dataset (the same one the gauges use); only airflow is local
  const condFor = (id: EnvId): Cond => {
    const e = data.environments.find((x) => x.id === (id === "moon" ? "moon-habitat" : id));
    const base = FIXED[id].cond;
    return e ? { o2: e.o2, pressureAtm: e.pressureAtm, gravityG: e.gravityG ?? 0, flowCmS: base.flowCmS } : base;
  };
  const t = (s: string, v?: Record<string, string | number>) => tr(lang, s, v);
  const [env, setEnv] = useState<EnvId>(fixedEnv ?? "iss");
  const [custom, setCustom] = useState(false);
  const [cond, setCond] = useState<Cond>(() => condFor(fixedEnv ?? "iss"));
  const [coAmb, setCoAmb] = useState({ co2: 0, he: 0 });
  const [fuelDrop, setFuelDrop] = useState<"methanol" | "heptane">("heptane");
  const [material, setMaterial] = useState<Material>("fabric");
  const [view, setView] = useState<"site" | "overview">("site");
  const [inferred, setInferred] = useState<string | null>(null);
  const userPickedMaterial = useRef(false);
  const [ext, setExt] = useState<Extinguisher>("co2");
  const [frac, setFrac] = useState(0.3);
  const [delayMode, setDelayMode] = useState<"manual" | "auto">("manual");
  const [delayS, setDelayS] = useState(30);
  const [activated, setActivated] = useState<number | null>(null); // real-equivalent seconds at activation
  const [lapse, setLapse] = useState(40);
  const [stats, setStats] = useState<LabStats | null>(null);
  const [ready, setReady] = useState(false);
  const [lit, setLit] = useState(false);
  const labRef = useRef<LabFire | null>(null);
  const apiRef = useRef<SceneApi | null>(null);
  const [sceneApi, setSceneApi] = useState<SceneApi | null>(null);
  const [panelPick, setPanelPick] = useState<PanelPick | null>(null);

  const pick = useCallback((id: EnvId) => {
    setEnv(id);
    setCustom(false);
    setCond(condFor(id));
    setCoAmb({ co2: 0, he: 0 });
    setActivated(null);
    setLit(false);
    setStats(null);
    setReady(false);
    setView("site");
    setPanelPick(null);
    setInferred(null);
  }, []);

  const toggleCustom = () => {
    if (custom) { setCond(condFor(env)); setCoAmb({ co2: 0, he: 0 }); }
    setCustom(!custom);
  };

  // the conditions the simulation actually uses: the environment's fixed data, or the user's own
  const atm = custom ? cond : condFor(env);
  const mat = MATERIALS[material];
  const agentFrac = ext === "co2" || ext === "he" ? Math.min(frac, AGENT_LIMIT[ext]) : 0;

  const sc = useMemo(
    () => scenario({ atm: { o2: atm.o2, pressureAtm: atm.pressureAtm, gravityG: atm.gravityG }, env, material, airflow: airflowOf(atm.flowCmS), ext, frac, delayS: activated ?? 0 }),
    [atm.o2, atm.pressureAtm, atm.gravityG, atm.flowCmS, env, material, ext, frac, activated],
  );

  // auto delay: the plan starts by itself after the user's own delay (real-equivalent seconds)
  useEffect(() => {
    if (delayMode === "auto" && ext !== "none" && activated === null && stats && stats.phase !== "idle" && stats.realT >= delayS) setActivated(stats.realT);
  }, [stats, delayMode, delayS, ext, activated]);

  const active = ext !== "none" && activated !== null;
  const damp = (ext === "co2" || ext === "he") && sc.fate === "unknown" ? Math.min(1, agentFrac / AGENT_LIMIT[ext]) * 0.9 : 0;

  // push every change into the engine
  useEffect(() => {
    labRef.current?.setConditions(
      { ...atm },
      material,
      { active, fate: sc.fate, delayS: delayMode === "auto" && ext !== "none" ? delayS : null, damp },
      lapse,
    );
  }, [atm, material, active, sc.fate, delayMode, ext, delayS, damp, lapse, ready]);

  const onReady = useCallback((api: SceneApi) => {
    const lf = new LabFire(api, { mobile: window.innerWidth < 768 });
    lf.onStats = setStats;
    labRef.current = lf;
    apiRef.current = api;
    setSceneApi(api);
    setReady(true);
    return () => { lf.dispose(); if (labRef.current === lf) labRef.current = null; apiRef.current = null; setSceneApi(null); };
  }, []);

  const onPick = useCallback((p: [number, number, number], info?: PickInfo) => {
    const lf = labRef.current;
    if (!lf) return;
    if (apiRef.current) apiRef.current.controls.autoRotate = false;
    setActivated(null);
    setPanelPick({ name: info?.name ?? "", material: info?.material ?? "", n: performance.now() });
    lf.ignite(new THREE.Vector3(...p), new THREE.Vector3(...(info?.normal ?? [0, 1, 0])), info?.name ?? "");
    setLit(true);
    // what is it made of? a guess from the model's part name (estimated); the user's own choice always wins
    const guess = inferMaterial(info?.name ?? "");
    setInferred(guess ? info?.name ?? null : null);
    if (guess && !userPickedMaterial.current) setMaterial(guess);
  }, []);

  // keyboard / assistive route: ignite where the camera is looking (the centre of the canvas)
  const igniteCentre = () => {
    const api = apiRef.current;
    const c = document.querySelector<HTMLCanvasElement>("#fire-lab canvas");
    if (!api || !c) return;
    const r = c.getBoundingClientRect();
    const hit = api.raycast(r.x + r.width / 2, r.y + r.height / 2);
    if (hit) onPick([hit.point.x, hit.point.y, hit.point.z], { normal: [hit.normal.x, hit.normal.y, hit.normal.z], name: hit.name, material: hit.material });
  };

  const switchView = (v: "site" | "overview") => { setView(v); setPanelPick(null); setReady(false); setLit(false); setStats(null); setActivated(null); };

  const reset = () => { labRef.current?.reset(); setActivated(null); setLit(false); setStats(null); };
  const reignite = () => { setActivated(null); labRef.current?.reignite(); };
  const activate = () => { if (ext !== "none") setActivated(stats?.realT ?? 0); };

  const live = stats && stats.phase !== "idle" ? stats : null;
  const fixed = FIXED[env];
  const unknownFx = active && sc.fate === "unknown";
  const estimatedEnv = env === "moon" || env === "suit";
  const suppression = t(!active ? (ext === "none" ? "No system selected" : "Ready: press Activate") : live?.phase === "out" ? "Extinguished" : live?.phase === "suppressing" ? "Suppressing" : unknownFx ? (damp > 0 ? "Dilution estimated" : "No data: no effect shown") : sc.fate === "burn" ? "Applied: still burning" : "Applied");
  const supTag = active && (estimatedEnv || unknownFx) ? t("estimated: no experimental data") : undefined;
  const detection = !live ? "—" : t(live.detected ? (active ? "Smoke seen, system acting" : "Smoke present, waiting for you") : "No smoke yet");

  return (
    <section id="fire-lab" aria-labelledby="fl3-title" className="scroll-mt-20">
      <p className="eyebrow">{t("Touch to burn")}</p>
      <h2 id="fl3-title" className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{t("Start a fire anywhere and watch it spread")}</h2>
      <p className="mt-2 max-w-3xl text-sm text-ink-2">
        {t("Pick a place, then")} <strong className="text-ink">{t("tap any surface")}</strong> {t("in the 3D scene: that is where the fire starts. It grows and creeps across the surfaces around it while the numbers on the right change in real time.")}
        <span className="mt-1 block text-xs text-muted">{t("ELI5: a fire is a hungry glowing patch that eats what touches it. How fast it eats depends on the air (oxygen, wind, gravity) and on what it is eating.")}</span>
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2" role={fixedEnv === undefined ? "radiogroup" : undefined} aria-label={fixedEnv === undefined ? t("Environment") : undefined}>
        {fixedEnv === undefined && ENVS.map((id) => (
          <button key={id} role="radio" aria-checked={env === id} onClick={() => pick(id)}
            className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${env === id ? "border-accent bg-accent/15 text-ink" : "border-line-2 text-ink-2 hover:text-ink"}`}>
            {t(ENV_NAME[id])}
          </button>
        ))}
        <button onClick={toggleCustom} aria-pressed={custom} aria-controls={custom ? "fl3-custom" : undefined}
          className={`rounded-full border border-dashed px-3.5 py-1.5 text-sm transition-colors ${custom ? "border-accent bg-accent/10 text-ink" : "border-line-2 text-ink-2 hover:text-ink"}`}>
          {t(custom ? "Close custom" : "Custom")}
        </button>
      </div>

      {fixed.banner && <p className="mt-3 rounded-lg border p-2.5 text-xs" style={{ borderColor: "var(--warn)", color: "var(--warn)" }}>{t(fixed.banner)}</p>}

      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        {/* ---- 3D scene ---- */}
        <div className="flex flex-col">
          <div className="relative lg:min-h-[66vh] lg:flex-1" role="region" aria-label={t("Interactive 3D scene. Tap a surface to start a fire; or use the button below the scene to start one at the centre of the view.")}>
            <ImmersiveScene env={env as ImmersiveEnv} wide overview={view === "overview"} onReady={onReady} onPick={onPick} className="h-[52vh] min-h-[320px] lg:absolute lg:inset-0 lg:h-full" />
            {ready && !lit && (
              <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center px-3">
                <span className="rounded-full bg-black/65 px-4 py-2 text-center text-sm text-white backdrop-blur">{t("Tap a panel, cable, fabric or piece of equipment to start a fire there")}</span>
              </div>
            )}
            {lit && (
              <div className="absolute right-3 top-3 flex gap-2 text-xs">
                <button onClick={reignite} className="rounded-full bg-black/60 px-3 py-1.5 text-white/90 backdrop-blur hover:bg-black/80">{t("Re-ignite")}</button>
                <button onClick={reset} className="rounded-full bg-black/60 px-3 py-1.5 text-white/90 backdrop-blur hover:bg-black/80">{t("Clear")}</button>
              </div>
            )}
            <span className="pointer-events-none absolute bottom-8 left-3 rounded bg-black/55 px-2 py-0.5 text-[11px] text-white/80">{t("SIMULATION · flames and spread are illustrative")}</span>
          </div>
          <p className="mt-1.5 text-xs text-muted">
            {t("3D scene: a visualization, not a measurement. Models: NASA 3D Resources (ISS, EMU, Lunar Module), procedural terrain and Earth textures from three.js examples.")}{" "}
            <Link href="/references" className="link">{t("References")}</Link>
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            {(env === "iss" || env === "earth") && (
              <div className="flex gap-1.5" role="group" aria-label={t("Scene view")}>
                <button onClick={() => switchView("site")} aria-pressed={view === "site"} className={`rounded-lg border px-3 py-1.5 ${view === "site" ? "border-accent bg-accent/15" : "border-line-2 text-ink-2 hover:text-ink"}`}>{t("Fire site")}</button>
                <button onClick={() => switchView("overview")} aria-pressed={view === "overview"} className={`rounded-lg border px-3 py-1.5 ${view === "overview" ? "border-accent bg-accent/15" : "border-line-2 text-ink-2 hover:text-ink"}`}>{t(env === "iss" ? "Whole station" : "Whole Earth")}</button>
              </div>
            )}
            <button onClick={igniteCentre} disabled={!ready} className="rounded-lg border border-line-2 px-3 py-1.5 text-ink-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40">{t("Start a fire at the centre of the view")}</button>
            <span className="text-xs text-muted">{t("No mouse or touch? Frame the view first, then use this button.")}</span>
          </div>

          <label className="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink-2">
            {t("Time-lapse")}
            <select value={lapse} onChange={(e) => setLapse(Number(e.target.value))} className="rounded-lg border border-line-2 bg-surface px-1.5 py-1 text-ink">
              <option value={20}>×20</option><option value={40}>×40</option><option value={80}>×80</option><option value={160}>×160</option>
            </select>
            <span className="text-xs text-muted">{t("Real fires here creep at millimetres per second, so time is sped up. Both clocks are shown.")}</span>
          </label>
        </div>

        {/* ---- right column: live data next to the scene ---- */}
        <div className="space-y-4">
          <div className="card p-4">
            <div className="flex items-baseline justify-between">
              <h3 className="font-semibold">{t("Live data")}</h3>
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${SIM}`}>{t("all values simulated")}</span>
            </div>
            <p className="mt-1 text-sm" aria-live="polite"><strong>{t(live ? PHASE_LABEL[live.phase] : PHASE_LABEL.idle)}</strong></p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Tile label={t("Time")} value={live ? `${fmt(live.simT, 0)} s` : "—"} tag={t("simulated")} eli5={live ? t("Wall clock. The same spread would take about {m} min for real.", { m: fmt(live.realT / 60, 1) }) : t("Starts when you tap a surface.")} />
              <Tile label={t("Spread speed")} value={live ? `${fmt(live.speedMmS, 2)} mm/s` : "—"} tag={t("simulated")} eli5={live ? `${t(live.speedNote)}.` : t("How fast the flame front eats the surface.")} />
              <Tile label={t("Flame front")} value={live ? `${fmt(live.frontM * 100, 0)} cm` : "—"} tag={t("simulated")} eli5={t("Distance from the ignition point to the edge of the burning ring.")} />
              <Tile label={t("Burned area")} value={live ? `${fmt(live.areaM2 * 10000, 0)} cm²` : "—"} tag={t("simulated")} eli5={t("Surface already charred or glowing. Scene units are about metres.")} />
              <Tile label={t("Smoke / soot")} value={live ? `${live.particles}` : "—"} tag={t("simulated particles")} eli5={live ? t(atm.gravityG < 0.05 ? "No gravity: smoke hangs around the fire instead of rising." : "Gravity: smoke rises in a plume.") : t("Tiny soot grains drawn on screen.")} />
              <Tile label={t("Burning spots")} value={live ? t("{f} flames · {c} cells", { f: live.flames, c: live.cells }) : "—"} tag={t("simulated")} eli5={t("Flames shown on the front and cells of surface already involved.")} />
              <Tile label={t("Surfaces reached")} value={live ? `${live.surfaces}` : "—"} tag={t("simulated")} eli5={t("How many different parts of the model the fire has touched.")} />
              <Tile label={t("Intensity")} value={live ? `${Math.round(live.intensity * 100)} %` : "—"} tag={t("simulated")} eli5={t("How alive the flame is (not a temperature).")} />
            </div>
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-ink-2">{t("Detection")}</dt><dd className="text-right">{detection}<span className="block text-[11px] text-muted">{t("No dataset gives detector response times. The delay below is yours, not a measured time.")}</span></dd></div>
              <div className="flex justify-between gap-3"><dt className="text-ink-2">{t("Extinction")}</dt><dd className="text-right">{suppression}{supTag && <span className="ml-1.5 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-300">{supTag}</span>}</dd></div>
              {delayMode === "auto" && ext !== "none" && live && activated === null && live.delayLeftS !== null && (
                <div className="flex justify-between gap-3"><dt className="text-ink-2">{t("System acts in")}</dt><dd className="tabular-nums">{t("{n} s (real-equivalent)", { n: fmt(live.delayLeftS, 0) })}</dd></div>
              )}
            </dl>
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-ink-2 hover:text-ink">{t("How is the spread speed built?")}</summary>
              <p className="mt-1 text-xs text-muted">{t("Speed = anchor × oxygen × airflow × gravity × material. Only the anchor is measured; the rest are modelling choices, shown here so you can judge them.")}</p>
              <ul className="mt-2 space-y-2">
                {spreadFactors(atm, material).factors.map((f) => (
                  <li key={f.key} className="text-xs">
                    <div className="flex items-baseline justify-between gap-2"><span className="text-ink">{t(f.label)}</span><span className="flex items-center gap-1.5"><strong className="tabular-nums text-ink">{f.key === "anchor" ? `${f.value.toFixed(1)} mm/s` : `×${f.value.toFixed(2)}`}</strong><span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${TAG[f.tag]}`}>{t(f.tag)}</span></span></div>
                    <p className="text-ink-2">{t(f.why)}</p>
                    <p className="text-[11px] text-muted">{t("Source:")} {t(f.src)}</p>
                  </li>
                ))}
              </ul>
            </details>
          </div>
          {/* each scene has its own catalog: the "fire site" and the whole-place views are different models (see lib/componentEnvs) */}
          {<ComponentPanel env={componentEnvKey(env, view)} api={sceneApi} atm={atm} pick={panelPick} condTag={estimatedEnv ? "estimated" : "reported"} labPhase={stats?.phase} />}
        </div>
      </div>

      {/* ---- conditions, material and suppression below ---- */}
      <div className="mt-5 grid items-start gap-4 md:grid-cols-2 lg:grid-cols-3">
          {!custom ? (
            <div className="card p-4">
              <h3 className="font-semibold">{t("{env}: fixed conditions", { env: t(ENV_NAME[env]) })}</h3>
              <ul className="mt-2 space-y-2.5">
                {(["o2", "p", "g", "flow"] as const).map((k) => {
                  const r = fixed.rows[k];
                  const name = t({ o2: "Oxygen", p: "Pressure", g: "Gravity", flow: "Airflow" }[k]);
                  return (
                    <li key={k} className="text-sm">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                        <span>{name}</span>
                        <span className="flex items-center gap-1.5"><strong className="tabular-nums">{t(r.value)}</strong><span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${TAG[r.tag]}`}>{t(r.tag)}</span></span>
                      </div>
                      <p className="text-xs text-ink-2">{t(r.eli5)}</p>
                      <p className="text-[11px] text-muted">{t("Source:")} {t(r.src)}</p>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 text-xs text-muted">{t("Want your own numbers? Press")} <strong>{t("Custom")}</strong>.</p>
            </div>
          ) : (
            <div id="fl3-custom" className="card p-4">
              <h3 className="font-semibold">{t("Custom conditions")}</h3>
              <p className="text-xs text-muted">{t("Your own values drive the simulation. Closing this panel returns to the fixed data of {env}.", { env: t(ENV_NAME[env]) })}</p>
              <div className="mt-3 space-y-4">
                <Slider id="c-o2" label={t("Oxygen (O₂)")} value={cond.o2} min={0.1} max={1} step={0.01} show={`${Math.round(cond.o2 * 100)}%`} onChange={(v) => setCond({ ...cond, o2: v })} note={cond.o2 > 0.34 ? t("Above 34 % no PSI test exists.") : undefined} />
                <Slider id="c-p" label={t("Pressure")} value={cond.pressureAtm} min={0.2} max={3.2} step={0.05} show={`${cond.pressureAtm.toFixed(2)} atm · ${(cond.pressureAtm * 14.696).toFixed(1)} psi`} onChange={(v) => setCond({ ...cond, pressureAtm: v })} />
                <Slider id="c-g" label={t("Gravity")} value={cond.gravityG} min={0} max={1} step={0.01} show={`${cond.gravityG.toFixed(2)} g`} onChange={(v) => setCond({ ...cond, gravityG: v })} note={cond.gravityG > 0.05 && cond.gravityG < 0.95 ? t("Partial gravity: extrapolation between 0 g and 1 g.") : undefined} />
                <Slider id="c-f" label={t("Forced airflow")} value={cond.flowCmS} min={0} max={50} step={1} show={`${cond.flowCmS} cm/s`} onChange={(v) => setCond({ ...cond, flowCmS: v })} />
                <Slider id="c-c" label={t("CO₂ suppressant")} value={coAmb.co2} min={0} max={AGENT_LIMIT.co2} step={0.01} show={`${Math.round(coAmb.co2 * 100)}%`} onChange={(v) => { setCoAmb({ co2: v, he: 0 }); if (v > 0) { setExt("co2"); setFrac(v); setActivated(null); } }} />
                <Slider id="c-h" label={t("He suppressant")} value={coAmb.he} min={0} max={AGENT_LIMIT.he} step={0.01} show={`${Math.round(coAmb.he * 100)}%`} onChange={(v) => { setCoAmb({ co2: 0, he: v }); if (v > 0) { setExt("he"); setFrac(v); setActivated(null); } }} />
                <p className="text-xs text-muted">{t("The suppressant sliders choose the agent and amount in the fire-suppression panel below; the fire only reacts when you activate it.")}</p>
                <label className="block text-sm">
                  <span>{t("Fuel droplet")}</span>
                  <select value={fuelDrop} onChange={(e) => setFuelDrop(e.target.value as "methanol" | "heptane")} className="mt-1 block w-full rounded-lg border border-line-2 bg-surface px-2 py-1.5">
                    <option value="methanol">{t("Methanol")}</option><option value="heptane">{t("Heptane")}</option>
                  </select>
                  <span className="text-xs text-muted">{t("FLEX burned droplets of these two fuels (PSI-69). It is the fuel of the extinction tests, not of the spreading surface. Selected: {fuel}.", { fuel: t(fuelDrop === "methanol" ? "Methanol" : "Heptane").toLowerCase() })}</span>
                </label>
              </div>
            </div>
          )}

          <div className="card p-4">
            <label className="block text-sm">
              <span className="font-semibold">{t("Material at the ignition point")}</span>
              <select value={material} onChange={(e) => { userPickedMaterial.current = true; setInferred(null); setMaterial(e.target.value as Material); }} className="mt-1 block w-full rounded-lg border border-line-2 bg-surface px-2 py-1.5">
                {(Object.keys(MATERIALS) as Material[]).map((m) => <option key={m} value={m}>{t(MATERIALS[m].label)}</option>)}
              </select>
            </label>
            <p className="mt-1 text-xs text-muted">{t("Evidence basis:")} {t(mat.basis)}. {material === "cable" ? t("No flame-spread data exists for cables; only smoke.") : ""}</p>
            {inferred && <p className="mt-1 text-xs text-amber-300">{t("Material guessed from the model part name “{name}” (estimated). Change it if you know better.", { name: inferred })}</p>}
            {live && <p className="mt-1 text-xs text-ink-2">{t("Surface hit:")} <span className="text-ink">{live.surfaceName || t("unnamed mesh")}</span></p>}
          </div>

          <div className="card p-4">
            <h3 className="font-semibold">{t("Fire suppression")}</h3>
            <p className="text-xs text-muted">{t("Choose how to fight this fire, then activate it. The effect is applied to the fire you started.")}</p>
            <label className="mt-3 block text-sm">
              <span>{t("System")}</span>
              <select value={ext} onChange={(e) => { setExt(e.target.value as Extinguisher); setActivated(null); }} className="mt-1 block w-full rounded-lg border border-line-2 bg-surface px-2 py-1.5">
                {(Object.keys(EXT_LABEL) as Extinguisher[]).map((k) => <option key={k} value={k}>{t(EXT_LABEL[k])}</option>)}
              </select>
            </label>
            {(ext === "co2" || ext === "he") && (
              <div className="mt-3">
                <Slider id="s-frac" label={t("Agent in the air")} value={agentFrac} min={0.01} max={AGENT_LIMIT[ext]} step={0.01} show={`${Math.round(agentFrac * 100)}%`} onChange={(v) => { setFrac(v); setActivated(null); }} note={t("Tested up to {n} % in FLEX.", { n: Math.round(AGENT_LIMIT[ext] * 100) })} />
              </div>
            )}
            {ext !== "none" && (
              <div className="mt-3 text-sm">
                <p>{t("Delay before it acts")}</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  <button onClick={() => { setDelayMode("manual"); setActivated(null); }} aria-pressed={delayMode === "manual"} className={`rounded-lg border px-3 py-1.5 ${delayMode === "manual" ? "border-accent bg-accent/15" : "border-line-2 text-ink-2"}`}>{t("I press Activate")}</button>
                  <button onClick={() => { setDelayMode("auto"); setActivated(null); }} aria-pressed={delayMode === "auto"} className={`rounded-lg border px-3 py-1.5 ${delayMode === "auto" ? "border-accent bg-accent/15" : "border-line-2 text-ink-2"}`}>{t("Automatic after…")}</button>
                </div>
                {delayMode === "auto" && <div className="mt-2"><Slider id="s-delay" label={t("Seconds after ignition")} value={delayS} min={0} max={600} step={5} show={`${delayS} s`} onChange={(v) => { setDelayS(v); setActivated(null); }} note={t("Real-equivalent seconds, set by you. The data do not say how long real systems take.")} /></div>}
              </div>
            )}
            <div className="mt-3 flex gap-2">
              <button onClick={activate} disabled={ext === "none" || !lit || active} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40">{t(active ? "Activated" : "Activate")}</button>
              {active && <button onClick={() => setActivated(null)} className="rounded-lg border border-line-2 px-3 py-2 text-sm text-ink-2 hover:text-ink">{t("Cancel")}</button>}
            </div>
            <p className="mt-3 text-sm font-medium" aria-live="polite">{t(active || ext === "none" ? sc.headline : "Press Activate to apply it.")}</p>
          </div>
      </div>

      <div className="card mt-5 p-4">
        <h3 className="font-semibold">{t("Why is this happening?")}</h3>
        <p className="text-xs text-muted">{t("Each statement carries its evidence tag and source. Counts for CO₂ and helium come from measured FLEX droplet tests (PSI-69, DOI 10.60555/mbq8-0451, 274 tests); FLEX burned droplets, not fabric, plastic or cables.")}</p>
        <ul className="mt-3 space-y-3">
          {sc.facts.map((f, i) => (
            <li key={i} className="text-sm">
              <span className={`mr-2 rounded px-1.5 py-0.5 text-[10px] font-medium ${TAG[f.tag]}`}>{t(f.tag)}</span>
              {factText(f, t)}
              {f.eli5 && <span className="mt-0.5 block text-xs text-ink-2">{t("ELI5:")} {t(f.eli5)}</span>}
              <span className="block text-[11px] text-muted">{t("Source:")} {t(f.src)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">
          <strong className="text-ink-2">{t("What is data and what is simulation:")}</strong> {t("the spread you watch is a simulation anchored to measured SAFFIRE points (about 1 to 2.6 mm/s on thin fabric in microgravity). The factors that scale it to other atmospheres (oxygen, airflow, gravity, material) are estimated, not fitted. Particles, area and speed shown above are produced by this engine. The measured rates are listed below with their PSI ID and DOI. No experiment gives a spread curve, and FLEX has no suppressant test above 25 % O₂.")}
        </p>
      </div>

      {onOpenEvidence && (
        <p className="mt-4 text-sm text-ink-2">
          {t("The rates NASA actually measured, with their PSI ID and DOI, are in the Evidence tab.")}{" "}
          <button onClick={onOpenEvidence} className="link">{t("Open Evidence")}</button>
        </p>
      )}
    </section>
  );
}
