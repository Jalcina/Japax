"use client";

import Image from "next/image";
import Link from "next/link";
import { useT } from "@/lib/i18n";
import { Pending, Section } from "@/components/ui";

// Fill these in when available. Anything left empty is shown as "pending", never invented.
// Photos: put a file in /public/team/ and set `photo` (e.g. "/team/jaime.jpg").
const TEAM: { name: string; initials: string; github: string; linkedin?: string; photo?: string }[] = [
  { name: "Jaime Alcina", initials: "JA", github: "Jalcina" },
  { name: "Pablo", initials: "P", github: "ptricha" },
];

const T = {
  en: {
    videoLabel: "JaPax introduction video (36 seconds, in English)",
    eyebrow: "About us",
    title: "The team behind JaPax",
    intro: "JaPax was built by two people for the NASA Space Apps Challenge 2026 (Seville), answering the challenge “Flame in Freefall”.",
    teamEyebrow: "The creators",
    teamTitle: "Jaime and Pablo",
    role: "Role",
    bio: "Bio",
    linkedin: "LinkedIn",
    github: "GitHub",
    projEyebrow: "The project",
    projTitle: "What JaPax is and why we built it",
    p: [
      "Fire behaves very differently in microgravity, and no one has measured how it behaves on the Moon. NASA has run decades of combustion experiments on the ISS, but the results sit in tables that only specialists can read.",
      "JaPax turns those public experiments from NASA's Physical Sciences Informatics (PSI) into clear answers: what burns, how fast, and where the evidence stops. It is meant for teachers, researchers, aerospace engineers and curious people alike.",
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
    videoLabel: "Vídeo de presentación de JaPax (36 segundos, en inglés)",
    eyebrow: "Sobre nosotros",
    title: "El equipo detrás de JaPax",
    intro: "JaPax lo hemos creado dos personas para el NASA Space Apps Challenge 2026 (Sevilla), respondiendo al reto “Flame in Freefall”.",
    teamEyebrow: "Los creadores",
    teamTitle: "Jaime y Pablo",
    role: "Rol",
    bio: "Bio",
    linkedin: "LinkedIn",
    github: "GitHub",
    projEyebrow: "El proyecto",
    projTitle: "Qué es JaPax y por qué lo hicimos",
    p: [
      "El fuego se comporta de forma muy distinta en microgravedad, y nadie ha medido cómo lo hace en la Luna. La NASA lleva décadas haciendo experimentos de combustión en la ISS, pero los resultados están en tablas que solo entienden los especialistas.",
      "JaPax convierte esos experimentos públicos de la NASA (Physical Sciences Informatics, PSI) en respuestas claras: qué arde, con qué rapidez y dónde termina la evidencia. Está pensado para profesores, investigadores, ingenieros aeroespaciales y curiosos.",
      "Seguimos una regla: cada número muestra su fuente (PSI ID y DOI), y lo que no está medido se marca como predicho o estimado. Donde no hay datos, como en la gravedad parcial, lo decimos en vez de rellenar el hueco.",
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
          controls
          playsInline
          preload="metadata"
          poster="/about/japax-about-poster.jpg"
          className="aspect-video w-full rounded-xl border border-line-2 bg-black"
          aria-label={t.videoLabel}
        >
          <source src="/about/japax-about.mp4" type="video/mp4" />
        </video>
      </div>

      <Section eyebrow={t.teamEyebrow} title={t.teamTitle}>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {TEAM.map((m) => (
            <article key={m.github} className="card p-5">
              <div className="flex items-center gap-4">
                {m.photo ? (
                  <Image src={m.photo} alt={m.name} width={72} height={72} className="h-[72px] w-[72px] rounded-full object-cover" />
                ) : (
                  <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full border border-line-2 bg-surface-2 text-xl font-semibold text-ink-2" aria-hidden="true">
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
                  <dd><Pending>{t.pending}</Pending></dd>
                </div>
                <div className="flex items-baseline gap-2">
                  <dt className="w-14 shrink-0 text-muted">{t.bio}</dt>
                  <dd><Pending>{t.pending}</Pending></dd>
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
      </Section>

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
