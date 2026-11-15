"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n";
import type { Fuel } from "@/lib/flameEngine";
import { AGENT_MAX, burnFloor, suppressionEvidence, type Agent, type Tally } from "@/lib/suppression";

const T = {
  en: {
    eyebrow: "Suppression evidence",
    title: "Extinguishment and ignition-prevention margins",
    eli5: "Select an inert agent, its mole fraction and the O₂ level. JaPax shows the outcomes of NASA's measured tests under those conditions, always against the same atmosphere with no agent.",
    agent: "Agent",
    none: "No agent",
    co2: "Carbon dioxide (CO₂)",
    he: "Helium (He)",
    amount: "Agent in the air",
    oxygen: "Oxygen",
    fuelLabel: "Fuel",
    methanol: "Methanol",
    heptane: "Heptane",
    outside: "Outside the measured range, so there is no verdict and JaPax does not extrapolate:",
    issue: { o2: "oxygen", p: "pressure", co2: "CO₂", he: "helium" } as Record<string, string>,
    measuredTests: (n: number) => `${n} measured test${n === 1 ? "" : "s"}`,
    withAgent: "With this setting",
    baseline: "Same air, no agent",
    ext: "went out",
    dis: "droplet disruption (no extinction)",
    comp: "burned to completion (fuel exhausted)",
    tooFew: "Fewer than 3 tests are close to this setting, so a comparison would not be statistically meaningful.",
    better: (a: number, b: number) => `The flame went out in ${a}% of the tests with this setting versus ${b}% without an agent.`,
    nearest: (n: number, k: number) => `Of the ${n} closest tests, ${k} went out.`,
    howTitle: "Mitigation levers",
    h1: (f: string, no: number, any: number) => `Reduce the O₂ fraction. The lowest O₂ at which a measured ${f} droplet still kept burning was ${no}% without an agent (${any}% with one). No measured test burned below that.`,
    h2: "Control the opposed flow. In low gravity, flames over solids can persist at lower O₂ than 1-g theory predicts, with the most favourable conditions near 10 cm/s, a typical spacecraft ventilation velocity (NASA Researcher's Guide, 2015).",
    h3: "Specify the material. In SAFFIRE-II (PSI-99) silicone ignited but did not spread in microgravity, while cotton-fiberglass fabric burned its whole 29 cm at 2.1 to 2.6 mm/s.",
    h4: "Detect early. Smoke particle size measurements (SAME, SAME-R) are the design basis for detectors.",
    caveat: "Caveat: these are burning liquid droplets in microgravity, not a burning solid, and not partial gravity. The agent effect is only visible where enough tests exist. Methanol droplets often went out on their own, so a single extinction does not prove the agent worked.",
    src: "PSI-69 FLEX · DOI 10.60555/mbq8-0451 · outcomes defined in NASA/TP-2015-216046",
  },
  es: {
    eyebrow: "Evidencia de supresión",
    title: "Márgenes de extinción y de prevención de ignición",
    eli5: "Selecciona un agente inerte, su fracción molar y el nivel de O₂. JaPax muestra los resultados de los ensayos medidos por NASA en esas condiciones, siempre frente a la misma atmósfera sin agente.",
    agent: "Agente",
    none: "Sin agente",
    co2: "Dióxido de carbono (CO₂)",
    he: "Helio (He)",
    amount: "Agente en el aire",
    oxygen: "Oxígeno",
    fuelLabel: "Combustible",
    methanol: "Metanol",
    heptane: "Heptano",
    outside: "Fuera del rango medido: no hay veredicto y JaPax no extrapola:",
    issue: { o2: "oxígeno", p: "presión", co2: "CO₂", he: "helio" } as Record<string, string>,
    measuredTests: (n: number) => `${n} ensayo${n === 1 ? "" : "s"} medido${n === 1 ? "" : "s"}`,
    withAgent: "Con este ajuste",
    baseline: "Mismo aire, sin agente",
    ext: "se apagó",
    dis: "disrupción de la gota (sin extinción)",
    comp: "combustión completa (combustible agotado)",
    tooFew: "Hay menos de 3 ensayos cerca de este ajuste, por lo que una comparación no sería estadísticamente significativa.",
    better: (a: number, b: number) => `Se apagó en el ${a}% de los ensayos con este ajuste frente al ${b}% sin agente.`,
    nearest: (n: number, k: number) => `De los ${n} ensayos más cercanos, ${k} se apagaron.`,
    howTitle: "Palancas de mitigación",
    h1: (f: string, no: number, any: number) => `Reducir la fracción de O₂. El O₂ más bajo al que una gota de ${f} medida siguió ardiendo fue ${no}% sin agente (${any}% con agente). Ningún ensayo medido ardió por debajo.`,
    h2: "Controlar el flujo a contraflujo. En baja gravedad, las llamas sobre sólidos pueden persistir con menos O₂ del previsto a 1 g, con las condiciones más favorables cerca de 10 cm/s, una velocidad de ventilación típica de una nave (Guía NASA, 2015).",
    h3: "Especificar el material. En SAFFIRE-II (PSI-99) la silicona se encendió pero no se propagó en microgravedad, mientras el tejido de algodón-fibra de vidrio quemó sus 29 cm a 2.1-2.6 mm/s.",
    h4: "Detectar pronto. Las mediciones del tamaño de partículas de humo (SAME, SAME-R) son la base de diseño de los detectores.",
    caveat: "Salvedad: son gotas de líquido en combustión en microgravedad, no un sólido ardiendo, ni gravedad parcial. El efecto del agente solo se ve donde hay suficientes ensayos. Las gotas de metanol se apagaban a menudo solas, así que una extinción aislada no prueba que el agente funcionara.",
    src: "PSI-69 FLEX · DOI 10.60555/mbq8-0451 · desenlaces definidos en NASA/TP-2015-216046",
  },
};

const pct = (a: number, n: number) => (n ? Math.round((a / n) * 100) : 0);

function Bar({ label, t, n, tt }: { label: string; t: Tally; n: { ext: string; dis: string; comp: string }; tt: string }) {
  const e = pct(t.extinction, t.n), d = pct(t.disruption, t.n), c = Math.max(0, 100 - e - d);
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-xs text-muted">{tt}</span>
      </div>
      <div
        className="mt-1 flex h-4 w-full overflow-hidden rounded bg-surface-2"
        role="img"
        aria-label={`${label}: ${t.extinction} ${n.ext}, ${t.disruption} ${n.dis}, ${t.completion} ${n.comp}`}
      >
        {t.n > 0 && (
          <>
            <span style={{ width: `${e}%`, background: "var(--a-suppression)" }} />
            <span style={{ width: `${d}%`, background: "var(--crit)" }} />
            <span style={{ width: `${c}%`, background: "var(--muted)" }} />
          </>
        )}
      </div>
      <p className="mt-1 text-xs text-ink-2">
        <span style={{ color: "var(--a-suppression)" }}>■</span> {t.extinction} {n.ext} · <span style={{ color: "var(--crit)" }}>■</span> {t.disruption} {n.dis} · <span style={{ color: "var(--muted)" }}>■</span> {t.completion} {n.comp}
      </p>
    </div>
  );
}

export default function FireFighter({ env, fuel }: { env: { o2: number; pressureAtm: number }; fuel: Fuel }) {
  const t = useT(T);
  const [agent, setAgent] = useState<Agent>("co2");
  const [frac, setFrac] = useState(0.2);
  const [o2, setO2] = useState(Math.round(env.o2 * 100) / 100);

  const cap = agent === "none" ? 0 : AGENT_MAX[agent];
  const fr = agent === "none" ? 0 : Math.min(frac, cap);
  const ev = suppressionEvidence({ fuel, o2, pressureAtm: env.pressureAtm, agent, agentFrac: fr });
  const floor = burnFloor(fuel);
  const fuelName = fuel === "methanol" ? t.methanol : t.heptane;
  const nearestExt = ev.verdict.near.filter((x) => x.r.end === "Extinction").length;

  return (
    <section className="mt-12" aria-labelledby="ff">
      <p className="eyebrow">{t.eyebrow}</p>
      <h2 id="ff" className="mt-1 text-xl font-semibold">{t.title}</h2>
      <p className="mt-2 max-w-3xl text-sm text-ink-2">{t.eli5}</p>

      <div className="card mt-4 p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="text-sm">
            <span className="text-ink-2">{t.agent}</span>
            <select value={agent} onChange={(e) => setAgent(e.target.value as Agent)} className="mt-1 block w-full rounded-lg border border-line-2 bg-surface px-2 py-1.5 text-ink">
              <option value="none">{t.none}</option>
              <option value="co2">{t.co2}</option>
              <option value="he">{t.he}</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="text-ink-2">{t.amount}: <strong className="text-ink">{Math.round(fr * 100)}%</strong></span>
            <input type="range" min={0} max={cap} step={0.05} value={fr} disabled={agent === "none"} onChange={(e) => setFrac(Number(e.target.value))} className="mt-2 block w-full" />
          </label>
          <label className="text-sm">
            <span className="text-ink-2">{t.oxygen}: <strong className="text-ink">{Math.round(o2 * 100)}%</strong></span>
            <input type="range" min={0.1} max={0.4} step={0.01} value={o2} onChange={(e) => setO2(Number(e.target.value))} className="mt-2 block w-full" />
          </label>
        </div>
        <p className="mt-3 text-xs text-muted">{t.fuelLabel}: {fuelName} · {env.pressureAtm} atm</p>

        {!ev.verdict.inRange ? (
          <div className="mt-4 rounded-lg border p-3 text-sm" style={{ borderColor: "var(--crit)" }} role="status">
            {t.outside}
            <ul className="mt-1 list-disc pl-5 text-xs text-ink-2">
              {ev.verdict.issues.map((i) => (
                <li key={i.key}>{t.issue[i.key]}: {i.key === "p" ? `${i.value.toFixed(2)} atm (tested ${i.lo.toFixed(2)}-${i.hi.toFixed(2)})` : `${Math.round(i.value * 100)}% (tested ${Math.round(i.lo * 100)}-${Math.round(i.hi * 100)}%)`}</li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="mt-4 space-y-4" aria-live="polite">
            <Bar label={t.withAgent} t={ev.withAgent} n={{ ext: t.ext, dis: t.dis, comp: t.comp }} tt={t.measuredTests(ev.withAgent.n)} />
            <Bar label={t.baseline} t={ev.baseline} n={{ ext: t.ext, dis: t.dis, comp: t.comp }} tt={t.measuredTests(ev.baseline.n)} />
            <p className="text-sm">
              {ev.enough
                ? agent === "none"
                  ? t.nearest(ev.verdict.near.length, nearestExt)
                  : t.better(pct(ev.withAgent.extinction, ev.withAgent.n), pct(ev.baseline.extinction, ev.baseline.n))
                : t.tooFew}
            </p>
          </div>
        )}
        <p className="mt-3 text-xs text-muted">{t.src}</p>
      </div>

      <div className="card mt-4 p-4 sm:p-5">
        <h3 className="text-base font-semibold">{t.howTitle}</h3>
        <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-ink-2">
          <li>{t.h1(fuelName.toLowerCase(), Math.round(floor.noAgent * 100), Math.round(floor.anyAgent * 100))}</li>
          <li>{t.h2}</li>
          <li>{t.h3}</li>
          <li>{t.h4}</li>
        </ul>
        <p className="mt-3 text-xs text-muted">{t.caveat}</p>
      </div>
    </section>
  );
}
