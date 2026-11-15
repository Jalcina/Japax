"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { areaLabel, fmtRange, type Area, type Investigation } from "@/lib/data";
import { useData, useLang, useT } from "@/lib/i18n";
import { DEFAULT_WEIGHTS, levelLabel, scoreInvestigation } from "@/lib/scoring";
import { AreaBadge, Pending } from "@/components/ui";
import ScoreBar from "@/components/ScoreBar";

const AREAS: ("all" | Area)[] = ["all", "prevention", "detection", "suppression", "fundamental"];
type Sort = "score" | "name" | "files";

const T = {
  en: {
    eyebrow: "Explorer",
    title: "NASA combustion investigations",
    intro1: "investigations from the PSI repository, with their test conditions, findings and sources. Select up to three to compare them side by side.",
    filter: "Filter by area",
    all: "All",
    search: "Search: PMMA, smoke, heptane…",
    searchAria: "Search investigations",
    sort: "Sort",
    byScore: "Lunar relevance",
    byFiles: "Data available",
    byName: "Name",
    results: "results",
    pressure: "Pressure",
    airflow: "Airflow",
    compare: "Compare",
    compStart: "Compare experiments",
    compExit: "Exit compare",
    compHint: "Compare mode: tap “Select” on 2 or 3 experiments, then press Compare at the bottom.",
    compSelect: "Select",
    compSelected: "Selected ✓",
    compSelN: "selected",
    compGo: "Compare",
    compMin: "Pick at least 2",
    compMax: "Max 3",
    compClear: "Clear",
    compBack: "Back to list",
    bestRel: "Highest lunar relevance",
    cond: "Test conditions",
    scale: "Bars share one scale across the selected experiments. Faded end = open-ended range.",
    fuelsT: "Fuels",
    sensT: "Sensors",
    dataT: "Data in PSI",
    openRec: "Open investigation",
    compAria: "Investigation comparison",
    compTitle: "Comparison",
    attr: "Attribute",
    notV: "Not verified",
    rows: { phase: "Fuel phase", fuels: "Fuels", pressure: "Pressure", flow: "Airflow speed", sensors: "Sensors", hw: "Hardware", files: "Files in PSI", videos: "videos", rel: "Lunar relevance" },
  },
  es: {
    eyebrow: "Explorador",
    title: "Investigaciones de combustión de NASA",
    intro1: "investigaciones del repositorio PSI, con sus condiciones de ensayo, hallazgos y fuentes. Selecciona hasta tres para compararlas lado a lado.",
    filter: "Filtrar por área",
    all: "Todas",
    search: "Buscar: PMMA, humo, heptano…",
    searchAria: "Buscar investigaciones",
    sort: "Ordenar",
    byScore: "Relevancia lunar",
    byFiles: "Datos disponibles",
    byName: "Nombre",
    results: "resultados",
    pressure: "Presión",
    airflow: "Flujo de aire",
    compare: "Comparar",
    compStart: "Comparar experimentos",
    compExit: "Salir de comparar",
    compHint: "Modo comparar: pulsa «Seleccionar» en 2 o 3 experimentos y luego «Comparar» en la barra de abajo.",
    compSelect: "Seleccionar",
    compSelected: "Seleccionado ✓",
    compSelN: "seleccionados",
    compGo: "Comparar",
    compMin: "Elige al menos 2",
    compMax: "Máx. 3",
    compClear: "Limpiar",
    compBack: "Volver a la lista",
    bestRel: "Mayor relevancia lunar",
    cond: "Condiciones de ensayo",
    scale: "Las barras comparten escala entre los experimentos elegidos. Extremo difuminado = rango abierto.",
    fuelsT: "Combustibles",
    sensT: "Sensores",
    dataT: "Datos en PSI",
    openRec: "Abrir investigación",
    compAria: "Comparación de investigaciones",
    compTitle: "Comparación",
    attr: "Atributo",
    notV: "No verificado",
    rows: { phase: "Fase del combustible", fuels: "Combustibles", pressure: "Presión", flow: "Velocidad del flujo de aire", sensors: "Sensores", hw: "Hardware", files: "Archivos en PSI", videos: "vídeos", rel: "Relevancia lunar" },
  },
};

const COLORS = ["#f59e0b", "#38bdf8", "#a78bfa"];

type Rng = [number | null, number | null] | null;

function RangeRow({
  label,
  unit,
  scale,
  items,
  lang,
}: {
  label: string;
  unit: string;
  scale: number;
  items: { id: string; r: Rng }[];
  lang: "en" | "es";
}) {
  const nums = items.flatMap((x) => (x.r ? x.r.filter((v): v is number => v != null) : [])).map((v) => v * scale);
  const hi = nums.length ? Math.max(...nums) * 1.08 || 1 : 1;
  const pct = (v: number) => Math.max(0, Math.min(100, ((v * scale) / hi) * 100));
  return (
    <div className="border-t border-line py-4">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((x, k) => {
          const txt = fmtRange(x.r, unit, scale, lang);
          const a = x.r?.[0] ?? null;
          const b = x.r?.[1] ?? null;
          const left = a != null ? pct(a) : 0;
          const right = b != null ? pct(b) : 100;
          const width = Math.max(2.5, right - left);
          const c = COLORS[k];
          const fadeL = a == null && b != null;
          const fadeR = b == null && a != null;
          return (
            <div key={x.id}>
              <div className="text-sm font-semibold tabular-nums">{txt ? txt.trim() : <Pending />}</div>
              <div className="relative mt-2 h-3 rounded-full bg-line" aria-hidden="true">
                {txt && (
                  <div
                    className="absolute top-0 h-3 rounded-full"
                    style={{
                      left: `${left}%`,
                      width: `${Math.min(width, 100 - left)}%`,
                      background: fadeL
                        ? `linear-gradient(90deg, transparent, ${c})`
                        : fadeR
                          ? `linear-gradient(90deg, ${c}, transparent)`
                          : c,
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Chips({ items, color }: { items: string[]; color: string }) {
  if (!items.length) return <Pending />;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((x) => (
        <span
          key={x}
          className="rounded-full border px-2 py-0.5 text-xs text-ink-2"
          style={{ borderColor: color + "88", background: color + "18" }}
        >
          {x}
        </span>
      ))}
    </div>
  );
}

function ComparePanel({ compare, onBack }: { compare: Investigation[]; onBack: () => void }) {
  const t = useT(T);
  const { lang } = useLang();
  const loc = lang === "es" ? "es" : "en";
  const scores = compare.map((c) => scoreInvestigation(c).total);
  const best = Math.max(...scores);
  const maxFiles = Math.max(...compare.map((c) => c.files.total), 1);
  const cols = { gridTemplateColumns: `repeat(${compare.length}, minmax(0, 1fr))` };
  return (
    <section id="compare-section" className="card mt-10 scroll-mt-20 overflow-x-auto p-4 sm:p-6" aria-label={t.compAria}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{t.compTitle}</h2>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-lg border border-accent bg-accent px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90"
        >
          <span aria-hidden>←</span>
          {t.compBack}
        </button>
      </div>

      <div className="min-w-[36rem]">
        <div className="mt-5 grid gap-3" style={cols}>
          {compare.map((c, k) => {
            const sc = scores[k];
            const isBest = sc === best;
            return (
              <div key={c.id} className="rounded-xl border p-4" style={{ borderColor: COLORS[k], background: COLORS[k] + "12" }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="mb-1 block h-1.5 w-8 rounded-full" style={{ background: COLORS[k] }} aria-hidden="true" />
                    <Link href={`/explorer/${c.id}`} className="block truncate text-lg font-semibold hover:underline">
                      {c.acronym}
                    </Link>
                    <p className="text-xs text-muted">
                      {c.psiId} · {c.fuelPhase}
                    </p>
                  </div>
                  <div
                    className="grid h-16 w-16 shrink-0 place-items-center rounded-full"
                    style={{ background: `conic-gradient(${COLORS[k]} ${sc * 3.6}deg, rgba(128,128,128,0.25) 0deg)` }}
                    role="img"
                    aria-label={`${t.rows.rel}: ${sc.toFixed(0)} / 100`}
                  >
                    <div className="grid h-12 w-12 place-items-center rounded-full bg-surface text-lg font-semibold tabular-nums">
                      {sc.toFixed(0)}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.areas.map((a) => (
                    <AreaBadge key={a} area={a} />
                  ))}
                </div>
                {isBest && (
                  <p className="mt-3 inline-block rounded-full bg-accent/20 px-2.5 py-0.5 text-xs font-semibold text-ink">
                    ★ {t.bestRel}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <h3 className="mt-6 text-sm font-semibold">{t.cond}</h3>
        <RangeRow label="O₂ (%)" unit="%" scale={100} lang={lang} items={compare.map((c) => ({ id: c.id, r: c.conditions.o2 }))} />
        <RangeRow label={t.rows.pressure} unit="atm" scale={1} lang={lang} items={compare.map((c) => ({ id: c.id, r: c.conditions.pressureAtm }))} />
        <RangeRow label={t.rows.flow} unit="cm/s" scale={1} lang={lang} items={compare.map((c) => ({ id: c.id, r: c.conditions.flowCmS }))} />
        <p className="pb-2 text-xs text-muted">{t.scale}</p>

        <div className="border-t border-line py-4">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">{t.fuelsT}</div>
          <div className="grid gap-3" style={cols}>
            {compare.map((c, k) => (
              <Chips key={c.id} items={c.fuels} color={COLORS[k]} />
            ))}
          </div>
        </div>
        <div className="border-t border-line py-4">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">{t.sensT}</div>
          <div className="grid gap-3" style={cols}>
            {compare.map((c, k) => (
              <Chips key={c.id} items={c.sensors} color={COLORS[k]} />
            ))}
          </div>
        </div>
        <div className="border-t border-line py-4">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">{t.dataT}</div>
          <div className="grid gap-3" style={cols}>
            {compare.map((c, k) => (
              <div key={c.id}>
                <div className="text-sm font-semibold tabular-nums">
                  {c.files.total.toLocaleString(loc)}{" "}
                  <span className="font-normal text-muted">
                    ({c.files.videos} {t.rows.videos})
                  </span>
                </div>
                <div className="mt-2 h-3 rounded-full bg-line" aria-hidden="true">
                  <div className="h-3 rounded-full" style={{ width: `${Math.max(2.5, (c.files.total / maxFiles) * 100)}%`, background: COLORS[k] }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="border-t border-line py-4">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
            {t.rows.hw} · DOI
          </div>
          <div className="grid gap-3 text-sm text-ink-2" style={cols}>
            {compare.map((c) => (
              <div key={c.id} className="space-y-1 break-words">
                <div>{c.hardware ?? "—"}</div>
                <div className="text-xs text-muted">{c.doi ?? "—"}</div>
                <Link href={`/explorer/${c.id}`} className="text-xs font-medium text-ink underline">
                  {t.openRec} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Cell({ inv }: { inv: Investigation }) {
  const t = useT(T);
  const { lang } = useLang();
  const o2 = fmtRange(inv.conditions.o2, "", 100, lang);
  const p = fmtRange(inv.conditions.pressureAtm, "atm", 1, lang);
  const f = fmtRange(inv.conditions.flowCmS, "cm/s", 1, lang);
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
      <dt className="text-muted">O₂</dt>
      <dd>{o2 ? `${o2.trim()}%` : <Pending />}</dd>
      <dt className="text-muted">{t.pressure}</dt>
      <dd>{p ?? <Pending />}</dd>
      <dt className="text-muted">{t.airflow}</dt>
      <dd>{f ?? <Pending />}</dd>
    </dl>
  );
}

export default function Explorer() {
  const t = useT(T);
  const { lang } = useLang();
  const data = useData();
  const [area, setArea] = useState<"all" | Area>("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("score");
  const [picked, setPicked] = useState<string[]>([]);
  const [mode, setMode] = useState(false);
  const [showCmp, setShowCmp] = useState(false);
  const loc = lang === "es" ? "es" : "en";

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return data.investigations
      .filter((i) => area === "all" || i.areas.includes(area))
      .filter(
        (i) =>
          !s || [i.acronym, i.title, i.psiId, i.summary, ...i.fuels, ...i.sensors].join(" ").toLowerCase().includes(s),
      )
      .map((i) => ({ inv: i, score: scoreInvestigation(i, DEFAULT_WEIGHTS) }))
      .sort((a, b) =>
        sort === "score"
          ? b.score.total - a.score.total
          : sort === "files"
            ? b.inv.files.total - a.inv.files.total
            : a.inv.acronym.localeCompare(b.inv.acronym),
      );
  }, [area, q, sort, data]);

  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 3 ? p : [...p, id]));
  const compare = data.investigations.filter((i) => picked.includes(i.id));
  const nv = t.notV;
  const goCompare = () => {
    setShowCmp(true);
    requestAnimationFrame(() =>
      document.getElementById("compare-section")?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };
  const exitMode = () => {
    setMode(false);
    setShowCmp(false);
    setPicked([]);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10">
      <p className="eyebrow">{t.eyebrow}</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{t.title}</h1>
      <p className="mt-3 max-w-3xl text-ink-2">
        {data.investigations.length} {t.intro1}
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          onClick={() => (mode ? exitMode() : setMode(true))}
          aria-pressed={mode}
          className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
            mode ? "border-accent bg-accent/15 text-ink" : "border-accent bg-accent text-black hover:opacity-90"
          }`}
        >
          <span aria-hidden>⇄</span>
          {mode ? t.compExit : t.compStart}
        </button>
        {mode && <p className="text-sm text-ink-2">{t.compHint}</p>}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div role="group" aria-label={t.filter} className="flex flex-wrap gap-2">
          {AREAS.map((a) => (
            <button
              key={a}
              onClick={() => setArea(a)}
              aria-pressed={area === a}
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                area === a ? "border-accent bg-accent/15 text-ink" : "border-line-2 text-ink-2 hover:text-ink"
              }`}
            >
              {a === "all" ? t.all : areaLabel(a, lang)}
            </button>
          ))}
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.search}
          aria-label={t.searchAria}
          className="min-w-[14rem] flex-1 rounded-lg border border-line-2 bg-surface px-3 py-2 text-sm placeholder:text-muted"
        />
        <label className="flex items-center gap-2 text-sm text-ink-2">
          {t.sort}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="rounded-lg border border-line-2 bg-surface px-2 py-2 text-ink"
          >
            <option value="score">{t.byScore}</option>
            <option value="files">{t.byFiles}</option>
            <option value="name">{t.byName}</option>
          </select>
        </label>
      </div>

      <p className="mt-3 text-xs text-muted" aria-live="polite">
        {rows.length} {t.results}
      </p>

      <ul className="mt-3 grid gap-4 md:grid-cols-2">
        {rows.map(({ inv, score }) => {
          const on = picked.includes(inv.id);
          return (
            <li key={inv.id} className={`card flex flex-col p-5 ${on ? "ring-1 ring-accent" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link href={`/explorer/${inv.id}`} className="text-lg font-semibold hover:underline">
                    {inv.acronym}
                  </Link>
                  <p className="text-xs text-muted">
                    {inv.psiId} · {inv.fuelPhase}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-semibold tabular-nums">{score.total.toFixed(0)}</div>
                  <div className="text-xs text-muted">{levelLabel(score.total, lang)}</div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {inv.areas.map((a) => (
                  <AreaBadge key={a} area={a} />
                ))}
              </div>
              <p className="mt-3 flex-1 text-sm text-ink-2">{inv.summary}</p>
              <div className="mt-3">
                <ScoreBar score={score} compact />
              </div>
              <div className="mt-3 flex items-end justify-between gap-3">
                <Cell inv={inv} />
                {mode && (
                  <button
                    onClick={() => toggle(inv.id)}
                    aria-pressed={on}
                    disabled={!on && picked.length >= 3}
                    className={`shrink-0 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40 ${
                      on ? "border-accent bg-accent/20 text-ink" : "border-line-2 text-ink-2 hover:text-ink"
                    }`}
                  >
                    {on ? t.compSelected : t.compSelect}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {showCmp && compare.length >= 2 && (
        <ComparePanel
          compare={compare}
          onBack={() => {
            setShowCmp(false);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      )}

      {mode && picked.length > 0 && !showCmp && (
        <div
          role="region"
          aria-label={t.compStart}
          className="fixed inset-x-0 bottom-4 z-[55] mx-auto flex w-[calc(100%-2rem)] max-w-xl items-center justify-between gap-3 rounded-xl border border-accent bg-surface px-4 py-3 shadow-2xl"
        >
          <div className="text-sm">
            <span className="font-semibold tabular-nums">{picked.length}</span> {t.compSelN}
            <span className="ml-2 text-xs text-muted">{picked.length < 2 ? t.compMin : picked.length >= 3 ? t.compMax : ""}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setPicked([])} className="text-sm text-ink-2 hover:text-ink">
              {t.compClear}
            </button>
            <button
              onClick={goCompare}
              disabled={picked.length < 2}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
            >
              {t.compGo} ({picked.length})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
