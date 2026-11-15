"use client";

import Image from "next/image";
import Link from "next/link";
import { useData, useLang, useT } from "@/lib/i18n";
import { AreaBadge, Section, SourceTag, Stat } from "@/components/ui";
import CoverageMap from "@/components/CoverageMap";

const T = {
  en: {
    eyebrow: "NASA Space Apps 2026 · Flame in Freefall",
    h1a: "Know what to protect,",
    h1b: "before the fire decides.",
    lead: "In 1967 a fire inside a pure-oxygen cabin killed three astronauts; the hatch needed about ninety seconds to open even under ideal conditions. Today spacesuits and planned lunar habitats are still full of oxygen, and in space there is no one to call. JaPax turns NASA's fire experiments into one answer: where a fire starts, where it goes, how long it takes, and what must be protected so the crew comes home.",
    ctaSim: "Watch a fire cross a spacesuit",
    ctaExp: "Read the evidence",
    ctaAsk: "Ask Pax",
    s1: "NASA fire investigations",
    s1n: (n: number) => `${n} with a verified PSI DOI`,
    s2: "of raw experiment data",
    s2n: "sum of the total size PSI declares for the 19 investigations (PSI API, 15 Nov 2026)",
    s3: "public files catalogued",
    s3n: "tables, images and flame videos, summed across all investigations",
    s4: "datasets at lunar gravity",
    s4n: "The first fire experiment on the Moon has not flown yet; FM2 is planned for late 2026",
    wEyebrow: "Why we exist",
    wTitle: "Fire in space is a question of human lives",
    w: [
      { kicker: "1967", title: "A hazard that was underestimated", text: "During a ground test of Apollo 1 a fire started in a cabin full of pure oxygen. The hatch needed about ninety seconds to open even under ideal conditions and could not be opened against the rising pressure. Gus Grissom, Ed White and Roger Chaffee died inside. It was not bad luck: it was an underestimated risk." },
      { kicker: "Today", title: "The danger moved, it did not leave", text: "An astronaut who steps outside the station wears a suit filled with 100% oxygen. The habitats planned for the Moon would hold more oxygen than the air we breathe on Earth. Oxygen keeps the crew alive, and it turns any spark into a threat." },
      { kicker: "In space", title: "No firefighters, no exit, no one to call", text: "If a fire starts, the crew has only what someone designed before launch. Every choice, which material, where to put a barrier, which component to shield, becomes the difference between coming home or not." },
      { kicker: "The blind spot", title: "Decisions made with very little light", text: "Fire does not behave in space as it does on Earth. NASA has run combustion experiments in microgravity for years, but its archive holds zero datasets at lunar gravity. Whoever designs a suit, a ship or a base has no answer to the key question: if a fire starts, what do I protect first?" },
    ],
    oEyebrow: "Our answer",
    oTitle: "Protect what keeps you alive. Not everything.",
    oLead: "We lit the fire from each of the six parts of a spacesuit and let the engine run. A fire that starts in the upper garment reaches the oxygen tank in under a minute, and the tank bursts at 2 minutes 13 seconds.",
    tl: [
      ["0:00", "Fire starts in the upper garment"],
      ["0:58", "The oxygen tank catches fire"],
      ["2:13", "The tank bursts"],
    ] as [string, string][],
    tlLabel: "Timeline of a fire that starts in the upper garment of the suit",
    unprot: "No protection",
    prot: "Oxygen tank shielded",
    burst: (n: number) => `The tank bursts in ${n} of 6 fires`,
    oText: "In the model, shielding the tank turns six bursts out of six into one: the one that starts at the tank itself. You do not need to protect the whole suit. You need to protect what keeps the astronaut alive.",
    oNote: "Simulated by the JaPax component engine, which starts from a flame spread rate measured by NASA on thin fabric (SAFFIRE I-III, 1.8-2.6 mm/s). The factors that scale it to the suit (oxygen, airflow, gravity, material), the component layout and the rupture window are estimates, labelled as such. Suit conditions: 100% O₂ at 0.29 atm, no airflow. This is a model, not a test.",
    oCta: "Run it yourself in the simulator",
    fEyebrow: "What NASA has already measured",
    fTitle: "Three results that change how a crew is protected",
    see: "See",
    f: [
      { kicker: "Habitat atmospheres", title: "Ventilation shutdown may not be enough to put out a fire in O₂-enriched atmospheres", text: "In ACME BRE, flames in O₂-enriched atmospheres were sustained in microgravity under quiescent conditions, with no forced flow; at 21% O₂ they self-extinguished. Cutting ventilation is an established step for extinguishing spacecraft fires; the authors suggest it may not be enough in oxygen-rich atmospheres." },
      { kicker: "Material qualification", title: "NASA-STD-6001 Test 1 is not conservative for microgravity", text: "BASS indicates that Test 1, an upward-propagation test at 1 g, does not bound the worst case: the limiting oxygen concentration is lower in microgravity. In NASA's Researcher's Guide (2015) the minimum sits near an opposed-flow velocity of 10 cm/s (a qualitative schematic), typical of spacecraft ventilation." },
      { kicker: "Suppression", title: "Terrestrial inert-agent standards give a reduced margin in low gravity", text: "FLEX found that the flammability limit is lower in reduced gravity, so terrestrial design standards for inert-gas suppressants (CO₂, He) do not provide the same safety margin." },
    ],
    mEyebrow: "Where the lights are off",
    mTitle: "The atmospheres nobody has tested yet",
    mText: "Each region or marker is an atmosphere (O₂ mole fraction, total pressure) that was actually tested. The orange region is the expected lunar-habitat envelope: oxygen-enriched and sub-atmospheric. Coverage there is sparse, and no test was run at lunar gravity (0.166 g).",
    qEyebrow: "Why truth is part of saving lives",
    qTitle: "When lives are at stake, an invented number is a danger",
    qText: "In JaPax every number says where it comes from and whether it was measured, reported, estimated or simulated. Where there are no data we say it out loud, because a gap nobody sees can also cost a life. Our honesty is not a limitation: it is the reason you can rely on us when you have to decide.",
    q: [
      ["Measured", "Value recorded in a PSI dataset, cited with PSI ID, DOI and sample size."],
      ["Reported", "Value stated in a peer-reviewed paper or NTRS report and not re-derived from raw data."],
      ["Estimated", "Engineering assumption or hypothesis with no experimental source; shown explicitly as such."],
      ["Simulated", "Output of the JaPax component-level spread model (graph, level A)."],
    ] as [string, string][],
    nEyebrow: "Open gaps",
    nTitle: "Planned experiments and missing data",
    nNote: "JaPax is built to ingest these datasets as soon as they are published in PSI.",
    hEyebrow: "Lessons paid for with lives",
    hTitle: "Mishaps that shaped the requirements",
    lesson: "Lesson learned",
    source: "Source",
    cTitle: "Know what to protect, before the fire decides.",
    cText: "Open the simulator, light a fire anywhere on the suit, and see what it reaches and when.",
  },
  es: {
    eyebrow: "NASA Space Apps 2026 · Flame in Freefall",
    h1a: "Saber qué proteger,",
    h1b: "antes de que el fuego decida.",
    lead: "En 1967 un fuego dentro de una cabina de oxígeno puro mató a tres astronautas; la escotilla necesitó unos noventa segundos en abrirse incluso en condiciones ideales. Hoy los trajes espaciales y los hábitats lunares previstos siguen llenos de oxígeno, y en el espacio no hay a quién llamar. JaPax convierte los experimentos de fuego de la NASA en una sola respuesta: dónde empieza un fuego, a dónde llega, cuánto tarda y qué hay que proteger para que la tripulación vuelva a casa.",
    ctaSim: "Ver cómo se propaga un fuego por un traje espacial",
    ctaExp: "Leer la evidencia",
    ctaAsk: "Preguntar a Pax",
    s1: "investigaciones de fuego de la NASA",
    s1n: (n: number) => `${n} con DOI de PSI verificado`,
    s2: "de datos brutos de experimentos",
    s2n: "suma del tamaño total que PSI declara para las 19 investigaciones (API de PSI, 15 nov 2026)",
    s3: "archivos públicos catalogados",
    s3n: "tablas, imágenes y vídeos de llamas, sumados en todas las investigaciones",
    s4: "conjuntos de datos a gravedad lunar",
    s4n: "El primer experimento de fuego en la Luna aún no ha volado; FM2 está previsto para finales de 2026",
    wEyebrow: "Por qué existimos",
    wTitle: "El fuego en el espacio es una cuestión de vidas humanas",
    w: [
      { kicker: "1967", title: "Un peligro que se subestimó", text: "Durante una prueba en tierra del Apollo 1 empezó un fuego en una cabina llena de oxígeno puro. La escotilla necesitó unos noventa segundos en abrirse incluso en condiciones ideales y no pudo abrirse contra la presión creciente. Gus Grissom, Ed White y Roger Chaffee murieron dentro. No fue mala suerte: fue un riesgo subestimado." },
      { kicker: "Hoy", title: "El peligro cambió de lugar, no desapareció", text: "Cuando un astronauta sale de la estación, lleva un traje lleno de oxígeno al 100%. Los hábitats lunares previstos tendrían más oxígeno que el aire que respiramos en la Tierra. El oxígeno mantiene viva a la tripulación y convierte cualquier chispa en una amenaza." },
      { kicker: "En el espacio", title: "Sin bomberos, sin salida, sin nadie a quien llamar", text: "Si empieza un fuego, la tripulación solo tiene lo que alguien diseñó antes de despegar. Cada decisión, qué material usar, dónde poner una barrera, qué componente blindar, se convierte en la diferencia entre volver a casa o no." },
      { kicker: "El punto ciego", title: "Decisiones tomadas con muy poca luz", text: "El fuego en el espacio no se comporta como en la Tierra. La NASA lleva años haciendo experimentos de combustión en microgravedad, pero en su archivo no hay ningún conjunto de datos a gravedad lunar. Quien diseña un traje, una nave o una base no tiene respuesta a la pregunta clave: si empieza un fuego, ¿qué protejo primero?" },
    ],
    oEyebrow: "Nuestra respuesta",
    oTitle: "Protege lo que te mantiene vivo. No todo.",
    oLead: "Encendimos el fuego desde cada una de las seis partes de un traje espacial y dejamos correr el motor. Un fuego que empieza en la prenda superior llega al depósito de oxígeno en menos de un minuto, y el depósito revienta a los 2 minutos y 13 segundos.",
    tl: [
      ["0:00", "El fuego empieza en la prenda superior"],
      ["0:58", "El depósito de oxígeno se incendia"],
      ["2:13", "El depósito revienta"],
    ] as [string, string][],
    tlLabel: "Cronología de un fuego que empieza en la prenda superior del traje",
    unprot: "Sin protección",
    prot: "Depósito de oxígeno blindado",
    burst: (n: number) => `El depósito revienta en ${n} de 6 fuegos`,
    oText: "En el modelo, blindar el depósito convierte seis reventones de seis en uno: el que empieza en el propio depósito. No hace falta proteger todo el traje. Hace falta proteger lo que mantiene vivo al astronauta.",
    oNote: "Simulado con el motor de componentes de JaPax, que parte de una velocidad de propagación medida por la NASA en tela fina (SAFFIRE I-III, 1.8-2.6 mm/s). Los factores que la adaptan al traje (oxígeno, flujo de aire, gravedad, material), la disposición de componentes y la ventana de rotura son estimaciones y así se etiquetan. Condiciones del traje: 100% de O₂ a 0.29 atm, sin flujo de aire. Es un modelo, no un ensayo.",
    oCta: "Pruébalo por tu cuenta en el simulador",
    fEyebrow: "Lo que la NASA ya ha medido",
    fTitle: "Tres resultados que cambian cómo se protege a una tripulación",
    see: "Ver",
    f: [
      { kicker: "Atmósferas de hábitat", title: "Cortar la ventilación puede no bastar para apagar un fuego en atmósferas enriquecidas en O₂", text: "En ACME BRE, las llamas en atmósferas enriquecidas en O₂ se mantuvieron en microgravedad en condiciones de reposo, sin flujo forzado; a 21% de O₂ se autoextinguieron. Cortar la ventilación es un paso establecido para extinguir incendios en naves; los autores sugieren que puede no bastar en atmósferas ricas en oxígeno." },
      { kicker: "Calificación de materiales", title: "NASA-STD-6001 Test 1 no es conservador en microgravedad", text: "BASS indica que el Test 1, un ensayo de propagación ascendente a 1 g, no acota el peor caso: la concentración límite de oxígeno es menor en microgravedad. En la Guía del Investigador de la NASA (2015) el mínimo está hacia una velocidad de flujo opuesto de 10 cm/s (esquema cualitativo), típica de la ventilación de una nave." },
      { kicker: "Supresión", title: "Los estándares terrestres de agentes inertes ofrecen menos margen en gravedad reducida", text: "FLEX encontró que el límite de inflamabilidad es menor en gravedad reducida, por lo que los estándares de diseño terrestres para supresores de gas inerte (CO₂, He) no proporcionan el mismo margen de seguridad." },
    ],
    mEyebrow: "Donde la luz está apagada",
    mTitle: "Las atmósferas que nadie ha ensayado todavía",
    mText: "Cada región o marcador es una atmósfera (fracción molar de O₂, presión total) realmente ensayada. La región naranja es la envolvente prevista de un hábitat lunar: enriquecida en oxígeno y subatmosférica. La cobertura ahí es escasa y no se ha ensayado a gravedad lunar (0.166 g).",
    qEyebrow: "Por qué la verdad es parte de salvar vidas",
    qTitle: "Cuando hay vidas en juego, una cifra inventada es un peligro",
    qText: "En JaPax cada número dice de dónde sale y si está medido, reportado, estimado o simulado. Donde no hay datos lo decimos en voz alta, porque un hueco que nadie ve también puede costar una vida. Nuestra honestidad no es una limitación: es la razón por la que puedes apoyarte en nosotros a la hora de decidir.",
    q: [
      ["Medido", "Valor registrado en un conjunto de datos PSI, citado con PSI ID, DOI y tamaño muestral."],
      ["Reportado", "Valor expuesto en un artículo revisado por pares o un informe NTRS, no recalculado a partir de datos brutos."],
      ["Estimado", "Supuesto de ingeniería o hipótesis sin fuente experimental; se muestra explícitamente como tal."],
      ["Simulado", "Resultado del modelo de propagación por componentes de JaPax (grafo, nivel A)."],
    ] as [string, string][],
    nEyebrow: "Brechas abiertas",
    nTitle: "Experimentos previstos y datos pendientes",
    nNote: "JaPax está preparado para incorporar estos conjuntos de datos en cuanto se publiquen en PSI.",
    hEyebrow: "Lecciones pagadas con vidas",
    hTitle: "Siniestros que dieron forma a los requisitos",
    lesson: "Lección aprendida",
    source: "Fuente",
    cTitle: "Saber qué proteger, antes de que el fuego decida.",
    cText: "Abre el simulador, enciende un fuego en cualquier parte del traje y mira qué alcanza y cuándo.",
  },
};

const FINDING_META = [
  { id: "acme-bre", src: "PSI", psi: "PSI-20" },
  { id: "bass", src: "GUIDE p.31", psi: "PSI-26" },
  { id: "flex", src: "GUIDE p.12", psi: "PSI-69" },
];

/** Simulated suit result (engine run from each of the 6 ignition points): tank ruptured in `n` of 6 fires. */
function Dots({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex items-center gap-1.5" role="img" aria-label={label}>
      {Array.from({ length: 6 }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="h-5 w-5 rounded-full border border-line-2"
          style={i < n ? { background: "var(--accent)", borderColor: "var(--accent)" } : undefined}
        />
      ))}
    </div>
  );
}

export default function Home() {
  const t = useT(T);
  const { lang } = useLang();
  const data = useData();
  const totalFiles = data.investigations.reduce((s, i) => s + i.files.total, 0);
  const withDoi = data.investigations.filter((i) => i.doi).length;
  const loc = lang === "es" ? "es" : "en";

  return (
    <>
      {/* HERO */}
      <section className="mx-auto max-w-6xl px-4 pt-14 sm:pt-20">
        <Image
          src="/brand/japax-logo.png"
          alt="JaPax — Space fire safety"
          width={1305}
          height={1334}
          priority
          className="mb-8 h-auto w-36 sm:w-44 lg:float-right lg:mb-0 lg:ml-8 lg:w-56"
        />
        <p className="eyebrow">{t.eyebrow}</p>
        <h1 className="mt-3 max-w-4xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
          {t.h1a} <span style={{ color: "var(--accent)" }}>{t.h1b}</span>
        </h1>
        <p className="mt-5 max-w-3xl text-lg text-ink-2">{t.lead}</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/simulator" className="rounded-lg bg-accent px-5 py-2.5 font-medium text-black hover:brightness-110">
            {t.ctaSim}
          </Link>
          <Link href="/explorer" className="rounded-lg border border-line-2 px-5 py-2.5 text-ink hover:bg-surface-2">
            {t.ctaExp}
          </Link>
          <Link href="/ask" className="rounded-lg border border-line-2 px-5 py-2.5 text-ink hover:bg-surface-2">
            {t.ctaAsk}
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat value={String(data.investigations.length)} label={t.s1} note={t.s1n(withDoi)} />
          <Stat value="≈12.7 TB" label={t.s2} note={t.s2n} />
          <Stat value={totalFiles.toLocaleString("en-US").replace(/,/g, loc === "es" ? " " : ",")} label={t.s3} note={t.s3n} />
          <Stat value="0" label={t.s4} note={t.s4n} />
        </div>
      </section>

      {/* WHY WE EXIST */}
      <Section eyebrow={t.wEyebrow} title={t.wTitle}>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {t.w.map((w) => (
            <article key={w.kicker} className="card p-5">
              <p className="eyebrow">{w.kicker}</p>
              <h3 className="mt-2 text-lg font-semibold leading-snug">{w.title}</h3>
              <p className="mt-3 text-sm text-ink-2">{w.text}</p>
            </article>
          ))}
        </div>
      </Section>

      {/* OUR ANSWER */}
      <Section eyebrow={t.oEyebrow} title={t.oTitle}>
        <p className="mt-3 max-w-3xl text-ink-2">{t.oLead}</p>
        <ol className="mt-6 grid gap-3 sm:grid-cols-3" aria-label={t.tlLabel}>
          {t.tl.map(([time, what], i) => (
            <li key={time} className="card p-4">
              <span className="text-3xl font-semibold tabular-nums" style={{ color: i === 2 ? "var(--accent)" : undefined }}>
                {time}
              </span>
              <p className="mt-1 text-sm text-ink-2">{what}</p>
            </li>
          ))}
        </ol>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="card p-4">
            <p className="text-sm font-semibold">{t.unprot}</p>
            <div className="mt-3"><Dots n={6} label={t.burst(6)} /></div>
            <p className="mt-2 text-sm text-ink-2">{t.burst(6)}</p>
          </div>
          <div className="card p-4">
            <p className="text-sm font-semibold">{t.prot}</p>
            <div className="mt-3"><Dots n={1} label={t.burst(1)} /></div>
            <p className="mt-2 text-sm text-ink-2">{t.burst(1)}</p>
          </div>
        </div>
        <p className="mt-4 max-w-3xl text-ink-2">{t.oText}</p>
        <p className="mt-3 max-w-3xl text-xs text-muted">{t.oNote}</p>
        <Link href="/simulator" className="link mt-4 inline-block font-medium">
          {t.oCta} →
        </Link>
      </Section>

      {/* FINDINGS */}
      <Section eyebrow={t.fEyebrow} title={t.fTitle}>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {t.f.map((f, i) => (
            <article key={FINDING_META[i].id} className="card flex flex-col p-5">
              <p className="eyebrow">{f.kicker}</p>
              <h3 className="mt-2 text-lg font-semibold leading-snug">{f.title}</h3>
              <p className="mt-3 flex-1 text-sm text-ink-2">{f.text}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <SourceTag src={FINDING_META[i].src} />
                <Link href={`/explorer/${FINDING_META[i].id}`} className="link text-sm">
                  {t.see} {FINDING_META[i].psi} →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </Section>

      {/* MAP */}
      <Section eyebrow={t.mEyebrow} title={t.mTitle}>
        <p className="mt-3 max-w-3xl text-ink-2">{t.mText}</p>
        <div className="mt-6">
          <CoverageMap />
        </div>
      </Section>

      {/* TRUTH */}
      <Section eyebrow={t.qEyebrow} title={t.qTitle}>
        <p className="mt-3 max-w-3xl text-ink-2">{t.qText}</p>
        <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {t.q.map(([k, d]) => (
            <div key={k} className="card p-4">
              <dt className="font-semibold">{k}</dt>
              <dd className="mt-1 text-sm text-ink-2">{d}</dd>
            </div>
          ))}
        </dl>
      </Section>

      {/* GAPS */}
      <Section eyebrow={t.nEyebrow} title={t.nTitle}>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {data.upcoming.map((u) => (
            <div key={u.acronym} className="card p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{u.acronym}</h3>
                <span className="text-xs text-muted">{u.gravity}</span>
              </div>
              <p className="text-sm text-ink-2">{u.name}</p>
              <p className="mt-2 text-sm text-ink-2">{u.note}</p>
              <div className="mt-2">
                <SourceTag src={u.src} />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted">
          <AreaBadge area="fundamental" /> {t.nNote}
        </p>
      </Section>

      {/* HISTORY */}
      <Section eyebrow={t.hEyebrow} title={t.hTitle}>
        <ol className="mt-6 grid gap-4 md:grid-cols-2">
          {data.incidents.map((inc) => (
            <li key={inc.name} className="card p-5">
              <div className="flex items-baseline gap-3">
                <span className="text-2xl font-semibold" style={{ color: "var(--accent)" }}>
                  {inc.year}
                </span>
                <h3 className="font-semibold">{inc.name}</h3>
              </div>
              <p className="mt-2 text-sm text-ink-2">{inc.text}</p>
              <p className="mt-2 text-sm">
                <span className="text-muted">{t.lesson}: </span>
                {inc.lesson}
              </p>
              <a className="link mt-2 inline-block text-xs" href={inc.src} target="_blank" rel="noreferrer">
                {t.source} ↗
              </a>
            </li>
          ))}
        </ol>
      </Section>

      {/* CLOSING */}
      <section className="mx-auto max-w-6xl px-4 pt-16 text-center">
        <h2 className="mx-auto max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">{t.cTitle}</h2>
        <p className="mx-auto mt-3 max-w-2xl text-ink-2">{t.cText}</p>
        <Link href="/simulator" className="mt-6 inline-block rounded-lg bg-accent px-5 py-2.5 font-medium text-black hover:brightness-110">
          {t.ctaSim}
        </Link>
      </section>
    </>
  );
}
