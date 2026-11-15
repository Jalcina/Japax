"use client";

import { useEffect, useRef, useState } from "react";
import { buildCsv, csvFileName } from "@/lib/componentCsv";
import { buildReportTxt, type RunRecord } from "@/lib/runRecord";
import PaxExplains from "@/components/PaxExplains";
import { useTr } from "@/lib/i18n";
import { END_REASON_ES, STATE_ES, TAG_ES } from "@/lib/componentEs";

/**
 * The results window of a finished run. Everything it shows comes from ONE RunRecord (lib/runRecord.ts), the same object that feeds the
 * CSV and the .txt report. Nothing is summarised away: when a datum does not exist the text says "not available" and why.
 * The window follows the page language (the record is rebuilt in Spanish by the panel); the CSV is always English, the .txt follows the page.
 */
const TAGC: Record<string, string> = {
  measured: "bg-emerald-500/15 text-emerald-300 border-emerald-400/50",
  reported: "bg-sky-500/15 text-sky-300 border-sky-400/50",
  predicted: "bg-violet-500/15 text-violet-300 border-violet-400/50",
  estimated: "bg-amber-500/15 text-amber-300 border-amber-400/50",
};
const GLOSSARY: Record<string, string> = {
  measured: "Measured: a value taken from an experiment in the NASA archives (PSI or NTRS).",
  reported: "Reported: stated by the authors of an experiment or document, with its source.",
  predicted: "Predicted: our model calibrated with nearby measured data, shown as a range.",
  estimated: "Estimated: our own model or an assumption with no nearby data; never mixed with measured data.",
  "ignition point": "The component where the fire was started by the user.",
  "front speed": "How fast the flame front crosses from one component to the next, in mm/s.",
  "heating window": "The assumed time an energetic component can be heated before it fails. It is an assumption, not a dataset.",
  "not reached": "The fire never ignited this component during the run.",
  "end reason": "Why the run stopped: extinguished by a measure, self-extinguished, burned out, ruptured and settled, or the look-ahead limit.",
};
/** the dotted terms as shown (the glossary keys stay English) */
const TERM_ES: Record<string, string> = {
  "ignition point": "punto de ignición", "front speed": "velocidad del frente", "heating window": "ventana de calentamiento", "not reached": "no alcanzado", "end reason": "motivo de fin",
};
const RUPTURE_STATUS_ES: Record<string, string> = { heating: "calentándose", ruptured: "roto", relieved: "presión aliviada", none: "ninguno" };
/** the chart rows are narrow: drop the trailing parenthesis of a component name */
const shortName = (n: string) => n.replace(/\s*\([^()]*\)\s*$/, "");
const f1 = (n: number) => (Math.round(n * 10) / 10).toString();

export function downloadText(name: string, text: string, mime: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function Term({ k, children }: { k: string; children?: React.ReactNode }) {
  const { lang, t } = useTr();
  const shown = children ?? (lang === "es" ? TERM_ES[k] ?? k : k);
  const gloss = t(GLOSSARY[k]);
  return <abbr title={gloss} tabIndex={0} aria-label={`${typeof shown === "string" ? shown : k}: ${gloss}`} className="cursor-help underline decoration-dotted underline-offset-2">{shown}</abbr>;
}
function Tag({ tag }: { tag: string }) {
  const { lang } = useTr();
  return <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${TAGC[tag] ?? TAGC.estimated}`}>{lang === "es" ? TAG_ES[tag] ?? tag : tag}</span>;
}

/** Gantt of when each component burned, with measure / rupture / end marks, and the curve of components reached over time. Plain SVG. */
function RunChart({ run }: { run: RunRecord }) {
  const { t, X } = useTr();
  const W = 680, left = 190, right = 14, top = 22, rowH = 20;
  const T = Math.max(run.endT, 1);
  const x = (s: number) => left + (s / T) * (W - left - right);
  const gH = run.components.length * rowH;
  const cTop = top + gH + 36, cH = 80;
  const H = cTop + cH + 34;
  const rupt = run.events.find((e) => e.state === "ruptured");
  const firstReach = run.components.map((c) => c.ignitionS).filter((v): v is number => v !== null).sort((a, b) => a - b);
  const steps = firstReach.map((s, i) => ({ t: s, n: i + 1 }));
  const maxN = Math.max(1, run.componentCount);
  const cy = (n: number) => cTop + cH - (n / maxN) * cH;
  const path = steps.length ? `M ${x(0)} ${cy(0)} ` + steps.map((s, i) => `L ${x(s.t)} ${cy(i)} L ${x(s.t)} ${cy(s.n)}`).join(" ") + ` L ${x(run.endT)} ${cy(steps.length)}` : "";
  const measures = Object.entries(run.measuresApplied);
  const ticks = [0, T / 2, T];
  const notReached = t("not reached");
  return (
    <figure className="my-2">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby="chart-title chart-desc" className="w-full" style={{ maxHeight: 520 }}>
        <title id="chart-title">{t("When each component burned, and how many components the fire reached over time")}</title>
        <desc id="chart-desc">{t("{n} of {total} components ignited. The run ended at {s} seconds ({reason}). The same data is in the Components and Timeline tables.", { n: steps.length, total: run.componentCount, s: f1(run.endT), reason: run.endReason })}</desc>
        <text x={left} y={12} fontSize="10" fill="currentColor">{t("Time of burning per component (s)")}</text>
        {run.components.map((c, i) => {
          const y = top + i * rowH;
          return (
            <g key={c.id}>
              <text x={left - 6} y={y + 13} fontSize="10" textAnchor="end" fill="currentColor">{shortName(c.name).length > 30 ? shortName(c.name).slice(0, 29) + "…" : shortName(c.name)}</text>
              <rect x={left} y={y + 3} width={W - left - right} height={rowH - 6} fill="currentColor" opacity="0.07" />
              {c.ignitionS !== null
                ? <rect x={x(c.ignitionS)} y={y + 3} width={Math.max(3, x(run.endT) - x(c.ignitionS))} height={rowH - 6} fill="#f97316" stroke="#fdba74"><title>{t("{name}: burning from {a} s to {b} s", { name: c.name, a: f1(c.ignitionS), b: f1(run.endT) })}</title></rect>
                : <text x={left + 6} y={y + 13} fontSize="9" fill="currentColor" opacity="0.7">{notReached}</text>}
              {c.finalState === "ruptured" && rupt && <text x={x(rupt.t)} y={y + 14} fontSize="13" textAnchor="middle" fill="#ef4444" fontWeight="bold">✕<title>{t("Rupture at {s} s", { s: f1(rupt.t) })}</title></text>}
            </g>
          );
        })}
        {measures.map(([id, at]) => (
          <g key={id}><line x1={x(at)} x2={x(at)} y1={top - 4} y2={cTop + cH} stroke="#38bdf8" strokeDasharray="4 3" /><text x={x(at) + 3} y={top - 8} fontSize="9" fill="#38bdf8">M</text><title>{t("Measure {id} applied at {s} s", { id: X(id), s: f1(at) })}</title></g>
        ))}
        <line x1={x(run.endT)} x2={x(run.endT)} y1={top - 4} y2={cTop + cH} stroke="currentColor" strokeWidth="1.5" />
        <text x={x(run.endT) - 3} y={top - 8} fontSize="9" textAnchor="end" fill="currentColor">{t("end")}</text>
        <text x={left} y={cTop - 8} fontSize="10" fill="currentColor">{t("Components reached (count)")}</text>
        <rect x={left} y={cTop} width={W - left - right} height={cH} fill="currentColor" opacity="0.07" />
        {path && <path d={path} fill="none" stroke="#f97316" strokeWidth="2" />}
        <text x={left - 6} y={cTop + 8} fontSize="9" textAnchor="end" fill="currentColor">{maxN}</text>
        <text x={left - 6} y={cTop + cH} fontSize="9" textAnchor="end" fill="currentColor">0</text>
        {ticks.map((s, i) => <text key={i} x={x(s)} y={cTop + cH + 14} fontSize="9" textAnchor={i === 0 ? "start" : i === 2 ? "end" : "middle"} fill="currentColor">{f1(s)} s</text>)}
        <text x={left} y={H - 4} fontSize="9" fill="currentColor" opacity="0.8">{t("Simulated seconds (equal to real-equivalent seconds in this engine)")}</text>
      </svg>
      <figcaption className="text-[11px] text-ink-2">
        {t("Legend: orange bar = component burning (text “not reached” = never ignited);")} <span className="text-sky-300">{t("M dashed line = measure applied")}</span>; <span className="text-red-300">{t("✕ = rupture")}</span>; {t("vertical line “end” = end of the run.")}
      </figcaption>
    </figure>
  );
}

const TABS = ["Summary", "Timeline", "Components", "Measures", "Evidence and gaps"] as const;
type TabName = (typeof TABS)[number];

export default function ResultsDialog({ run, runEn, sessionRuns, onClose, onLightAgain }: { run: RunRecord; runEn: () => RunRecord; sessionRuns: () => RunRecord[]; onClose: () => void; onLightAgain: () => void }) {
  const { lang, t, X } = useTr();
  const [tab, setTab] = useState<TabName>("Summary");
  const box = useRef<HTMLDivElement>(null);
  const back = useRef<Element | null>(null);
  const stateName = (s: string) => (lang === "es" ? STATE_ES[s] ?? s : s);
  const na = t("not available");

  // focus: move into the dialog, trap Tab, close on Esc, give the focus back on close
  useEffect(() => {
    back.current = document.activeElement;
    box.current?.focus();
    return () => { (back.current as HTMLElement | null)?.focus?.(); };
  }, []);
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.stopPropagation(); onClose(); return; }
    if (e.key !== "Tab" || !box.current) return;
    const f = [...box.current.querySelectorAll<HTMLElement>('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === box.current)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  const th = "px-2 py-1 text-left font-semibold align-bottom";
  const td = "px-2 py-1 align-top";
  const rupt = run.rupture && run.rupture.status !== "none" ? run.rupture : null;
  const endReason = lang === "es" ? END_REASON_ES[run.endReason] ?? run.endReason : run.endReason;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-2 sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={box} role="dialog" aria-modal="true" aria-labelledby="results-title" tabIndex={-1} onKeyDown={onKey}
        className="flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-line-2 bg-surface text-ink shadow-2xl outline-none" data-testid="results-dialog">
        <div className="flex items-start justify-between gap-2 border-b border-line p-3">
          <div>
            <h2 id="results-title" className="text-base font-semibold">{t("Simulation results")} · {run.runId}</h2>
            <p className="text-xs text-ink-2"><Term k="end reason">{t("Ended")}</Term> {t("at t = {s} s", { s: f1(run.endT) })} · {endReason} · {t("simulation, not a measurement")}</p>
          </div>
          <button onClick={onClose} className="min-h-9 rounded-lg border border-line-2 px-3 py-1.5 text-sm" data-testid="results-close">{t("Close")}</button>
        </div>
        <div role="tablist" aria-label={t("Result sections")} className="flex flex-wrap gap-1 border-b border-line px-3 pt-2">
          {TABS.map((tb) => (
            <button key={tb} role="tab" id={`tab-${tb}`} aria-selected={tab === tb} aria-controls="results-panel" onClick={() => setTab(tb)}
              className={`min-h-9 rounded-t-lg border border-b-0 px-3 py-1.5 text-xs ${tab === tb ? "border-accent bg-accent/15 text-ink" : "border-line text-ink-2"}`}>{t(tb)}</button>
          ))}
        </div>
        <div id="results-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="min-h-0 flex-1 overflow-auto p-3 text-xs">
          {tab === "Summary" && (
            <div className="space-y-3">
              <PaxExplains run={run} />
              <ul className="list-disc space-y-1 pl-4 text-sm" data-testid="summary-lines">{run.summary.map((s, i) => <li key={i}>{s}</li>)}</ul>
              <RunChart run={run} />
              <h3 className="text-sm font-semibold">{t("Metrics")}</h3>
              <div className="overflow-x-auto"><table className="w-full min-w-[520px] border-collapse" data-testid="metrics-table">
                <thead><tr className="border-b border-line"><th className={th}>{t("Metric")}</th><th className={th}>{t("Value")}</th><th className={th}>{t("Unit")}</th><th className={th}>{t("Note")}</th></tr></thead>
                <tbody>{run.metrics.map((m) => <tr key={m.key} className="border-b border-line/60"><td className={td}>{m.label} <span className="text-muted">({m.key})</span></td><td className={`${td} tabular-nums font-medium`}>{m.key === "end_reason" ? endReason : m.value}</td><td className={td}>{m.unit}</td><td className={`${td} text-ink-2`}>{m.note}</td></tr>)}</tbody>
              </table></div>
              <h3 className="text-sm font-semibold">{t("Rupture")}</h3>
              {rupt ? (
                <ul className="list-disc space-y-1 pl-4">
                  <li>{t("Status:")} <strong>{lang === "es" ? RUPTURE_STATUS_ES[rupt.status] ?? rupt.status : rupt.status}</strong> · {X(rupt.tankLabel)}{rupt.forced ? t(" (forced demo scenario, not a prediction)") : ""}</li>
                  <li>{t("Fire path to the component:")} {rupt.chain.map((c) => `${X(c.label)} ${f1(c.t)} s`).join(" → ") || na}</li>
                  <li>{t("Heated for:")} {rupt.exposureS === null ? na : `${f1(rupt.exposureS)} s`} · {t("assumed")} <Term k="heating window" /> {rupt.window[0]}-{rupt.window[1]} s, {t("mid-point")} {f1(rupt.usedS)} s <Tag tag="estimated" /></li>
                  <li>{t("Rupture at:")} {rupt.ruptureAt === null ? t("not available (no rupture in this run)") : `${f1(rupt.ruptureAt)} s`}</li>
                  <li>{t("Neighbours hit:")} {rupt.consequences.map((c) => `${X(c.label)} (${stateName(c.state).toLowerCase()}, ${f1(c.t)} s)`).join("; ") || t("none inside the declared radius")}</li>
                  <li>{t("Why: the stored oxygen feeds the combustion and holds the pressure; it is not the cause by itself. The model counts heating of the vessel against an assumed window.")}</li>
                </ul>
              ) : <p>{run.rupture ? t("No energetic component was reached in this run.") : t("not available: this environment has no verified energetic component, so no rupture can occur in the model.")}</p>}
            </div>
          )}
          {tab === "Timeline" && (
            <div className="overflow-x-auto"><table className="w-full min-w-[640px] border-collapse" data-testid="timeline-table">
              <caption className="pb-1 text-left text-ink-2">{t("All {n} events of the run, in order (t in simulated seconds)", { n: run.timeline.length })}</caption>
              <thead><tr className="border-b border-line"><th className={th}>t (s)</th><th className={th}>{t("Component")}</th><th className={th}>{t("State")}</th><th className={th}>{t("Level")}</th><th className={th}>{t("Source")}</th><th className={th}>{t("Reason")}</th></tr></thead>
              <tbody>{run.timeline.map((e, i) => <tr key={i} className="border-b border-line/60"><td className={`${td} tabular-nums`}>{f1(e.t)}</td><td className={td}>{e.component}</td><td className={td}>{stateName(e.state)}</td><td className={td}><Tag tag={e.level} /></td><td className={`${td} text-ink-2`}>{e.source}</td><td className={`${td} text-ink-2`}>{e.reason}</td></tr>)}</tbody>
            </table></div>
          )}
          {tab === "Components" && (
            <div className="overflow-x-auto"><table className="w-full min-w-[760px] border-collapse" data-testid="components-table">
              <caption className="pb-1 text-left text-ink-2">{t("All {n} components, including those the fire never reached", { n: run.components.length })}</caption>
              <thead><tr className="border-b border-line"><th className={th}>{t("Component")}</th><th className={th}>{t("Material class")}</th><th className={th}>{t("Final state")}</th><th className={th}>{t("Ignition (s)")}</th><th className={th}>{t("Burning for (s)")}</th><th className={th}>{t("Spread from")}</th><th className={th}>{t("Damage")}</th><th className={th}>{t("Note")}</th></tr></thead>
              <tbody>{run.components.map((c) => <tr key={c.id} className="border-b border-line/60"><td className={td}>{c.name}<br /><span className="text-muted">{c.id}</span></td><td className={td}>{c.material}</td><td className={td}>{c.finalState === "not_reached" ? <Term k="not reached" /> : stateName(c.finalState)}</td><td className={`${td} tabular-nums`}>{c.ignitionS === null ? na : f1(c.ignitionS)}</td><td className={`${td} tabular-nums`}>{c.burningS === null ? na : f1(c.burningS)}</td><td className={td}>{c.propagatedFrom}</td><td className={td}>{c.damage}</td><td className={`${td} text-ink-2`}>{c.note}</td></tr>)}</tbody>
            </table></div>
          )}
          {tab === "Measures" && (
            <div className="space-y-2" data-testid="measures-list">
              <p className="text-ink-2">{t("Applied and offered measures. Every effect is an engineering proposal (hypothesis) unless the tag says otherwise.")}</p>
              {run.measures.map((m) => (
                <div key={m.id} className="rounded-lg border border-line p-2">
                  <p className="font-medium">{m.status === "applied" ? t("Applied at t = {s} s", { s: f1(m.atS ?? 0) }) : t("Offered, not applied")} · {m.ladder}</p>
                  <p>{m.action}</p>
                  <p className="text-ink-2"><Tag tag={m.tag} /> {m.effect} <span className="text-muted">{t("Source:")} {m.source}</span></p>
                </div>
              ))}
            </div>
          )}
          {tab === "Evidence and gaps" && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">{t("Conditions and assumptions")}</h3>
              <ul className="list-disc space-y-0.5 pl-4">
                <li>{t("Start component:")} {run.startLabel} ({t("ignition point chosen by the user")})</li>
                <li>{t("Oxygen")}: {Math.round(run.atm.o2 * 100)} % <Tag tag={run.atmTag} /> · {t("pressure")} {(run.atm.pressureAtm * 14.696).toFixed(1)} psi ({run.atm.pressureAtm} atm) · {t("gravity")} {run.atm.gravityG} g · {t("airflow")} {run.atm.flowCmS} cm/s</li>
                <li>{t("Mode:")} {run.forced ? t("forced failure (demo scenario, not a prediction)") : t("physical path")} · {t("measured-only switch:")} {run.measuredOnly ? t("on") : t("off")}</li>
              </ul>
              <h3 className="text-sm font-semibold">{t("Model factors (origin material)")}</h3>
              <ul className="space-y-1">{run.factors.map((f) => <li key={f.name}><Tag tag={f.tag} /> <strong>{f.name}</strong> = {f.value} <span className="text-ink-2">{f.source}</span></li>)}</ul>
              <h3 className="text-sm font-semibold">{t("Safety ladder")}</h3>
              <ul className="space-y-1">{run.phases.map((p) => <li key={p.phase}><strong>{p.phase}:</strong> {p.walked}<br /><span className="text-ink-2">{t("Evidence:")} {p.evidence}</span></li>)}</ul>
              <h3 className="text-sm font-semibold">{t("Data gaps of this environment")}</h3>
              <ul className="list-disc space-y-1 pl-4 text-ink-2">{run.gaps.map((g, i) => <li key={i}>{g}</li>)}</ul>
              <h3 className="text-sm font-semibold">{t("Legend of levels and glossary")}</h3>
              <ul className="space-y-1">{(["measured", "reported", "predicted", "estimated"] as const).map((k) => <li key={k}><Tag tag={k} /> <span className="text-ink-2">{t(GLOSSARY[k])}</span></li>)}</ul>
              <p className="text-ink-2">{t("Terms:")} <Term k="ignition point" />, <Term k="front speed" />, <Term k="heating window" />, <Term k="not reached" />, <Term k="end reason" /> {t("(hover or focus a dotted term for its meaning).")}</p>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-line p-3 text-xs">
          <button onClick={() => downloadText(csvFileName(run.env).replace(".csv", `-${run.runId}.csv`), buildCsv([runEn()]), "text/csv;charset=utf-8")} className="min-h-9 rounded-lg border border-line-2 px-3 py-1.5" data-testid="dl-run-csv">{t("Download this run (.csv)")}</button>
          <button onClick={() => downloadText(csvFileName(run.env), buildCsv(sessionRuns()), "text/csv;charset=utf-8")} className="min-h-9 rounded-lg border border-line-2 px-3 py-1.5" data-testid="dl-all-csv">{t("Download all session runs (.csv)")}</button>
          <button onClick={() => downloadText(`japax-report-${run.env}-${run.runId}.txt`, buildReportTxt(run, lang), "text/plain;charset=utf-8")} className="min-h-9 rounded-lg border border-line-2 px-3 py-1.5" data-testid="dl-report">{t("Download report (.txt)")}</button>
          <button onClick={() => { onClose(); onLightAgain(); }} className="ml-auto min-h-9 rounded-lg bg-accent px-3 py-1.5 font-semibold text-black" data-testid="light-again">{t("Light it again")}</button>
        </div>
      </div>
    </div>
  );
}
