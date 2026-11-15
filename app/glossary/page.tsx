"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n";

type Term = [string, string];

const T = {
  en: {
    eyebrow: "Glossary",
    title: "Terms and acronyms used on JaPax",
    intro: "Short definitions, so a non-specialist can follow the evidence.",
    groups: [
      [
        "Where the data comes from",
        [
          ["PSI", "Physical Sciences Informatics: NASA's public repository of physical-science experiments, the source of every dataset here."],
          ["DOI", "Digital Object Identifier: a permanent link to a dataset or paper. Every PSI investigation used here has one."],
          ["NTRS", "NASA Technical Reports Server: NASA's archive of papers and reports, cited here by number (for example NTRS 20180005168)."],
        ],
      ],
      [
        "NASA fire experiments",
        [
          ["BASS / BASS-II", "Burning and Suppression of Solids: solid samples burned in a controlled airflow on the ISS."],
          ["SAFFIRE", "Spacecraft Fire Experiment (PSI calls it Spacecraft Fire Safety Experiment): large fires set on purpose aboard uncrewed cargo vehicles to see how a realistic fire grows in low gravity."],
          ["FLEX", "Flame Extinguishment Experiment: fuel droplets burned with different oxygen levels and diluents (CO₂, helium) to find where flames go out."],
          ["ACME", "Advanced Combustion via Microgravity Experiments: a set of flame studies on the ISS. BRE is its Burning Rate Emulator experiment."],
          ["SAME", "Smoke Aerosol Measurement Experiment: the size of the smoke particles that spacecraft materials give off."],
          ["FM2", "Flammability of Materials on the Moon: a robotic combustion chamber planned for the lunar surface on a lunar lander mission."],
          ["LUCI", "Lunar Combustion Investigation: the first extended-duration (over 25 s) burns in simulated lunar gravity, on a spinning New Shepard sounding rocket. Reported in 2025."],
        ],
      ],
      [
        "Physics",
        [
          ["Microgravity", "Almost no apparent weight, as on the ISS. Hot gas does not rise, so flames are round and burn differently."],
          ["Lunar gravity", "0.166 g, about one sixth of Earth's. No PSI combustion data exists at this level."],
          ["Concurrent / opposed flow", "The flame spreads in the same direction as the airflow (concurrent) or against it (opposed). The two have different speeds."],
          ["Quiescent", "Still air, with no forced flow."],
          ["Spread rate", "How fast a flame front moves across a material, in millimetres per second here."],
          ["Limiting oxygen concentration", "The lowest oxygen fraction at which a flame keeps burning. It is lower in microgravity than at 1 g."],
          ["Mole fraction", "The share of a gas in a mixture by number of molecules. 21% oxygen means 0.21."],
          ["psi, psia, atm", "Units of pressure. Earth's air is 14.7 psi, or 1 atm. A lunar habitat of 10.2 psi is 0.69 atm; the suit at 4.3 psi is 0.29 atm."],
        ],
      ],
      [
        "Standards, equipment and places",
        [
          ["NASA-STD-6001 Test 1", "The standard test used to screen spacecraft materials for safe use: a flame burning upward in normal gravity. BASS suggests it is not conservative for microgravity."],
          ["EMU", "Extravehicular Mobility Unit: the spacesuit used outside the ISS. It runs at about 4.3 psi."],
          ["EVA", "Extravehicular activity: a spacewalk."],
          ["ISS", "International Space Station: about 21% oxygen at 14.7 psi, in microgravity."],
          ["Lunar habitat", "Planned Moon bases: about 30% oxygen or more at 10.2 psi or less. The figure comes from the challenge statement."],
        ],
      ],
      [
        "How JaPax labels numbers",
        [
          ["Measured", "Recorded in a PSI dataset."],
          ["Reported", "Stated in a paper or NTRS report, not re-derived."],
          ["Estimated", "An assumption with no experimental source."],
          ["Simulated", "Computed by the JaPax spread model. A model, not a test."],
        ],
      ],
    ] as [string, Term[]][],
    method: "How the numbers are built",
  },
  es: {
    eyebrow: "Glosario",
    title: "Términos y siglas que usa JaPax",
    intro: "Definiciones breves para que alguien sin formación técnica pueda seguir la evidencia.",
    groups: [
      [
        "De dónde vienen los datos",
        [
          ["PSI", "Physical Sciences Informatics: el repositorio público de experimentos de ciencias físicas de la NASA, origen de todos los datos de esta web."],
          ["DOI", "Digital Object Identifier: enlace permanente a un conjunto de datos o a un artículo. Cada investigación de PSI usada aquí tiene uno."],
          ["NTRS", "NASA Technical Reports Server: el archivo de artículos e informes de la NASA, citado aquí por número (por ejemplo NTRS 20180005168)."],
        ],
      ],
      [
        "Experimentos de fuego de la NASA",
        [
          ["BASS / BASS-II", "Burning and Suppression of Solids: muestras sólidas quemadas con un flujo de aire controlado en la ISS."],
          ["SAFFIRE", "Spacecraft Fire Experiment (PSI lo llama Spacecraft Fire Safety Experiment): incendios grandes provocados a propósito en naves de carga no tripuladas para ver cómo crece un fuego real con poca gravedad."],
          ["FLEX", "Flame Extinguishment Experiment: gotas de combustible quemadas con distintos niveles de oxígeno y diluyentes (CO₂, helio) para ver dónde se apagan las llamas."],
          ["ACME", "Advanced Combustion via Microgravity Experiments: un conjunto de estudios de llamas en la ISS. BRE es su experimento Burning Rate Emulator (emulador de tasa de quemado)."],
          ["SAME", "Smoke Aerosol Measurement Experiment: el tamaño de las partículas de humo que desprenden los materiales de las naves."],
          ["FM2", "Flammability of Materials on the Moon: una cámara de combustión robótica prevista para la superficie lunar en una misión de aterrizador lunar."],
          ["LUCI", "Lunar Combustion Investigation: las primeras combustiones de larga duración (más de 25 s) en gravedad lunar simulada, en un cohete suborbital New Shepard que gira. Publicada en 2025."],
        ],
      ],
      [
        "Física",
        [
          ["Microgravedad", "Casi sin peso aparente, como en la ISS. El gas caliente no sube, así que las llamas son redondas y arden de otra forma."],
          ["Gravedad lunar", "0.166 g, cerca de una sexta parte de la terrestre. No hay datos de combustión en PSI a ese nivel."],
          ["Flujo a favor / en contra", "La llama avanza en la misma dirección que el aire (a favor) o contra él (en contra). Las velocidades son distintas."],
          ["En reposo", "Aire quieto, sin flujo forzado."],
          ["Velocidad de propagación", "Lo rápido que avanza el frente de llama sobre un material, aquí en milímetros por segundo."],
          ["Concentración límite de oxígeno", "La fracción mínima de oxígeno con la que una llama sigue ardiendo. Es menor en microgravedad que a 1 g."],
          ["Fracción molar", "La parte de un gas en una mezcla según el número de moléculas. 21% de oxígeno es 0.21."],
          ["psi, psia, atm", "Unidades de presión. El aire de la Tierra es 14.7 psi, o 1 atm. Un hábitat lunar de 10.2 psi son 0.69 atm; el traje a 4.3 psi, 0.29 atm."],
        ],
      ],
      [
        "Normas, equipos y lugares",
        [
          ["NASA-STD-6001 Test 1", "La prueba estándar para seleccionar materiales de naves aptos para su uso: una llama que arde hacia arriba en gravedad normal. BASS indica que no es conservadora para microgravedad."],
          ["EMU", "Extravehicular Mobility Unit: el traje espacial que se usa fuera de la ISS. Trabaja a unos 4.3 psi."],
          ["EVA", "Actividad extravehicular: un paseo espacial."],
          ["ISS", "Estación Espacial Internacional: cerca del 21% de oxígeno a 14.7 psi, en microgravedad."],
          ["Hábitat lunar", "Bases lunares previstas: cerca del 30% de oxígeno o más a 10.2 psi o menos. La cifra viene del enunciado del reto."],
        ],
      ],
      [
        "Cómo etiqueta JaPax las cifras",
        [
          ["Medido", "Registrado en un conjunto de datos de PSI."],
          ["Reportado", "Indicado en un artículo o informe NTRS, sin recalcular."],
          ["Estimado", "Un supuesto sin fuente experimental."],
          ["Simulado", "Calculado por el modelo de propagación de JaPax. Un modelo, no un ensayo."],
        ],
      ],
    ] as [string, Term[]][],
    method: "Cómo se construyen las cifras",
  },
};

export default function Glossary() {
  const t = useT(T);
  return (
    <div className="mx-auto max-w-4xl px-4 pb-8 pt-10">
      <p className="eyebrow">{t.eyebrow}</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{t.title}</h1>
      <p className="mt-3 text-ink-2">{t.intro}</p>

      {t.groups.map(([group, terms]) => (
        <section key={group} className="pt-10">
          <h2 className="text-xl font-semibold tracking-tight">{group}</h2>
          <dl className="card mt-3 divide-y divide-line">
            {terms.map(([k, v]) => (
              <div key={k} className="p-4 sm:grid sm:grid-cols-[13rem_1fr] sm:gap-4">
                <dt className="font-semibold">{k}</dt>
                <dd className="mt-1 text-sm text-ink-2 sm:mt-0">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}

      <p className="pt-10 text-sm">
        <Link className="link" href="/methodology">
          {t.method} →
        </Link>
      </p>
    </div>
  );
}
