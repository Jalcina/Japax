"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLang, useT } from "@/lib/i18n";
import { Section } from "@/components/ui";

// Fill these in when available. Anything left empty is shown as "pending", never invented.
// Photos: put a file in /public/team/ and set `photo` (e.g. "/team/jaime.jpg").
const TEAM: { name: string; initials: string; github: string; linkedin?: string; photo?: string; bio: { en: string; es: string } }[] = [
  { name: "Jaime Alcina", initials: "JA", github: "Jalcina", linkedin: "https://www.linkedin.com/in/jaimealcina/", photo: "/team/jaime.jpg",
    bio: {
      en: "Studying Multiplatform Application Development. Co-created JaPax for the NASA Space Apps Challenge 2026 in Seville.",
      es: "Estudia Desarrollo de Aplicaciones Multiplataforma. Cocreó JaPax para el NASA Space Apps Challenge 2026 en Sevilla.",
    },
  },
  { name: "Pablo Triguero", initials: "PT", github: "ptricha", linkedin: "https://www.linkedin.com/in/pablotriguerochamizo/", photo: "/team/pablo.jpg",
    bio: {
      en: "Studying Computer Engineering, with a specialisation in Data Science. Co-created JaPax for the NASA Space Apps Challenge 2026 in Seville.",
      es: "Estudia Ingeniería Informática con mención en Ciencia de Datos. Cocreó JaPax para el NASA Space Apps Challenge 2026 en Sevilla.",
    },
  },
];

/** Bump when the files in /public/about are re-rendered: they are cached for 7 days, so the URL must change. */
const VIDEO_V = 3;

const T = {
  en: {
    videoLabel: "JaPax introduction video (about 70 seconds, with narration)",
    eyebrow: "About us",
    title: "The team behind JaPax",
    intro: "JaPax was built by two people for the NASA Space Apps Challenge 2026 (Seville), answering the challenge “Flame in Freefall”.",
    teamEyebrow: "The creators",
    zoom: "Enlarge photo",
    role: "Role",
    roleValue: "Founder & Developer",
    bio: "Bio",
    linkedin: "LinkedIn",
    github: "GitHub",
    projEyebrow: "The project",
    projTitle: "What JaPax is and why we built it",
    p: [
      "JaPax exists to save lives. In 1967 a fire in a pure-oxygen Apollo 1 cabin killed three astronauts, and today spacesuits and planned lunar habitats are still full of oxygen. In space there are no firefighters and no one to call, so every design choice has to be right before launch.",
      "Fire behaves very differently in microgravity, and no one has measured how it behaves on the Moon. NASA has run decades of combustion experiments on the ISS, but the results sit in tables that only specialists can read.",
      "JaPax turns those public experiments from NASA's Physical Sciences Informatics (PSI) into a traceable evidence base: what burns, at what spread rate, and where the evidence stops. It is aimed at combustion researchers, aerospace and fire-safety engineers, and space-agency and habitat-design professionals.",
      "We follow one rule: every number shows its source (PSI ID and DOI), and anything not measured is labelled as predicted or estimated. Where no data exists, such as partial gravity, we say so instead of filling the gap.",
    ],
    ptsEyebrow: "What you can do",
    pts: [
      ["Simulate", "Explore fire in different gravity and atmosphere conditions."],
      ["Explore", "Browse the NASA experiments with their sources and licences."],
      ["Rank", "See which findings matter most for a lunar base."],
      ["Ask", "Question the data with an AI assistant grounded in the sources."],
    ],
    pending: "To be added",
    contactEyebrow: "Work with us",
    contactTitle: "Liked JaPax?",
    contact: "If your company or lab liked what you saw, we would love to talk. Reach us through our GitHub or LinkedIn profiles above.",
    repo: "Project repository",
    back: "Back to home",
  },
  es: {
    videoLabel: "Vídeo de presentación de JaPax (unos 70 segundos, con locución)",
    eyebrow: "Sobre nosotros",
    title: "El equipo detrás de JaPax",
    intro: "JaPax lo hemos creado dos personas para el NASA Space Apps Challenge 2026 (Sevilla), respondiendo al reto “Flame in Freefall”.",
    teamEyebrow: "Los creadores",
    zoom: "Ampliar foto",
    role: "Rol",
    roleValue: "Fundador y desarrollador",
    bio: "Bio",
    linkedin: "LinkedIn",
    github: "GitHub",
    projEyebrow: "El proyecto",
    projTitle: "Qué es JaPax y por qué lo hicimos",
    p: [
      "JaPax existe para salvar vidas. En 1967 un fuego en una cabina del Apollo 1 llena de oxígeno puro mató a tres astronautas, y hoy los trajes espaciales y los hábitats lunares previstos siguen llenos de oxígeno. En el espacio no hay bomberos ni nadie a quien llamar, así que cada decisión de diseño tiene que ser correcta antes del despegue.",
      "El fuego se comporta de forma muy distinta en microgravedad, y nadie ha medido cómo lo hace en la Luna. La NASA lleva décadas haciendo experimentos de combustión en la ISS, pero los resultados están en tablas que solo entienden los especialistas.",
      "JaPax convierte esos experimentos públicos de la NASA (Physical Sciences Informatics, PSI) en una base de evidencia trazable: qué arde, con qué velocidad de propagación y dónde termina la evidencia. Está dirigido a investigadores en combustión, ingenieros aeroespaciales y de seguridad contra incendios, y profesionales de agencias espaciales y diseño de hábitats.",
      "Seguimos una regla: cada número muestra su fuente (PSI ID y DOI), y lo que no está medido se marca como predicho o estimado. Donde no hay datos, como en la gravedad parcial, lo decimos en vez de rellenar la brecha.",
    ],
    ptsEyebrow: "Qué puedes hacer",
    pts: [
      ["Simular", "Explora el fuego con distintas gravedades y atmósferas."],
      ["Explorar", "Consulta los experimentos de la NASA con sus fuentes y licencias."],
      ["Priorizar", "Descubre qué hallazgos importan más para una base lunar."],
      ["Preguntar", "Consulta los datos con un asistente de IA basado en las fuentes."],
    ],
    pending: "Pendiente de añadir",
    contactEyebrow: "Trabaja con nosotros",
    contactTitle: "¿Te ha gustado JaPax?",
    contact: "Si tu empresa o laboratorio ha visto algo que le interesa, nos encantaría hablar. Escríbenos por nuestros perfiles de GitHub o LinkedIn de arriba.",
    repo: "Repositorio del proyecto",
    back: "Volver al inicio",
  },
};

export default function AboutPage() {
  const t = useT(T);
  const { lang } = useLang();
  const vl = lang; // the video always matches the site language
  const [zoom, setZoom] = useState<{ src: string; name: string } | null>(null);
  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setZoom(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom]);
  return (
    <div className="pb-8">
      <div className="mx-auto max-w-6xl px-4 pt-10">
        <div className="flex flex-wrap items-center gap-5">
          <Image src="/brand/japax-isotipo.png" alt="JaPax" width={72} height={72} className="h-16 w-auto" />
          <div className="min-w-0 flex-1">
            <p className="eyebrow">{t.eyebrow}</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{t.title}</h1>
          </div>
        </div>
        <p className="mt-4 max-w-3xl text-ink-2">{t.intro}</p>
      </div>

      <div className="mx-auto mt-8 max-w-6xl px-4">
        <video
          key={vl}
          controls
          playsInline
          preload="metadata"
          poster={`/about/japax-about-${vl}.jpg?v=${VIDEO_V}`}
          className="aspect-video w-full rounded-xl border border-line-2 bg-black"
          aria-label={t.videoLabel}
        >
          <source src={`/about/japax-about-${vl}.mp4?v=${VIDEO_V}`} type="video/mp4" />
        </video>
      </div>

      <section className="mx-auto max-w-6xl px-4 pt-16">
        <div className="flex items-center gap-4 sm:gap-5">
          <Image src="/brand/japax-isotipo.png" alt="" width={72} height={72} className="h-14 w-auto sm:h-20" />
          <div>
            <h2 className="text-4xl font-bold uppercase tracking-tight sm:text-6xl">{t.teamEyebrow}</h2>
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {TEAM.map((m) => (
            <article key={m.github} className="card p-5">
              <div className="flex items-center gap-4">
                {m.photo ? (
                  <button type="button" onClick={() => setZoom({ src: m.photo!, name: m.name })} aria-label={`${t.zoom}: ${m.name}`} className="shrink-0 cursor-zoom-in rounded-full transition-transform hover:scale-105 focus-visible:outline-2">
                    <Image src={m.photo} alt={m.name} width={96} height={96} className="h-24 w-24 rounded-full border border-line-2 object-cover" />
                  </button>
                ) : (
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border border-line-2 bg-surface-2 text-xl font-semibold text-ink-2" aria-hidden="true">
                    {m.initials}
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold">{m.name}</h3>
                  <p className="text-xs text-muted">@{m.github}</p>
                </div>
              </div>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex items-baseline gap-2">
                  <dt className="w-14 shrink-0 text-muted">{t.role}</dt>
                  <dd>{t.roleValue}</dd>
                </div>
                <div className="flex items-baseline gap-2">
                  <dt className="w-14 shrink-0 text-muted">{t.bio}</dt>
                  <dd>{m.bio[lang]}</dd>
                </div>
              </dl>
              <div className="mt-4 flex flex-wrap gap-2 text-sm">
                <a className="rounded-full border border-line-2 px-3 py-1.5 text-ink-2 transition-colors hover:text-ink" href={`https://github.com/${m.github}`} target="_blank" rel="noreferrer">
                  {t.github} ↗
                </a>
                {m.linkedin ? (
                  <a className="rounded-full border border-line-2 px-3 py-1.5 text-ink-2 transition-colors hover:text-ink" href={m.linkedin} target="_blank" rel="noreferrer">
                    {t.linkedin} ↗
                  </a>
                ) : (
                  <span className="rounded-full border border-dashed border-line-2 px-3 py-1.5 text-muted">{t.linkedin}: {t.pending}</span>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      {zoom && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={zoom.name}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setZoom(null)}
        >
          <button type="button" aria-label="Close" className="absolute right-4 top-4 rounded-full border border-line-2 bg-surface-2 px-3 py-1.5 text-sm text-ink" onClick={() => setZoom(null)}>✕</button>
          <Image src={zoom.src} alt={zoom.name} width={480} height={480} className="aspect-square w-[min(90vw,80vh,32rem)] rounded-2xl border border-line-2 object-cover" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      <Section eyebrow={t.projEyebrow} title={t.projTitle}>
        <div className="mt-4 max-w-3xl space-y-3 text-ink-2">
          {t.p.map((x) => (
            <p key={x}>{x}</p>
          ))}
        </div>
        <p className="eyebrow mt-8">{t.ptsEyebrow}</p>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {t.pts.map(([h, d]) => (
            <li key={h} className="card p-4">
              <div className="font-semibold">{h}</div>
              <p className="mt-1 text-sm text-ink-2">{d}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section eyebrow={t.contactEyebrow} title={t.contactTitle}>
        <p className="mt-3 max-w-3xl text-ink-2">{t.contact}</p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <a className="link" href="https://github.com/ptricha/Japax" target="_blank" rel="noreferrer">{t.repo} ↗</a>
          <Link className="link" href="/">{t.back}</Link>
        </div>
      </Section>
    </div>
  );
}
