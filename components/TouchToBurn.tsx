"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import EnvironmentStage from "./EnvironmentStage";
import type { ImmersiveEnv } from "./ImmersiveScene";
import { AGENT_LIMIT, AIRFLOW, MATERIALS, factText, scenario, type Airflow, type Atmos, type Extinguisher, type Material, type Tag } from "@/lib/fireCases";

/**
 * Touch to burn (PROVISIONAL). Tap a surface in the scene: the fire starts there. Pick what it is made of, the airflow, an
 * extinguishing action and how long you wait before acting. Every statement shown carries an evidence tag and a source;
 * the animation is an illustration, not a measurement.
 */
const TAG_STYLE: Record<Tag, string> = {
  measured: "bg-emerald-500/15 text-emerald-300",
  reported: "bg-sky-500/15 text-sky-300",
  predicted: "bg-violet-500/15 text-violet-300",
  estimated: "bg-amber-500/15 text-amber-300",
};

/** bends the flame in the scene; relative illustration values (the three flow regimes), not cm/s */
const WIND: Record<Airflow, [number, number, number]> = { still: [0, 0, 0], low: [0.05, 0, 0], moderate: [0.2, 0, 0] };

const EXT_LABEL: Record<Extinguisher, string> = {
  none: "Do nothing",
  "vent-off": "Cut ventilation",
  co2: "CO₂ (ISS extinguisher)",
  he: "Helium dilution",
  depressurize: "Vent the cabin",
};

export default function TouchToBurn({ env, atm }: { env: Exclude<ImmersiveEnv, "mars">; atm: Atmos }) {
  const [material, setMaterial] = useState<Material>("fabric");
  const [airflow, setAirflow] = useState<Airflow>("low");
  const [ext, setExt] = useState<Extinguisher>("co2");
  const [frac, setFrac] = useState(0.3);
  const [delayS, setDelayS] = useState(5);
  const [applied, setApplied] = useState(false);
  const [touched, setTouched] = useState(false);
  const [open, setOpen] = useState(false);
  const [round, setRound] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sc = useMemo(() => scenario({ atm, env, material, airflow, ext, frac, delayS }), [atm, env, material, airflow, ext, frac, delayS]);

  // (re)start the clock whenever the fire is lit again or the plan changes
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    setApplied(false);
    if (ext === "none") return;
    timer.current = setTimeout(() => setApplied(true), delayS * 1000);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [round, ext, delayS, material, airflow, frac]);

  // flame vitality 0..1 (ILLUSTRATION, not a measured growth curve): grows while you wait, then falls or holds after the action
  const [life, setLife] = useState(0.3);
  useEffect(() => {
    if (!touched) return;
    const t0 = performance.now();
    const growS = Math.max(ext === "none" ? 10 : delayS, 3);
    const id = setInterval(() => {
      const s = (performance.now() - t0) / 1000;
      if (!applied) setLife(0.3 + 0.7 * Math.min(1, s / growS));
      else setLife(sc.fate === "extinguish" ? Math.max(0, 1 - s / 3) : sc.fate === "unknown" ? 0.6 : 1);
    }, 100);
    return () => clearInterval(id);
  }, [touched, applied, round, ext, delayS, sc.fate]);
  const fate = applied ? sc.fate : "burn";
  const maxFrac = ext === "co2" || ext === "he" ? AGENT_LIMIT[ext] : 0;

  return (
    <section className="mt-12" aria-labelledby="ttb">
      <h2 id="ttb" className="text-xl font-semibold">Touch to burn</h2>
      <p className="mt-1 text-sm text-ink-2">
        Tap any surface in the scene to start a fire there, then choose the material, the airflow and how you fight it.
        The flame is an illustration; the evidence tags show what is measured and what is not.
      </p>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="card overflow-hidden p-0">
          {open ? (
            <EnvironmentStage
              env={env}
              className="h-[56vh] min-h-[360px]"
              fire={{ g: atm.gravityG ?? 0, o2: atm.o2, pressureAtm: atm.pressureAtm, fuel: sc.fuel, fate, wind: WIND[airflow] }}
              life={touched ? life : null}
              onPick={() => { setTouched(true); setRound((r) => r + 1); }}
            />
          ) : (
            <div className="grid h-[56vh] min-h-[360px] place-items-center bg-black/40 p-6 text-center">
              <div>
                <p className="text-sm text-ink-2">The 3D scene loads on demand (the ISS model is about 15 MB).</p>
                <button className="mt-3 rounded-md bg-sky-500/80 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500" onClick={() => setOpen(true)}>Load the 3D scene</button>
              </div>
            </div>
          )}
          <p className="px-4 py-2 text-xs text-muted" role="status" aria-live="polite">
            {touched ? (applied ? `${EXT_LABEL[ext]} applied after ${delayS} s.` : ext === "none" ? "The fire keeps burning." : `Acting in ${delayS} s…`) : "Tap a surface to light a fire."}
          </p>
        </div>

        <div className="card p-5">
          <label className="block text-xs font-semibold uppercase tracking-wide text-muted" htmlFor="ttb-mat">What is it made of?</label>
          <select id="ttb-mat" className="mt-1 w-full rounded-md border border-white/15 bg-transparent p-2 text-sm" value={material} onChange={(e) => setMaterial(e.target.value as Material)}>
            {Object.entries(MATERIALS).map(([k, m]) => <option key={k} value={k} className="text-black">{m.label}</option>)}
          </select>
          <p className="mt-1 text-xs text-muted">Basis: {MATERIALS[material].basis}</p>

          <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-muted" htmlFor="ttb-air">Airflow around the fire</label>
          <select id="ttb-air" className="mt-1 w-full rounded-md border border-white/15 bg-transparent p-2 text-sm" value={airflow} onChange={(e) => setAirflow(e.target.value as Airflow)}>
            {Object.entries(AIRFLOW).map(([k, a]) => <option key={k} value={k} className="text-black">{a.label}</option>)}
          </select>

          <fieldset className="mt-4">
            <legend className="text-xs font-semibold uppercase tracking-wide text-muted">What do you do?</legend>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {(Object.keys(EXT_LABEL) as Extinguisher[]).map((k) => (
                <label key={k} className={`cursor-pointer rounded-md border p-2 text-center text-xs ${ext === k ? "border-sky-400 bg-sky-400/10" : "border-white/15"}`}>
                  <input type="radio" name="ttb-ext" className="sr-only" checked={ext === k} onChange={() => setExt(k)} />
                  {EXT_LABEL[k]}
                </label>
              ))}
            </div>
          </fieldset>

          {maxFrac > 0 && (
            <div className="mt-4">
              <label className="text-xs text-ink-2" htmlFor="ttb-frac">Agent in the air: {Math.round(Math.min(frac, maxFrac) * 100)} % (tested up to {Math.round(maxFrac * 100)} %)</label>
              <input id="ttb-frac" type="range" min={0.05} max={maxFrac} step={0.01} value={Math.min(frac, maxFrac)} onChange={(e) => setFrac(Number(e.target.value))} className="w-full" />
            </div>
          )}
          {ext !== "none" && (
            <div className="mt-4">
              <label className="text-xs text-ink-2" htmlFor="ttb-delay">Wait before acting: {delayS} s (your choice, not a measured response time)</label>
              <input id="ttb-delay" type="range" min={0} max={30} step={1} value={delayS} onChange={(e) => setDelayS(Number(e.target.value))} className="w-full" />
            </div>
          )}
          <button className="mt-4 w-full rounded-md bg-white/10 px-3 py-2 text-sm hover:bg-white/20" onClick={() => setRound((r) => r + 1)}>Light it again</button>
        </div>
      </div>

      <div className="card mt-4 p-5" aria-live="polite">
        <p className="eyebrow">Why did this happen?</p>
        <p className="mt-2 text-lg font-semibold">{sc.headline}</p>
        {sc.banners.map((b) => <p key={b} className="mt-2 rounded-md bg-amber-500/10 p-2 text-xs text-amber-200">{b}</p>)}
        <ul className="mt-3 space-y-3">
          {sc.facts.map((f, i) => (
            <li key={i} className="text-sm">
              <span className={`mr-2 rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase ${TAG_STYLE[f.tag]}`}>{f.tag}</span>
              {factText(f)}
              {f.eli5 && <span className="mt-1 block text-xs italic text-ink-2">In simple words: {f.eli5}</span>}
              <span className="mt-0.5 block text-xs text-muted">Source: {f.src}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
