/** One popover of the guided tour. `sel` is a CSS selector for the element it points at (falls back to a centred card). */
export type Step = { sel: string; title: string; body: string; tryIt?: string };

const MENU = "header";

export const GUIDE_T = {
  en: {
    page: (i: number, n: number) => `Page ${i} of ${n}`,
    step: (i: number, n: number) => `Step ${i} of ${n}`,
    back: "Back",
    next: "Next",
    nextPage: (name: string) => `Continue to ${name}`,
    finish: "Finish tour",
    skip: "Skip tour",
    restart: "Start over",
    resumed: "Welcome back. Resuming where you left off.",
    tryLabel: "Try it",
    pageNames: { "/": "Overview", "/history": "Chronology", "/simulator": "Simulator", "/explorer": "Investigations", "/dashboard": "Ranking", "/references": "Sources" } as Record<string, string>,
    steps: {
      "/": [
        { sel: "main h1", title: "Scope", body: "JaPax consolidates NASA's microgravity combustion investigations (PSI/NTRS) into a traceable evidence base for spacecraft and lunar-habitat fire safety. Every figure carries its PSI ID, DOI and an evidence tag: measured, reported, estimated or simulated." },
        { sel: MENU, title: "Navigation", body: "Sections follow the safety-engineering workflow: incident record, simulation, investigations, multi-criteria ranking, fire-safety evidence and sources." },
        { sel: "[data-pax]", title: "Pax", body: "Pax answers technical questions against the PSI corpus and flags every statement that falls outside it. Use it to query the data or to restart this tour." },
      ],
      "/history": [
        { sel: "main h1", title: "Chronology", body: "Mishaps that shaped spacecraft fire-safety requirements, from the Apollo 1 cabin fire to the Mir oxygen-candle fire. Each entry links to its primary source." },
        { sel: "main ol", title: "Timeline", body: "Chronological, from the first accidents to current flight experiments such as Saffire, SAME and FLEX.", tryIt: "Scroll down and open any event." },
      ],
      "/simulator": [
        { sel: "main h1", title: "Component-level fire model", body: "Select an environment, ignite a component and observe spread across the component graph. Every parameter is tagged measured, reported, estimated or simulated." },
        { sel: "#sim-tabs", title: "Three views", body: "Touch to burn is the spread and suppression model. Evidence summarises the recorded tests. Data exposes the raw PSI test tables.", tryIt: "Open the Evidence tab, then come back." },
        { sel: "#fire-lab", title: "Touch to burn", body: "Ignite any component in the 3D scene and watch the state variables update. Then apply mitigation measures and review the run record (CSV/TXT).", tryIt: "Select a component." },
        { sel: "section[aria-live=polite]", title: "Boundary conditions", body: "Gauges summarise the environment: oxygen mole fraction, total pressure and gravity level." },
      ],
      "/explorer": [
        { sel: "main h1", title: "Investigation catalogue", body: "The PSI/NTRS investigations behind JaPax. Each entry gives the fuel, atmosphere, flow and gravity conditions, the diagnostics used and the data licence." },
        { sel: "main input:not([type=checkbox])", title: "Search", body: "Filter by keyword, e.g. smoke, oxygen or extinction.", tryIt: "Search for smoke." },
        { sel: "main input[type=checkbox]", title: "Side-by-side comparison", body: "Select up to three investigations to compare their test conditions in a table." },
      ],
      "/dashboard": [
        { sel: "main h1", title: "Multi-criteria ranking", body: "Investigations do not carry equal weight for every objective. Weight the criteria to rank them for your use case." },
        { sel: "input[type=range]", title: "Criterion weights", body: "Each slider sets the weight of one criterion; the ranking recomputes immediately.", tryIt: "Move one slider and watch the ranking change." },
      ],
      "/references": [
        { sel: "main h1", title: "Provenance", body: "Datasets, libraries, licences and method limitations. This ends the tour." },
      ],
    } as Record<string, Step[]>,
  },
  es: {
    page: (i: number, n: number) => `Página ${i} de ${n}`,
    step: (i: number, n: number) => `Paso ${i} de ${n}`,
    back: "Atrás",
    next: "Siguiente",
    nextPage: (name: string) => `Continuar a ${name}`,
    finish: "Terminar",
    skip: "Saltar recorrido",
    restart: "Empezar de nuevo",
    resumed: "Bienvenido de nuevo. Retomamos donde lo dejaste.",
    tryLabel: "Pruébalo",
    pageNames: { "/": "Inicio", "/history": "Cronología", "/simulator": "Simulador", "/explorer": "Investigaciones", "/dashboard": "Ranking", "/references": "Fuentes" } as Record<string, string>,
    steps: {
      "/": [
        { sel: "main h1", title: "Alcance", body: "JaPax consolida las investigaciones de combustión en microgravedad de NASA (PSI/NTRS) en una base de evidencia trazable para la seguridad contra incendios en naves y hábitats lunares. Cada cifra lleva su PSI ID, su DOI y una etiqueta de evidencia: medido, reportado, estimado o simulado." },
        { sel: MENU, title: "Navegación", body: "Las secciones siguen el flujo de trabajo de ingeniería de seguridad: registro de incidentes, simulación, investigaciones, ranking multicriterio, evidencia de seguridad contra incendios y fuentes." },
        { sel: "[data-pax]", title: "Pax", body: "Pax responde consultas técnicas sobre el corpus PSI y señala cada afirmación que queda fuera de él. Úsalo para consultar los datos o reiniciar este recorrido." },
      ],
      "/history": [
        { sel: "main h1", title: "Cronología", body: "Siniestros que moldearon los requisitos de seguridad contra incendios en naves, desde el incendio de la cabina del Apollo 1 hasta el de la vela de oxígeno de la Mir. Cada entrada enlaza a su fuente primaria." },
        { sel: "main ol", title: "Cronología", body: "En orden cronológico, desde los primeros accidentes hasta los experimentos en vuelo actuales, como Saffire, SAME y FLEX.", tryIt: "Baja y abre cualquier evento." },
      ],
      "/simulator": [
        { sel: "main h1", title: "Modelo de incendio por componentes", body: "Elige un entorno, inicia el fuego en un componente y observa la propagación por el grafo de componentes. Cada parámetro lleva su etiqueta: medido, reportado, estimado o simulado." },
        { sel: "#sim-tabs", title: "Tres vistas", body: "Toca y arde es el modelo de propagación y supresión. Evidencia resume los ensayos registrados. Datos expone las tablas de ensayos PSI sin tratar.", tryIt: "Abre la pestaña Evidencia y vuelve." },
        { sel: "#fire-lab", title: "Toca y arde", body: "Inicia el fuego en cualquier componente de la escena 3D y observa cómo se actualizan las variables de estado. Después aplica medidas de mitigación y revisa el registro de la ejecución (CSV/TXT).", tryIt: "Selecciona un componente." },
        { sel: "section[aria-live=polite]", title: "Condiciones de contorno", body: "Los indicadores resumen el entorno: fracción molar de oxígeno, presión total y nivel de gravedad." },
      ],
      "/explorer": [
        { sel: "main h1", title: "Catálogo de investigaciones", body: "Las investigaciones PSI/NTRS que sustentan JaPax. Cada ficha recoge el combustible, la atmósfera, el flujo y la gravedad, los diagnósticos empleados y la licencia de los datos." },
        { sel: "main input:not([type=checkbox])", title: "Búsqueda", body: "Filtra por palabra clave, p. ej. humo, oxígeno o extinción.", tryIt: "Busca humo." },
        { sel: "main input[type=checkbox]", title: "Comparación en paralelo", body: "Selecciona hasta tres investigaciones para comparar sus condiciones de ensayo en una tabla." },
      ],
      "/dashboard": [
        { sel: "main h1", title: "Ranking multicriterio", body: "Las investigaciones no pesan igual para cada objetivo. Pondera los criterios para ordenarlas según tu caso de uso." },
        { sel: "input[type=range]", title: "Ponderación de criterios", body: "Cada control fija el peso de un criterio; el ranking se recalcula al instante.", tryIt: "Mueve un control y observa cómo cambia el ranking." },
      ],
      "/references": [
        { sel: "main h1", title: "Procedencia", body: "Conjuntos de datos, librerías, licencias y limitaciones del método. Aquí termina el recorrido." },
      ],
    } as Record<string, Step[]>,
  },
};
