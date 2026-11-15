"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import PaxCharacter from "@/components/PaxCharacter";
import { useLang } from "@/lib/i18n";
import { availableTopics, explainRun, runContextText, TOPICS, type ExplainTopic } from "@/lib/runExplain";
import type { RunRecord } from "@/lib/runRecord";

/** Reveals `text` gradually; Pax's mouth moves while it runs. */
function useTyped(text: string) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!text) { setN(0); return; }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setN(text.length); return; }
    setN(0);
    const id = setInterval(() => {
      setN((v) => {
        if (v + 3 >= text.length) clearInterval(id);
        return Math.min(v + 3, text.length);
      });
    }, 22);
    return () => clearInterval(id);
  }, [text]);
  return { shown: text.slice(0, n), done: n >= text.length };
}

const T = {
  en: {
    aria: "Pax explains the results",
    intro: "I'm Pax. Select a topic, or ask a specific question about this run, and I will break down the results against the model and the PSI evidence.",
    placeholder: "Ask Pax about this fire…",
    ask: "Ask",
    thinking: "Pax is thinking…",
    fail: "The AI service is unavailable right now. The topic buttons above still work: they summarize the numbers of this run.",
    offline: "(Quick answer from verified data: AI mode is unavailable right now, so it may not address your run.)",
    example: "e.g. What limited tank heating? How sensitive is the outcome to the actuation delay?",
  },
  es: {
    aria: "Pax explica los resultados",
    intro: "Soy Pax. Selecciona un tema o plantea una pregunta concreta sobre esta simulación y desgloso los resultados frente al modelo y la evidencia PSI.",
    placeholder: "Pregunta a Pax sobre este incendio…",
    ask: "Preguntar",
    thinking: "Pax está pensando…",
    fail: "El servicio de IA no está disponible ahora. Los botones de tema de arriba siguen funcionando: resumen las cifras de esta simulación.",
    offline: "(Respuesta rápida con datos verificados: el modo IA no está disponible ahora, por lo que puede no abordar tu simulación.)",
    example: "p. ej. ¿Qué limitó el calentamiento del depósito? ¿Qué sensibilidad tiene el resultado al retardo de actuación?",
  },
};

/**
 * Pax explains the results of the fire. Two ways, both about the same RunRecord:
 *  1. buttons: sentences built from the record alone (lib/runExplain.ts) — deterministic, offline, nothing invented;
 *  2. free question: sent to /api/ask together with a compact text of the run, so the AI answers about THIS run.
 */
export default function PaxExplains({ run }: { run: RunRecord }) {
  const { lang } = useLang();
  const l = lang === "es" ? "es" : "en";
  const t = T[l];
  const [topic, setTopic] = useState<ExplainTopic | null>(null);
  const [custom, setCustom] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const history = useRef<{ q: string; a: string }[]>([]);
  const ids = useMemo(() => availableTopics(run), [run]);
  const text = custom ?? (topic ? explainRun(run, topic, l) : "");
  const { shown, done } = useTyped(text);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const question = q.trim();
    if (!question || busy) return;
    setBusy(true);
    setTopic(null);
    setCustom(null);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question, lang: l, history: history.current, runContext: runContextText(run) }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const a = await res.json();
      const body = [a.headline, a.body].filter(Boolean).join(" ");
      history.current = [...history.current, { q: question, a: body }].slice(-2);
      setCustom(a.mode === "ai" ? body : `${body} ${t.offline}`);
      setQ("");
    } catch {
      setCustom(t.fail);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label={t.aria} className="rounded-xl border border-accent/40 bg-accent/10 p-3" data-testid="pax-explains">
      <div className="flex items-start gap-3">
        <PaxCharacter talking={busy || (!!text && !done)} mood={text ? "happy" : "idle"} size={72} minimal className="shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-relaxed" aria-live="polite" data-testid="pax-explain-text">{busy ? t.thinking : text ? shown : t.intro}</p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {TOPICS.filter((x) => ids.includes(x.id)).map((x) => (
          <button
            key={x.id}
            onClick={() => { setCustom(null); setTopic(x.id); }}
            aria-pressed={topic === x.id && custom === null}
            className={`min-h-9 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${topic === x.id && custom === null ? "border-accent bg-accent text-black" : "border-accent/50 text-ink hover:bg-accent/15"}`}
          >
            {x[l]}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="mt-2 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          maxLength={400}
          placeholder={t.placeholder}
          aria-label={t.placeholder}
          title={t.example}
          className="min-w-0 flex-1 rounded-lg border border-line-2 bg-surface px-3 py-1.5 text-sm placeholder:text-muted"
        />
        <button type="submit" disabled={busy || !q.trim()} className="min-h-9 rounded-lg bg-accent px-4 py-1.5 text-sm font-semibold text-black disabled:opacity-40">
          {t.ask}
        </button>
      </form>
    </section>
  );
}
