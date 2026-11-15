/**
 * Spanish layer of the component engine (pure, testable with plain node).
 *
 * The engine, the catalogs and the run record are written in English: that is the canonical, cited text and what the tests check.
 * Spanish is produced at display time: `esText` looks a string up in the catalog dictionary (data/components/es.json, one entry per
 * English sentence of the catalogs), then in the exact-match table of the engine texts below, then in a few templates for the
 * sentences that carry numbers or measure ids. Anything it does not know comes back unchanged (English) rather than being guessed.
 */
/** catalog dictionary (data/components/es.json): registered by lib/componentEnvs.ts, which already imports the catalog JSON files (plain node cannot import JSON without an attribute) */
let CATALOG_ES: Record<string, string> = {};
export function setCatalogEs(dict: Record<string, string>) {
  CATALOG_ES = { ...dict };
  // shortLabel (lib/componentReport) drops a trailing "(...)" from the English label before it is shown, so the short form needs its own entry
  const drop = (s: string) => s.replace(/\s*\([^()]*\)\s*$/, "");
  for (const [en, es] of Object.entries(dict)) {
    const a = drop(en), b = drop(es);
    if (a !== en && !(a in CATALOG_ES)) CATALOG_ES[a] = b;
  }
}

const EXACT: Record<string, string> = {
  // engine reasons (lib/componentSpread.ts)
  "ignition point chosen by the user": "punto de ignición elegido por el usuario",
  "FORCED FAILURE scenario for the demo, not a prediction": "escenario de FALLO FORZADO para la demostración, no una predicción",
  "non-combustible material: it cannot carry the flame": "material no combustible: no puede transportar la llama",
  "ignited by the released fuel/oxidiser (estimated)": "encendido por el combustible/oxidante liberado (estimado)",
  "no path ignited it within this run": "ninguna vía lo encendió durante esta simulación",
  // labPhysics notes
  "no airflow at ~21 % O2 in 0 g: the flame starves (PSI-20 BRE, reported)": "sin flujo de aire a ~21 % de O2 en 0 g: la llama se queda sin comburente (PSI-20 BRE, reportado)",
  "scaled from the SAFFIRE anchor; the factors are estimated": "escalado a partir del ancla SAFFIRE; los factores son estimados",
  // end reasons (engine + UI)
  "a measure stopped the fire from reaching at least one component, and nothing else was left to ignite": "una medida impidió que el fuego llegara al menos a un componente y no quedaba nada más por encender",
  "the flame starved before reaching the next component (not enough airflow for this oxygen level and gravity)": "la llama se quedó sin comburente antes de llegar al siguiente componente (flujo de aire insuficiente para este nivel de oxígeno y esta gravedad)",
  "every component the fire could reach within the horizon has been reached; nothing is left to ignite": "se han alcanzado todos los componentes que el fuego podía alcanzar dentro del horizonte; no queda nada por encender",
  "an energetic component ruptured and its consequences have played out; nothing else is left to ignite": "un componente energético se rompió y sus consecuencias ya han ocurrido; no queda nada más por encender",
  "the look-ahead limit of this environment was reached while the fire could still spread": "se alcanzó el límite de horizonte de este entorno mientras el fuego aún podía propagarse",
  "the lab's own suppression system put the surface fire out": "el propio sistema de supresión del laboratorio apagó el fuego de superficie",
  "the run was stopped before it ended (a new ignition was started or the environment was left); events after that moment never happened": "la simulación se detuvo antes de terminar (se inició una nueva ignición o se salió del entorno); los eventos posteriores a ese momento nunca ocurrieron",
  "the run had not ended yet when this record was taken; events after that moment have not happened": "la simulación aún no había terminado cuando se tomó este registro; los eventos posteriores a ese momento no han ocurrido",
  "stopped": "detenida",
  // notes of the parts the maps declare as not simulated (data/components/*.map.json, "ignored")
  "bare ground: not a component (no continuous fuel in the model)": "suelo desnudo: no es un componente (sin combustible continuo en el modelo)",
  "distant ridge of the scenery: not a component": "cresta lejana del escenario: no es un componente",
  "hidden by the scene (partially transmissive)": "oculto por la escena (parcialmente transparente)",
  "structure or fixture of the procedural scene: treated as non-combustible and not simulated": "estructura o accesorio de la escena procedural: se trata como no combustible y no se simula",
  "outside the pressurised volume: no oxidiser, so a flame cannot burn there; not simulated": "fuera del volumen presurizado: sin oxidante una llama no puede arder allí; no se simula",
  "external thermal insulation blankets: outside the pressurised volume: no oxidiser, so a flame cannot burn there; not simulated": "mantas de aislamiento térmico externas: fuera del volumen presurizado; sin oxidante una llama no puede arder allí; no se simula",
  "lettering decal on a module surface, not a component": "rotulación adhesiva en la superficie de un módulo, no es un componente",
  "this mesh has no material and nothing visible when isolated; not identified (ignored by mesh name)": "esta malla no tiene material y no se ve nada al aislarla; sin identificar (ignorada por el nombre de la malla)",
  "Martian ground: not a component": "suelo marciano: no es un componente",
  "transparent helper mesh of the model: not a component": "malla auxiliar transparente del modelo: no es un componente",
  "lunar ground: not a component": "suelo lunar: no es un componente",
  "small indicator dot: not a component": "pequeño punto indicador: no es un componente",
  // catalog: energetic contents
  "Oxygen (primary and secondary vessels of the PLSS)": "Oxígeno (recipientes primario y secundario del PLSS)",
  // labPhysics factors
  "Anchor": "Ancla",
  "Oxygen": "Oxígeno",
  "Airflow": "Flujo de aire",
  "Gravity": "Gravedad",
  "Material": "Material",
  "Measured concurrent spread on thin fabric (SAFFIRE I-III, 1.8-2.6 mm/s).": "Propagación a favor del flujo medida en tela fina (SAFFIRE I-III, 1.8-2.6 mm/s).",
  "Spread rises with O2 in microgravity (qualitative). The exponent 1.3 is a modelling choice, relative to 22 % O2.": "La propagación aumenta con el O2 en microgravedad (cualitativo). El exponente 1.3 es una decisión de modelado, relativa al 22 % de O2.",
  "No airflow near 21 % O2 in 0 g: the flame starves.": "Sin flujo de aire cerca del 21 % de O2 en 0 g: la llama se queda sin comburente.",
  "Flame quenches below about 1-5 cm/s at 16-21 % O2; the steps 15/5/1 cm/s are a discretisation. With gravity, buoyant convection supplies air, so low forced flow matters less.": "La llama se extingue por debajo de unos 1-5 cm/s con 16-21 % de O2; los escalones 15/5/1 cm/s son una discretización. Con gravedad, la convección por flotabilidad aporta aire, así que un flujo forzado bajo importa menos.",
  "1 g spread was faster than microgravity in PMMA rods and silicone tests. The slope 0.8 per g is a modelling choice; partial gravity (Moon) is an extrapolation.": "A 1 g la propagación fue más rápida que en microgravedad en varillas de PMMA y pruebas con silicona. La pendiente 0.8 por g es una decisión de modelado; la gravedad parcial (Luna) es una extrapolación.",
  "Thicker or non-fabric solids spread slower (PMMA rods: slower with diameter). The exact factor is a modelling choice; cable insulation has no flame-spread data at all.": "Los sólidos más gruesos o que no son tela propagan más despacio (varillas de PMMA: más lento con el diámetro). El factor exacto es una decisión de modelado; el aislante de cable no tiene datos de propagación de llama.",
  "NTRS 20160000593 (BASS-II, PMMA rods, O2 16-21 %)": "NTRS 20160000593 (BASS-II, varillas de PMMA, O2 16-21 %)",
  "NTRS 20150008962 (SIBAL, flow 1-40 cm/s); PSI-20 ACME BRE": "NTRS 20150008962 (SIBAL, flujo 1-40 cm/s); PSI-20 ACME BRE",
  "NTRS 20160000593; PSI-99 (silicone, 1 g vs 0 g)": "NTRS 20160000593; PSI-99 (silicona, 1 g frente a 0 g)",
  "NTRS 20160000593; no cable flame-spread dataset": "NTRS 20160000593; no hay datos de propagación de llama en cables",
  // run record: generic
  "(whole simulation)": "(toda la simulación)",
  "JaPax component engine: end rule of lib/componentSpread.ts": "Motor de componentes de JaPax: regla de fin de lib/componentSpread.ts",
  "labPhysics.spreadFactors: PSI-20 ACME BRE (reported), no airflow near 21 % O2 in 0 g": "labPhysics.spreadFactors: PSI-20 ACME BRE (reportado), sin flujo de aire cerca del 21 % de O2 en 0 g",
  "JaPax component engine (lib/componentSpread) with labPhysics.spreadFactors; SAFFIRE anchor NTRS 20180005168 scaled by estimated factors": "Motor de componentes de JaPax (lib/componentSpread) con labPhysics.spreadFactors; ancla SAFFIRE NTRS 20180005168 escalada con factores estimados",
  // safety ladder evidence (lib/runRecord.ts SAFETY_EVIDENCE)
  "known: BASS-II burned materials in microgravity at air-like oxygen (PSI-25)": "conocido: BASS-II quemó materiales en microgravedad con oxígeno similar al del aire (PSI-25)",
  "known: SAME measured spacecraft smoke particles, 100-200 nm on average": "conocido: SAME midió las partículas de humo de una nave, de 100-200 nm de media",
  "partial: Saffire-I/II/III observed spread on large samples; spread is observed, not modelled": "parcial: Saffire-I/II/III observaron la propagación en muestras grandes; la propagación se observa, no se modela",
  "partial: FLEX (PSI-69) droplet tests with CO2 and helium; the flammability limit is lower in reduced gravity": "parcial: pruebas de gotas de FLEX (PSI-69) con CO2 y helio; el límite de inflamabilidad es menor con gravedad reducida",
  "partial: no BASS-II solid-material test reached 26.5 % O2; BRE gas flames kept burning without airflow in oxygen-enriched air": "parcial: ninguna prueba de materiales sólidos de BASS-II llegó al 26.5 % de O2; las llamas de gas de BRE siguieron ardiendo sin flujo de aire en aire enriquecido con oxígeno",
  "unknown: the smoke baseline comes from ISS air; no detector results at lunar oxygen, pressure or gravity": "desconocido: la referencia de humo viene del aire de la ISS; no hay resultados de detectores con el oxígeno, la presión o la gravedad lunares",
  "unknown: PSI holds no partial-gravity combustion data; LUCI (2025) and FM2 are the first": "desconocido: PSI no contiene datos de combustión en gravedad parcial; LUCI (2025) y FM2 serán los primeros",
  "partial: of the FLEX tests at lunar-like conditions few ended in extinction; suppression there is the least understood step": "parcial: de las pruebas de FLEX en condiciones similares a las lunares pocas terminaron en extinción; la supresión ahí es el paso menos comprendido",
  "not available: the safety page has no entry for Earth": "no disponible: la página de seguridad no tiene entrada para la Tierra",
  "not available: the PSI experiments are microgravity tests, so 1 g on Earth is the least evidenced side of the lab": "no disponible: los experimentos PSI son pruebas en microgravedad, así que 1 g en la Tierra es el lado menos respaldado por evidencia del laboratorio",
  "unknown: no verified test at 100 % O2 and 4.3 psi": "desconocido: no hay ninguna prueba verificada al 100 % de O2 y 4.3 psi",
  "unknown: no verified data": "desconocido: no hay datos verificados",
  "no entry for this environment in the safety page": "sin entrada para este entorno en la página de seguridad",
};

const q = '"([^"]+)"';
const TEMPLATES: Array<[RegExp, (m: RegExpExecArray) => string]> = [
  [new RegExp(`^fire put out by measure ${q} at (.+) s$`), (m) => `fuego apagado por la medida «${m[1]}» a los ${m[2]} s`],
  [/^oxygen (.+) % is below the 10 % lower edge of the model: the flame cannot spread \(estimated\)$/, (m) => `el oxígeno (${m[1]} %) está por debajo del límite inferior del 10 % del modelo: la llama no puede propagarse (estimado)`],
  [/^the flame starves: (.+)$/, (m) => `la llama se queda sin comburente: ${esText(m[1])}`],
  [/^front reaches it at (.+) mm\/s \((.+)\)$/, (m) => `el frente llega a ${m[1]} mm/s (${esText(m[2])})`],
  [new RegExp(`^airflow changed by measure ${q} at (.+) s: the flame starves \\((.+)\\)$`), (m) => `el flujo de aire cambió por la medida «${m[1]}» a los ${m[2]} s: la llama se queda sin comburente (${esText(m[3])})`],
  [new RegExp(`^front slowed to (.+) mm/s after measure ${q} at (.+) s \\((.+)\\)$`), (m) => `el frente se frenó a ${m[1]} mm/s tras la medida «${m[2]}» a los ${m[3]} s (${esText(m[4])})`],
  [new RegExp(`^the fire was put out by measure ${q} at (.+) s, before the front arrived$`), (m) => `el fuego se apagó por la medida «${m[1]}» a los ${m[2]} s, antes de que llegara el frente`],
  [new RegExp(`^edge cut by measure ${q} at (.+) s$`), (m) => `unión cortada por la medida «${m[1]}» a los ${m[2]} s`],
  [/^heated for about (.+) s \(assumed range (.+) s, no dataset\)$/, (m) => `calentado unos ${m[1]} s (rango supuesto ${m[2]} s, sin conjunto de datos)`],
  [/^inside the declared blast radius \((.+) m, assumption\)$/, (m) => `dentro del radio de explosión declarado (${m[1]} m, suposición)`],
  [new RegExp(`^pressure relieved by measure ${q} before the failure window closes$`), (m) => `presión aliviada por la medida «${m[1]}» antes de que se cierre la ventana de fallo`],
  [/^Simulation ended \((.+)\): (.+)$/, (m) => `Simulación terminada (${m[1]}): ${esText(m[2])}`],
  [/^hidden by the scene \(name ends in (.+)\)$/, (m) => `oculto por la escena (el nombre termina en ${m[1]})`],
  [/^blast of (.+)$/, (m) => `explosión de ${esText(m[1])}`],
  [/^applied: (.+)$/, (m) => `aplicadas: ${m[1]}`],
];

/** Spanish text for an English engine/catalog string; unknown strings come back unchanged */
export function esText(s: string): string {
  if (!s) return s;
  const hit = CATALOG_ES[s] ?? EXACT[s];
  if (hit !== undefined) return hit;
  for (const [re, f] of TEMPLATES) {
    const m = re.exec(s);
    if (m) return f(m);
  }
  return s;
}

/** the same lookup for a language: English is the identity */
export const textFor = (lang: "en" | "es") => (lang === "es" ? esText : (s: string) => s);

export const STATE_ES: Record<string, string> = {
  intact: "Intacto", not_reached: "No alcanzado", burning: "Ardiendo", extinguished: "Apagado", damaged: "Dañado",
  relieved: "Presión aliviada", ruptured: "Roto", end: "Simulación terminada",
};
export const STATE_EN: Record<string, string> = {
  intact: "Intact", not_reached: "Not reached", burning: "Burning", extinguished: "Extinguished", damaged: "Damaged",
  relieved: "Pressure relieved", ruptured: "Ruptured", end: "Simulation ended",
};
export const TAG_ES: Record<string, string> = { measured: "medido", reported: "reportado", predicted: "predicho", estimated: "estimado" };
export const MATERIAL_ES: Record<string, string> = { cable: "cable", fabric: "tela", inert: "inerte", liquid: "líquido", plastic: "plástico" };
export const END_REASON_ES: Record<string, string> = {
  extinguished_by_measure: "apagado por una medida", self_extinguished: "se apagó solo", burned_out: "todo lo alcanzable ya ardió",
  ruptured_and_settled: "rotura y consecuencias ya ocurridas", horizon_reached: "límite de horizonte alcanzado",
  extinguished_by_suppression_system: "apagado por el sistema de supresión del laboratorio", interrupted_by_user: "interrumpida por el usuario", in_progress: "en curso",
};
export const ENERGETIC_KIND_ES: Record<string, string> = { pressure_vessel: "recipiente a presión" };
