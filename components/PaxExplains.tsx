"use client";

import { useEffect, useMemo, useState } from "react";
import PaxCharacter from "@/components/PaxCharacter";
import { useLang } from "@/lib/i18n";
import { availableTopics, explainRun, TOPICS, type ExplainTopic } from "@/lib/runExplain";
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

/**
 * Pax explains the results of the fire in plain language. The sentences are built from the RunRecord alone
 * (lib/runExplain.ts): the same numbers as the tables, nothing invented, no network call.
 */
export default function PaxExplains({ run }: { run: RunRecord }) {
  const { lang } = useLang();
  const l = lang === "es" ? "es" : "en";
  const [topic, setTopic] = useState<ExplainTopic | null>(null);
  const ids = useMemo(() => availableTopics(run), [run]);
  const text = topic ? explainRun(run, topic, l) : "";
  const { shown, done } = useTyped(text);
  const intro = l === "es" ? "Soy Pax. Pulsa una pregunta y te explico estos resultados con palabras sencillas." : "I'm Pax. Tap a question and I will explain these results in plain words.";

  return (
    <section aria-label={l === "es" ? "Pax explica los resultados" : "Pax explains the results"} className="rounded-xl border border-accent/40 bg-accent/10 p-3" data-testid="pax-explains">
      <div className="flex items-start gap-3">
        <PaxCharacter talking={!!text && !done} mood={topic ? "happy" : "idle"} size={72} minimal className="shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-relaxed" aria-live="polite" data-testid="pax-explain-text">{topic ? shown : intro}</p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {TOPICS.filter((x) => ids.includes(x.id)).map((x) => (
          <button
            key={x.id}
            onClick={() => setTopic(x.id)}
            aria-pressed={topic === x.id}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${topic === x.id ? "border-accent bg-accent text-black" : "border-accent/50 text-ink hover:bg-accent/15"}`}
          >
            {x[l]}
          </button>
        ))}
      </div>
    </section>
  );
}
