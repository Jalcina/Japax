"use client";

import { useData, useT } from "@/lib/i18n";
import { Section } from "@/components/ui";

const LIBS: [string, string][] = [
  ["Next.js 16 (MIT)", "https://nextjs.org"],
  ["React 19 (MIT)", "https://react.dev"],
  ["Tailwind CSS 4 (MIT)", "https://tailwindcss.com"],
  ["TypeScript (Apache-2.0)", "https://www.typescriptlang.org"],
  ["three.js 0.187 (MIT), WebGL 3D rendering of the flame lab and simulator; its OrbitControls and post-processing add-ons are part of the same package", "https://threejs.org"],
  ["NASA 3D Resources: International Space Station (ISS) (D) (IGOAL), Mars 2020 Perseverance Rover, Apollo Lunar Module (3D models used in the Simulator and Data Lab scenes; free to use per NASA media guidelines)", "https://science.nasa.gov/3d-resources/"],
  ["NASA 3D Resources: Extravehicular Mobility Unit (EMU) spacesuit (3D model used in the Simulator and Data Lab scenes; free to use per NASA media guidelines)", "https://science.nasa.gov/3d-resources/"],
  ["Earth textures from the three.js examples (earth_atmos, earth_normal, earth_specular, earth_clouds), derived from NASA imagery", "https://github.com/mrdoob/three.js/tree/dev/examples/textures/planets"],
  ["Anthropic TypeScript SDK (MIT)", "https://github.com/anthropics/anthropic-sdk-typescript"],
  ["Geist and Geist Mono fonts (SIL Open Font License) via Google Fonts", "https://vercel.com/font"],
];

const DOCS: [string, string][] = [
  ["NASA Space Apps Challenge 2026: Flame in Freefall (challenge statement and resources)", "https://www.spaceappschallenge.org"],
  ["NASA Combustion Science, Glenn Research Center", "https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/"],
  ["A Researcher's Guide to Combustion Science (NASA, 2015)", "https://www.nasa.gov/wp-content/uploads/2016/05/np-2015-10-034-jsc_combustion_in_reduced_gravity-iss-mini-book-011116-508.pdf"],
  ["NASA fact sheets: BASS, FLEX / FLEX-2, SAME", "https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/"],
  ["Apollo 1, NASA Safety Center", "https://sma.nasa.gov/sma-disciplines/accllp/apollo-1"],
  ["Apollo 13, NASA Safety Center", "https://sma.nasa.gov/sma-disciplines/accllp/apollo-13"],
  ["25 Years Ago: Fire Aboard Space Station Mir, NASA History", "https://www.nasa.gov/history/25-years-ago-fire-aboard-space-station-mir/"],
  ["NASA Spinoff: firefighter air tanks", "https://spinoff.nasa.gov/node/9582"],
  ["NASA Spinoff: firefighter protective clothing (Project FIRES)", "https://spinoff.nasa.gov/node/9918"],
  ["NASA Spinoff: Fire Detector (Brunswick Incipient Fire Detector), NTRS", "http://hdl.handle.net/hdl:2060/20070018916"],
  ["Urban, Ferkul, Olson, Ruff, Easton et al., Saffire: A Novel Approach to Study of Spacecraft Fire Safety Using Un-manned Spacecraft, NASA NTRS 20180005168 (Table 1: spread rates used in the Simulator)", "https://ntrs.nasa.gov/citations/20180005168"],
  ["Ruff and Urban, The Spacecraft Fire Experiment (Saffire): Objectives, Development and Status, NASA NTRS 20170001636 (planned Saffire-III airflow)", "https://ntrs.nasa.gov/citations/20170001636"],
  ["Nayagam, Dietrich, Hicks and Williams, Methanol Droplet Combustion in Oxygen-Inert Environments in Microgravity, NASA NTRS 20130014061 (CO₂ and helium diluents, burning-rate constant)", "https://ntrs.nasa.gov/citations/20130014061"],
  ["NASA/TP-2015-216046, FLEX data report: test outcomes (Extinction, Completion, Disruption) and column definitions, NASA NTRS 20150023456", "https://ntrs.nasa.gov/citations/20150023456"],
  ["FM2, Flammability of Materials on the Moon (planned atmospheres 21 % O2 at 14.7 psia and 34 % at 8.2 psia), NASA NTRS 20240015307 (Fire Lab: lunar atmosphere)", "https://ntrs.nasa.gov/citations/20240015307"],
  ["LUCI, Lunar-g Combustion Investigation (first simulated lunar-gravity burns, 2025), NASA NTRS 20250010653 (Fire Lab: the only lunar-gravity anchor)", "https://ntrs.nasa.gov/citations/20250010653"],
  ["PSI-20 ACME Burner Rig Experiment (BRE), DOI 10.60555/vb93-3y72 (Fire Lab: airflow-off behavior, reported by the authors)", "https://doi.org/10.60555/vb93-3y72"],
  ["PSI-69 FLEX, DOI 10.60555/mbq8-0451, 274 droplet tests (Fire Lab: CO2 / helium suppression evidence)", "https://doi.org/10.60555/mbq8-0451"],
  ["Urban et al., Preliminary Results from the Smoke Aerosol Measurement Experiment - Reflight, NASA NTRS 20130000422", "https://ntrs.nasa.gov/citations/20130000422"],
  ["ACME / CFI-G overview (thin-filament pyrometry and cool-flame results), NASA NTRS 20210022542", "https://ntrs.nasa.gov/citations/20210022542"],
  ["Concurrent Flame Growth, Spread and Extinction over Composite Fabric Samples in Low Speed Purely Forced Flow in Microgravity (BASS / BASS-II, SIBAL quenching limit), NASA NTRS 20150008962 (Touch to burn)", "https://ntrs.nasa.gov/citations/20150008962"],
  ["Thickness and Fuel Preheating Effects on Material Flammability in Microgravity from the BASS Experiment, NASA NTRS 20140011099 (Touch to burn)", "https://ntrs.nasa.gov/citations/20140011099"],
  ["Combustion of Solids in Microgravity: Results from the BASS-II Experiment, NASA NTRS 20160000593 (Touch to burn)", "https://ntrs.nasa.gov/citations/20160000593"],
  ["Comparison of Carbon Dioxide and Helium as Fire Extinguishing Agents for Spacecraft, NASA NTRS 20040161188 (Touch to burn)", "https://ntrs.nasa.gov/citations/20040161188"],
  ["Preliminary Results from the Saffire VI Experiment, NASA NTRS 20240002981 (Touch to burn)", "https://ntrs.nasa.gov/citations/20240002981"],
  ["Extinguishment of a Diffusion Flame Over a PMMA Cylinder by Depressurization in Low-Gravity, NASA NTRS 19970020617 (Touch to burn; abstract only)", "https://ntrs.nasa.gov/citations/19970020617"],
  ["Shuttle/ISS EMU Failure History (ICES-2015-327), NASA NTRS 20150009506 (Component engine: EMU oxygen tank pressures; tank volume is not stated)", "https://ntrs.nasa.gov/citations/20150009506"],
  ["Report of the Apollo 13 Review Board, Appendices F-H (special tests and analyses), NASA NTRS 19700078913 (Component engine: oxygen-tank failure timing, ignition energy; a different tank)", "https://ntrs.nasa.gov/citations/19700078913"],
  ["Apollo 13 oxygen tank case study based on the Review Board report (TMX-65270), NASA NTRS 20110015690 (Component engine: failure path, 93 s from fan power to data loss)", "https://ntrs.nasa.gov/citations/20110015690"],
  ["Whitaker, Overview of ISS U.S. Fire Detection and Suppression System, NASA NTRS 20030053429 (Component engine, ISS: the fire alarm isolates the module by shutting off ventilation)", "https://ntrs.nasa.gov/citations/20030053429"],
  ["Rodriguez and Young, Development of the International Space Station Fine Water Mist Portable Fire Extinguisher, NASA NTRS 20130011664 (Component engine, ISS: CO2 extinguisher in the US segment, water foam in the Russian segment)", "https://ntrs.nasa.gov/citations/20130011664"],
];

const T = {
  en: {
    eyebrow: "References and method",
    title: "Every source, library and limitation",
    intro: "This page lists all external resources used in JaPax (code, text, data and fonts), as required by the NASA Space Apps submission rules. No copyrighted music, images or text were used; all graphics are original SVG.",
    dataEyebrow: "Data",
    dataTitle: "NASA data (core of the project)",
    dataPsi: "NASA Physical Sciences Informatics (PSI) investigation metadata, retrieved from the public PSI API (no authentication) at build time: objectives, hypotheses, hardware, file inventories, publications and DOIs for",
    dataPsi2: "investigations.",
    tables: "NASA PSI experimental tables PSI-69 (FLEX) and PSI-25 (BASS-II), CC0. The unmodified files were obtained from the public copy in another team's repository (github.com/ngu-ming-henn/Nasa-Space-Apps-Sarawak, data/raw/nasa_psi) because the PSI download service was unavailable; their byte sizes (24,776 and 16,590) match NASA's published metadata. JaPax computes all statistics from the rows itself.",
    docsEyebrow: "Documents",
    docsTitle: "NASA documents and pages",
    swEyebrow: "Software",
    swTitle: "Libraries, fonts and tools",
    ai: "AI assistance: the code was developed with the help of Claude (Anthropic) via Claude Code, and the optional AI narration of Pax answers can use a Claude model, with every number checked against the verified evidence. All outputs are grounded in the data above.",
    mEyebrow: "Method",
    mTitle: "How to read the numbers",
    m: [
      ["Verified, never invented.", "Each value shown comes from a cited NASA source. When a condition could not be verified, it appears as not verified and is excluded from claims."],
      ["Relevance score.", "A JaPax editorial method (0–100) combining five factors with adjustable weights: habitat atmosphere match (default 35), fuel realism (25), fire-safety focus (20), data richness (10) and modeling value (10). Unknown inputs count as a neutral 0.5 and are flagged. It is a prioritization aid, not a NASA metric."],
      ["Partial gravity.", "PSI contains no partial-gravity combustion data. Lunar and Martian conditions are shown as gaps, not extrapolated. The flammability curve is a qualitative schematic."],
      ["Data volume.", "The figure of about 12.7 TB on the home page is the sum of the totalFileSize field that the PSI API reports for each of the 19 investigations, queried on 15 November 2026. It is the size NASA declares for its published data, not data processed by JaPax. The API lists file by file only about 6.3 TB of it (15,629 files); the rest, mostly videos and large raw sets, is declared but not enumerated. The 12,146 files shown on the home page are the per-investigation file counts in the PSI metadata that JaPax catalogued, a different count from the 15,629 the API enumerates."],
      ["Data access.", "Investigation metadata and file inventories come from the PSI API. The Data Lab uses the experimental tables of FLEX (274 tests) and BASS-II (129 tests); counts and percentages are computed from the recorded rows, with no modeling. Other tables and the videos are linked to their PSI pages and are the next step of the roadmap."],
    ],
    gen: "Data generated",
    disclaimer: "JaPax is an independent project and is not affiliated with or endorsed by NASA.",
  },
  es: {
    eyebrow: "Referencias y método",
    title: "Todas las fuentes, bibliotecas y limitaciones",
    intro: "Esta página lista todos los recursos externos usados en JaPax (código, texto, datos y tipografías), como exigen las normas de entrega de NASA Space Apps. No se usó música, imágenes ni texto con derechos de autor; todos los gráficos son SVG originales.",
    dataEyebrow: "Datos",
    dataTitle: "Datos de NASA (núcleo del proyecto)",
    dataPsi: "Metadatos de las investigaciones de NASA Physical Sciences Informatics (PSI), obtenidos de la API pública de PSI (sin autenticación) al compilar: objetivos, hipótesis, hardware, inventarios de archivos, publicaciones y DOI de",
    dataPsi2: "investigaciones.",
    tables: "Tablas experimentales de NASA PSI PSI-69 (FLEX) y PSI-25 (BASS-II), CC0. Los archivos sin modificar se obtuvieron de la copia pública del repositorio de otro equipo (github.com/ngu-ming-henn/Nasa-Space-Apps-Sarawak, data/raw/nasa_psi) porque el servicio de descargas de PSI no estaba disponible; sus tamaños en bytes (24 776 y 16 590) coinciden con los metadatos publicados por NASA. JaPax calcula todas las estadísticas a partir de las filas.",
    docsEyebrow: "Documentos",
    docsTitle: "Documentos y páginas de NASA",
    swEyebrow: "Software",
    swTitle: "Bibliotecas, tipografías y herramientas",
    ai: "Asistencia de IA: el código se desarrolló con ayuda de Claude (Anthropic) mediante Claude Code, y la narración opcional por IA de Pax puede usar un modelo Claude, con cada cifra comprobada contra la evidencia verificada. Todas las salidas se basan en los datos de arriba.",
    mEyebrow: "Método",
    mTitle: "Cómo leer las cifras",
    m: [
      ["Verificado, nunca inventado.", "Cada valor mostrado procede de una fuente de NASA citada. Cuando una condición no se pudo verificar, aparece como no verificada y se excluye de las afirmaciones."],
      ["Puntuación de relevancia.", "Un método editorial de JaPax (0–100) que combina cinco factores con pesos ajustables: ajuste a la atmósfera de hábitat (35 por defecto), realismo del combustible (25), enfoque en seguridad contra incendios (20), riqueza de datos (10) y valor para modelado (10). Los datos desconocidos cuentan como un 0.5 neutro y se señalan. Es una ayuda de priorización, no una métrica de NASA."],
      ["Gravedad parcial.", "PSI no contiene datos de combustión en gravedad parcial. Las condiciones lunares y marcianas se muestran como brechas, sin extrapolar. La curva de inflamabilidad es un esquema cualitativo."],
      ["Volumen de datos.", "La cifra de unos 12.7 TB de la portada es la suma del campo totalFileSize que la API de PSI declara para cada una de las 19 investigaciones, consultada el 15 de noviembre de 2026. Es el tamaño que la NASA declara para sus datos publicados, no datos procesados por JaPax. La API solo enumera archivo por archivo unos 6.3 TB (15 629 archivos); el resto, sobre todo vídeos y conjuntos brutos grandes, está declarado pero no enumerado. Los 12 146 archivos de la portada son los recuentos por investigación de los metadatos de PSI que JaPax catalogó, una cuenta distinta de los 15 629 que enumera la API."],
      ["Acceso a los datos.", "Los metadatos de las investigaciones y los inventarios de archivos vienen de la API de PSI. El Laboratorio de datos usa las tablas experimentales de FLEX (274 ensayos) y BASS-II (129 ensayos); los recuentos y porcentajes se calculan a partir de las filas registradas, sin modelado. Las demás tablas y los vídeos enlazan a sus páginas de PSI y son el siguiente paso de la hoja de ruta."],
    ],
    gen: "Datos generados el",
    disclaimer: "JaPax es un proyecto independiente, sin afiliación ni respaldo de NASA.",
  },
};

export default function References() {
  const t = useT(T);
  const data = useData();
  return (
    <div className="mx-auto max-w-4xl px-4 pb-4 pt-10">
      <p className="eyebrow">{t.eyebrow}</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{t.title}</h1>
      <p className="mt-3 text-ink-2">{t.intro}</p>

      <Section eyebrow={t.dataEyebrow} title={t.dataTitle}>
        <ul className="card mt-4 divide-y divide-line">
          <li className="p-3 text-sm">
            <strong>NASA Physical Sciences Informatics (PSI)</strong> {t.dataPsi} {data.investigations.length} {t.dataPsi2}{" "}
            <a className="link" href="https://psi.nasa.gov" target="_blank" rel="noreferrer">psi.nasa.gov ↗</a>
          </li>
          {data.investigations.map((i) => (
            <li key={i.id} className="flex flex-wrap items-baseline justify-between gap-2 p-3 text-sm">
              <span>
                {i.acronym} <span className="text-muted">({i.psiId})</span>
              </span>
              {i.doiUrl && (
                <a className="link text-xs" href={i.doiUrl} target="_blank" rel="noreferrer">
                  doi:{i.doi} ↗
                </a>
              )}
            </li>
          ))}
        </ul>
      </Section>

      {Object.keys(data.ntrsTopics ?? {}).length > 0 && (
        <Section eyebrow="NASA NTRS" title="NASA Technical Reports Server literature">
          <p className="mt-2 text-sm text-ink-2">Public reports retrieved from the NTRS API (ntrs.nasa.gov). Listed here as references for topics where PSI holds no data, such as lunar and partial gravity.</p>
          {Object.entries(data.ntrsTopics ?? {}).filter(([, l]) => l.length > 0).map(([topic, list]) => (
            <div key={topic} className="mt-4">
              <h3 className="text-sm font-semibold">{topic}</h3>
              <ul className="card mt-2 divide-y divide-line">
                {list.map((r) => (
                  <li key={r.id} className="p-3 text-sm">
                    <a className="link" href={r.url} target="_blank" rel="noreferrer">{r.title} ↗</a>
                    <span className="text-xs text-muted"> · {r.year}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Section>
      )}

      <Section eyebrow={t.docsEyebrow} title={t.docsTitle}>
        <ul className="card mt-4 divide-y divide-line">
          <li className="p-3 text-sm">
            {t.tables}{" "}
            <a className="link" href="https://github.com/ngu-ming-henn/Nasa-Space-Apps-Sarawak" target="_blank" rel="noreferrer">
              ↗
            </a>
          </li>
          {DOCS.map(([title, url]) => (
            <li key={url + title} className="p-3 text-sm">
              {title}{" "}
              <a className="link" href={url} target="_blank" rel="noreferrer">
                ↗
              </a>
            </li>
          ))}
        </ul>
      </Section>

      <Section eyebrow={t.swEyebrow} title={t.swTitle}>
        <ul className="card mt-4 divide-y divide-line">
          {LIBS.map(([title, url]) => (
            <li key={title} className="p-3 text-sm">
              {title}{" "}
              <a className="link" href={url} target="_blank" rel="noreferrer">
                ↗
              </a>
            </li>
          ))}
          <li className="p-3 text-sm">{t.ai}</li>
        </ul>
      </Section>

      <Section eyebrow={t.mEyebrow} title={t.mTitle}>
        <div className="mt-4 space-y-3 text-sm text-ink-2">
          {t.m.map(([h, body]) => (
            <p key={h}>
              <strong className="text-ink">{h}</strong> {body}
            </p>
          ))}
          <p className="text-xs text-muted">
            {t.gen} {data.generatedAt.slice(0, 10)}. {t.disclaimer}
          </p>
        </div>
      </Section>
    </div>
  );
}
