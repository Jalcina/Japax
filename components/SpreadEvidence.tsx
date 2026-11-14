"use client";

import { useLang, useT } from "@/lib/i18n";
import { tr } from "@/lib/labI18n";
import { gravityClass, matchSpread, rangeCheck, spreadStatus, type EnvQuery } from "@/lib/spreadModel";

const T = {
  en: {
    eyebrow: "If something burns",
    title: "How would the fire spread here?",
    eli5: "Spread rate is how many millimetres per second the flame front eats into the material. Every number below was measured by NASA; JaPax does not draw curves between them.",
    measured: "measured",
    status: {
      measured: "NASA measured flames spreading in an atmosphere like this one. These are the only points that exist.",
      "atmosphere-gap": "Nobody measured a spread rate in this atmosphere (oxygen and pressure), even at the gravity of the tests. That gap is itself a finding.",
      "gravity-gap": "There is no experiment at this gravity. LUCI and FM2 will measure it; anything shown for it would be an extrapolation between 0 g and 1 g.",
    } as Record<string, string>,
    noSpread: "no spread",
    burned: "Burned length",
    time: "Burn time",
    flow: "Air flow",
    o2: "Oxygen",
    dir: "Flow direction",
    gravity: { micro: "Microgravity (ISS / Cygnus)", "1g": "Normal gravity (ground test)" } as Record<string, string>,
    nPoints: (n: number) => `${n} measured point${n === 1 ? "" : "s"} match this environment`,
    small: "Each condition was run once or twice. Treat these as examples, not as a law.",
    rangesTitle: "Which experiments were run in an atmosphere like this?",
    rangesNote: "Ranges are computed from the PSI tables. Inside the range only means that something was tested there, not that the result transfers to a material fire.",
    inO2: "oxygen inside range",
    outO2: "oxygen outside range",
    inP: "pressure inside range",
    outP: "pressure outside range",
    pUnknown: "pressure not in table",
    rows: "rows",
    kinds: { droplet: "liquid droplet", solid: "solid material", "gas flame": "gas flame" } as Record<string, string>,
    flowNote: "Flow sources differ:",
  },
  es: {
    eyebrow: "Si algo se quema",
    title: "¿Cómo se propagaría el fuego aquí?",
    eli5: "La velocidad de propagación son los milímetros por segundo que avanza el frente de llama sobre el material. Todos los números de abajo los midió la NASA; JaPax no dibuja curvas entre ellos.",
    measured: "medido",
    status: {
      measured: "La NASA midió llamas propagándose en una atmósfera como esta. Son los únicos puntos que existen.",
      "atmosphere-gap": "Nadie midió una velocidad de propagación en esta atmósfera (oxígeno y presión), ni siquiera a la gravedad de los ensayos. Ese hueco es un hallazgo.",
      "gravity-gap": "No hay ningún experimento a esta gravedad. LUCI y FM2 la medirán; cualquier cifra sería una extrapolación entre 0 g y 1 g.",
    } as Record<string, string>,
    noSpread: "sin propagación",
    burned: "Longitud quemada",
    time: "Tiempo de quemado",
    flow: "Flujo de aire",
    o2: "Oxígeno",
    dir: "Dirección del flujo",
    gravity: { micro: "Microgravedad (ISS / Cygnus)", "1g": "Gravedad normal (ensayo en tierra)" } as Record<string, string>,
    nPoints: (n: number) => `${n} punto${n === 1 ? "" : "s"} medido${n === 1 ? "" : "s"} coinciden con este entorno`,
    small: "Cada condición se ejecutó una o dos veces. Son ejemplos, no una ley.",
    rangesTitle: "¿Qué experimentos se hicieron en una atmósfera como esta?",
    rangesNote: "Los rangos se calculan desde las tablas de PSI. Estar dentro solo significa que se probó algo ahí, no que el resultado sirva para un incendio de materiales.",
    inO2: "oxígeno dentro del rango",
    outO2: "oxígeno fuera del rango",
    inP: "presión dentro del rango",
    outP: "presión fuera del rango",
    pUnknown: "presión no incluida en la tabla",
    rows: "filas",
    kinds: { droplet: "gota de líquido", solid: "material sólido", "gas flame": "llama de gas" } as Record<string, string>,
    flowNote: "Las fuentes difieren en el flujo:",
  },
};

const doi = (d: string) => `https://doi.org/${d}`;

export default function SpreadEvidence({ env }: { env: EnvQuery }) {
  const t = useT(T);
  const { lang } = useLang();
  const L = (x: string) => tr(lang, x);
  const status = spreadStatus(env);
  const pts = matchSpread(env);
  const gc = gravityClass(env.gravityG);
  const ranges = rangeCheck(env);
  const tone = status === "measured" ? "var(--a-suppression)" : "var(--crit)";

  return (
    <section className="mt-10" aria-labelledby="spread">
      <p className="eyebrow">{t.eyebrow}</p>
      <h2 id="spread" className="mt-1 text-xl font-semibold">{t.title}</h2>
      <p className="mt-2 max-w-3xl text-sm text-ink-2">{t.eli5}</p>

      <div className="card mt-4 p-4" style={{ borderColor: tone }} role="status">
        <p className="text-sm">{t.status[status]}</p>
        {status === "measured" && <p className="mt-1 text-xs text-muted">{t.nPoints(pts.length)}. {t.small}</p>}
      </div>

      {pts.length > 0 && (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {pts.map((p) => (
            <li key={p.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold">{p.program} · {p.id}</span>
                <span className="rounded bg-[color:var(--a-suppression)]/25 px-2 py-0.5 text-xs">{t.measured}</span>
              </div>
              <p className="mt-1 text-sm text-ink-2">{L(p.material)}, {p.thickness}</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {p.rateMmS === null ? t.noSpread : <>{p.rateMmS} <span className="text-sm font-normal text-ink-2">mm/s</span></>}
              </p>
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-ink-2">
                <dt>{t.burned}</dt><dd className="text-ink">{L(p.burnLengthCm)} cm</dd>
                {p.burnSec !== null && (<><dt>{t.time}</dt><dd className="text-ink">{p.burnSec} s</dd></>)}
                <dt>{t.flow}</dt><dd className="text-ink">{p.flowCmS} cm/s</dd>
                <dt>{t.o2}</dt><dd className="text-ink">{p.o2Pct[0] === p.o2Pct[1] ? p.o2Pct[0] : `${p.o2Pct[0]}-${p.o2Pct[1]}`}%</dd>
                <dt>{t.dir}</dt><dd className="text-ink">{L(p.direction)}</dd>
              </dl>
              <p className="mt-2 text-xs text-muted">{t.gravity[p.gravity]}</p>
              {p.flowNote && <p className="mt-1 text-xs text-muted">{t.flowNote} {L(p.flowNote)}</p>}
              {p.note && <p className="mt-1 text-xs text-muted">{L(p.note)}</p>}
              <p className="mt-2 text-xs text-muted">
                <a className="link" href={doi(p.doi)} target="_blank" rel="noreferrer">{p.psiId} · DOI {p.doi}</a> · {p.source}
              </p>
            </li>
          ))}
        </ul>
      )}

      <h3 className="mt-8 text-base font-semibold">{t.rangesTitle}</h3>
      <p className="mt-1 text-xs text-muted">{t.rangesNote}</p>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {ranges.map((r) => {
          const both = r.o2In && r.pIn !== false;
          return (
            <li key={r.id} className="card p-4" style={both ? { borderColor: "var(--a-suppression)" } : undefined}>
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold">{r.name}</span>
                <span className="text-xs text-muted">{t.kinds[r.kind]}</span>
              </div>
              <p className="mt-1 text-xs text-ink-2">
                O₂ {Math.round(r.o2[0] * 10) / 10}-{Math.round(r.o2[1] * 10) / 10}% ·{r.p ? `${r.p[0].toFixed(2)}-${r.p[1].toFixed(2)} atm` : t.pUnknown} · {r.rows} {t.rows}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                <span className={`rounded px-2 py-0.5 ${r.o2In ? "bg-[color:var(--a-suppression)]/25" : "bg-[color:var(--warn)]/20"}`}>{r.o2In ? t.inO2 : t.outO2}</span>
                {r.pIn !== null && <span className={`rounded px-2 py-0.5 ${r.pIn ? "bg-[color:var(--a-suppression)]/25" : "bg-[color:var(--warn)]/20"}`}>{r.pIn ? t.inP : t.outP}</span>}
              </div>
              <p className="mt-2 text-xs text-muted"><a className="link" href={doi(r.doi)} target="_blank" rel="noreferrer">{r.psiId} · DOI {r.doi}</a></p>
            </li>
          );
        })}
      </ul>
      {gc === "partial" && <p className="mt-3 text-xs text-muted">{t.status["gravity-gap"]}</p>}
    </section>
  );
}
