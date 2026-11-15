"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n";
import { Section } from "@/components/ui";

const T = {
  en: {
    eyebrow: "Method",
    title: "How JaPax turns NASA experiments into an answer",
    intro:
      "Every number on this site is one of four kinds. This page says which, where each one comes from, and what the model does and does not know.",
    tagsTitle: "Four kinds of number",
    tags: [
      ["Measured", "A value recorded in a PSI dataset, cited with its PSI ID, DOI and sample size."],
      ["Reported", "A value stated in a peer-reviewed paper or NTRS report that we did not re-derive from raw data."],
      ["Estimated", "An engineering assumption or hypothesis with no experimental source. It is always shown as such."],
      ["Simulated", "The output of the JaPax component-level spread model (a graph, level A)."],
    ] as [string, string][],
    pipeTitle: "From the archive to the page",
    pipe: [
      "NASA's Physical Sciences Informatics (PSI) repository is queried through its public API. Investigation metadata and file inventories come from there.",
      "Experiment tables (CSV) and facts we curated by hand, each with its source, are merged into one dataset with a build script.",
      "Every fact in the spacesuit, ISS and environment component catalogues carries a tag and a source, and automated tests (npm run test:lab) fail if one is missing.",
      "The totals on the home page (19 investigations, about 12.7 TB, 12,146 files) are summed from the sizes PSI declares (decimal terabytes, 1 TB = 10¹² bytes), queried on 15 Nov 2026; the per-investigation sizes are saved in data/psi-size-total.json.",
    ],
    engineTitle: "What the simulator computes",
    engine: [
      "Spread speed = anchor × oxygen × airflow × gravity × material.",
      "The anchor, 2.0 mm/s, is a representative value inside the concurrent-flow spread rates NASA measured on thin fabric in microgravity (1.8-2.6 mm/s, SAFFIRE I-III, NTRS 20180005168 Table 1; PSI-98, PSI-99, PSI-100).",
      "The four factors that scale it to other atmospheres are modelling choices, not fitted to data, and each one shows its source in the simulator.",
      "The component layout and the rupture window of the oxygen tank are estimates. The simulator labels them as such and offers a view with only measured values.",
      "The result is a model, not a test. It ranks what to protect first; it does not certify a design.",
    ],
    limitsTitle: "What the data cannot say yet",
    limits: [
      "No dataset in PSI was measured at lunar gravity (0.166 g). LUCI reported the first extended-duration burns in simulated lunar gravity in 2025 (NTRS 20250010653), and FM2 is a planned lander mission. Everything lunar here is an extrapolation.",
      "FLEX burned fuel droplets, not fabric, plastic or cables. BASS-II reached only 22.2% oxygen, below the 26.5% of a lunar habitat.",
      "The BASS-II table has no pressure column; 1 atm is an assumption and is labelled so.",
      "100% oxygen at 4.3 psi, the spacesuit, is outside every tested atmosphere.",
      "The ranking weights (35, 25, 20, 10, 10) are a prioritisation aid built by JaPax from cited facts, not an official NASA metric.",
    ],
    seeTitle: "Check it yourself",
    see: [
      ["Every source, DOI and NTRS id", "/references"],
      ["The measured rates, in the Evidence tab", "/simulator#evidence"],
      ["The 19 investigations", "/explorer"],
      ["What each term means", "/glossary"],
    ] as [string, string][],
  },
  es: {
    eyebrow: "Método",
    title: "Cómo convierte JaPax los experimentos de la NASA en una respuesta",
    intro:
      "Cada cifra de esta web es de uno de cuatro tipos. Esta página dice cuál, de dónde sale y qué sabe y qué no sabe el modelo.",
    tagsTitle: "Cuatro tipos de cifra",
    tags: [
      ["Medido", "Valor registrado en un conjunto de datos de PSI, citado con su ID de PSI, DOI y tamaño de muestra."],
      ["Reportado", "Valor que aparece en un artículo revisado por pares o en un informe NTRS y que no hemos recalculado con datos crudos."],
      ["Estimado", "Supuesto de ingeniería o hipótesis sin fuente experimental. Siempre se muestra como tal."],
      ["Simulado", "Resultado del modelo de propagación por componentes de JaPax (un grafo, nivel A)."],
    ] as [string, string][],
    pipeTitle: "Del archivo a la página",
    pipe: [
      "El repositorio Physical Sciences Informatics (PSI) de la NASA se consulta con su API pública. De ahí salen los metadatos y los inventarios de archivos de cada investigación.",
      "Las tablas de experimentos (CSV) y los datos que curamos a mano, cada uno con su fuente, se unen en un único conjunto con un script de construcción.",
      "Cada dato de los catálogos de componentes del traje, la ISS y los entornos lleva una etiqueta y una fuente, y unas pruebas automáticas (npm run test:lab) fallan si falta alguna.",
      "Los totales de la portada (19 investigaciones, unos 12.7 TB, 12,146 archivos) se suman de los tamaños que declara PSI (terabytes decimales, 1 TB = 10¹² bytes), consultados el 15 nov 2026; los tamaños por investigación están guardados en data/psi-size-total.json.",
    ],
    engineTitle: "Qué calcula el simulador",
    engine: [
      "Velocidad de propagación = ancla × oxígeno × flujo de aire × gravedad × material.",
      "El ancla, 2.0 mm/s, es un valor representativo dentro de las velocidades de propagación a favor del flujo que la NASA midió en tela fina en microgravedad (1.8-2.6 mm/s, SAFFIRE I-III, NTRS 20180005168 Tabla 1; PSI-98, PSI-99, PSI-100).",
      "Los cuatro factores que la adaptan a otras atmósferas son decisiones de modelado, no ajustadas a datos, y cada uno muestra su fuente en el simulador.",
      "La disposición de componentes y la ventana de rotura del tanque de oxígeno son estimaciones. El simulador las etiqueta así y ofrece una vista solo con valores medidos.",
      "El resultado es un modelo, no un ensayo. Ordena qué proteger primero; no certifica un diseño.",
    ],
    limitsTitle: "Lo que los datos aún no pueden decir",
    limits: [
      "Ningún conjunto de datos de PSI se midió a gravedad lunar (0.166 g). LUCI publicó en 2025 las primeras combustiones de larga duración en gravedad lunar simulada (NTRS 20250010653), y FM2 es una misión de aterrizador prevista. Todo lo lunar aquí es una extrapolación.",
      "FLEX quemó gotas de combustible, no tela, plástico ni cables. BASS-II llegó solo al 22.2% de oxígeno, por debajo del 26.5% de un hábitat lunar.",
      "La tabla de BASS-II no tiene columna de presión; 1 atm es un supuesto y así se etiqueta.",
      "El 100% de oxígeno a 4.3 psi, el traje espacial, queda fuera de todas las atmósferas probadas.",
      "Los pesos del ranking (35, 25, 20, 10, 10) son una ayuda de priorización creada por JaPax a partir de datos citados, no una métrica oficial de la NASA.",
    ],
    seeTitle: "Compruébalo tú mismo",
    see: [
      ["Todas las fuentes, DOI e ids de NTRS", "/references"],
      ["Las velocidades medidas, en la pestaña Evidence", "/simulator#evidence"],
      ["Las 19 investigaciones", "/explorer"],
      ["Qué significa cada término", "/glossary"],
    ] as [string, string][],
  },
};

export default function Methodology() {
  const t = useT(T);
  return (
    <div className="mx-auto max-w-4xl pb-8 pt-10">
      <p className="eyebrow px-4">{t.eyebrow}</p>
      <h1 className="mt-1 px-4 text-3xl font-semibold tracking-tight sm:text-4xl">{t.title}</h1>
      <p className="mt-3 px-4 text-ink-2">{t.intro}</p>

      <Section title={t.tagsTitle}>
        <dl className="card mt-4 divide-y divide-line">
          {t.tags.map(([k, v]) => (
            <div key={k} className="p-4 sm:grid sm:grid-cols-[10rem_1fr] sm:gap-4">
              <dt className="font-semibold">{k}</dt>
              <dd className="mt-1 text-sm text-ink-2 sm:mt-0">{v}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title={t.pipeTitle}>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-ink-2">
          {t.pipe.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </Section>

      <Section title={t.engineTitle}>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-ink-2">
          {t.engine.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </Section>

      <Section title={t.limitsTitle}>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-ink-2">
          {t.limits.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </Section>

      <Section title={t.seeTitle}>
        <ul className="mt-4 space-y-2 text-sm">
          {t.see.map(([label, href]) => (
            <li key={href}>
              <Link className="link" href={href}>
                {label} →
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
