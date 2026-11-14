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
    tryLabel: "Try it",
    pageNames: { "/": "Home", "/learn": "Basics", "/history": "History", "/simulator": "Simulator", "/explorer": "Experiments", "/dashboard": "Ranking", "/references": "Sources" } as Record<string, string>,
    steps: {
      "/": [
        { sel: "main h1", title: "Why this exists", body: "Fire is one of the most dangerous things that can happen on a trip to the Moon or Mars. NASA has run fire experiments in space for decades. JaPax turns them into clear answers." },
        { sel: MENU, title: "The menu", body: "Every part of the site is here, ordered so you can learn step by step. If you are new to the topic, go to Basics first." },
        { sel: "[data-pax]", title: "Your guide", body: "I am Pax. Click me at any time to ask a question in your own words in a large window, or to restart this tour." },
      ],
      "/learn": [
        { sel: "main h1", title: "Start from zero", body: "No background needed. This page explains, in plain words, why fire behaves differently in space." },
        { sel: "main h2", title: "Key ideas", body: "Each card is one idea. Read them in order; later pages build on them.", tryIt: "Read the first card." },
        { sel: "main h2:last-of-type", title: "Glossary", body: "Any technical word you meet later on the site is explained here.", tryIt: "Come back here whenever a term is unclear." },
      ],
      "/history": [
        { sel: "main h1", title: "Real fires, real lessons", body: "Space fire research exists because of real accidents. This page tells that story." },
        { sel: "main ol", title: "The timeline", body: "Events appear in order, from the first accidents to today's experiments. Each one links to its source.", tryIt: "Scroll down and open any event." },
      ],
      "/simulator": [
        { sel: "main h1", title: "One fire, many places", body: "Pick a place, tap a surface and watch a simulated fire spread. Every number is labelled measured, reported, estimated or simulated." },
        { sel: "#sim-tabs", title: "Three sections", body: "Touch to burn is the simulator. Evidence shows what NASA actually measured. Data holds the raw test tables.", tryIt: "Open the Evidence tab, then come back." },
        { sel: "#fire-lab", title: "Touch to burn", body: "Tap any surface in the 3D scene: the fire starts there and spreads while the live data change. Then try the fire-suppression panel.", tryIt: "Tap a surface." },
        { sel: "section[aria-live=polite]", title: "The numbers", body: "These gauges summarise what changes in each place: oxygen, pressure and gravity." },
      ],
      "/explorer": [
        { sel: "main h1", title: "Every experiment in one place", body: "These are the NASA investigations behind JaPax. Each shows what was burned, under which conditions, and how it was measured." },
        { sel: "main input:not([type=checkbox])", title: "Search", body: "Type a word, such as smoke or oxygen, to narrow the list.", tryIt: "Try searching for smoke." },
        { sel: "main input[type=checkbox]", title: "Compare up to three", body: "Tick up to three experiments to see them side by side in a table." },
      ],
      "/dashboard": [
        { sel: "main h1", title: "What matters most to you?", body: "Not every experiment is equally useful for every goal. Tell the ranking your priorities and it re-orders the experiments." },
        { sel: "input[type=range]", title: "Set your priorities", body: "Each slider is one criterion. Move it towards Essential for what you care about.", tryIt: "Move one slider and watch the ranking change." },
      ],
      "/references": [
        { sel: "main h1", title: "Where everything comes from", body: "Every dataset, library and licence used in JaPax is listed here. You have finished the tour." },
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
    tryLabel: "Pruébalo",
    pageNames: { "/": "Inicio", "/learn": "Lo básico", "/history": "Historia", "/simulator": "Simulador", "/explorer": "Experimentos", "/dashboard": "Ranking", "/references": "Fuentes" } as Record<string, string>,
    steps: {
      "/": [
        { sel: "main h1", title: "Por qué existe", body: "El fuego es de lo más peligroso en un viaje a la Luna o a Marte. La NASA lleva décadas haciendo experimentos de fuego en el espacio. JaPax los convierte en respuestas claras." },
        { sel: MENU, title: "El menú", body: "Todo el sitio está aquí, ordenado para aprender paso a paso. Si eres nuevo en el tema, empieza por Lo básico." },
        { sel: "[data-pax]", title: "Tu guía", body: "Soy Pax. Púlsame cuando quieras para preguntar con tus palabras en una ventana grande o reiniciar este recorrido." },
      ],
      "/learn": [
        { sel: "main h1", title: "Empieza de cero", body: "No hace falta saber nada. Esta página explica, con palabras sencillas, por qué el fuego se comporta distinto en el espacio." },
        { sel: "main h2", title: "Ideas clave", body: "Cada tarjeta es una idea. Léelas en orden; las páginas siguientes se apoyan en ellas.", tryIt: "Lee la primera tarjeta." },
        { sel: "main h2:last-of-type", title: "Glosario", body: "Cualquier término técnico que veas luego en la web se explica aquí.", tryIt: "Vuelve aquí si una palabra no está clara." },
      ],
      "/history": [
        { sel: "main h1", title: "Incendios reales, lecciones reales", body: "La investigación sobre fuego espacial existe por accidentes reales. Esta página cuenta esa historia." },
        { sel: "main ol", title: "La línea del tiempo", body: "Los hechos aparecen en orden, desde los primeros accidentes hasta los experimentos de hoy. Cada uno enlaza a su fuente.", tryIt: "Baja y abre cualquier evento." },
      ],
      "/simulator": [
        { sel: "main h1", title: "Un fuego, muchos lugares", body: "Elige un lugar, toca una superficie y mira cómo se propaga un fuego simulado. Cada número lleva su etiqueta: medido, reportado, estimado o simulado." },
        { sel: "#sim-tabs", title: "Tres secciones", body: "Toca y arde es el simulador. Evidencia muestra lo que la NASA midió de verdad. Datos guarda las tablas de ensayos sin tratar.", tryIt: "Abre la pestaña Evidencia y vuelve." },
        { sel: "#fire-lab", title: "Toca y arde", body: "Toca cualquier superficie de la escena 3D: el fuego empieza ahí y se propaga mientras cambian los datos en vivo. Después prueba el panel de extinción.", tryIt: "Toca una superficie." },
        { sel: "section[aria-live=polite]", title: "Los números", body: "Estos indicadores resumen qué cambia en cada lugar: oxígeno, presión y gravedad." },
      ],
      "/explorer": [
        { sel: "main h1", title: "Todos los experimentos en un sitio", body: "Estas son las investigaciones de la NASA detrás de JaPax. Cada una muestra qué se quemó, en qué condiciones y cómo se midió." },
        { sel: "main input:not([type=checkbox])", title: "Buscar", body: "Escribe una palabra, como humo u oxígeno, para acotar la lista.", tryIt: "Prueba a buscar humo." },
        { sel: "main input[type=checkbox]", title: "Comparar hasta tres", body: "Marca hasta tres experimentos para verlos lado a lado en una tabla." },
      ],
      "/dashboard": [
        { sel: "main h1", title: "¿Qué te importa más?", body: "No todos los experimentos sirven igual para cada objetivo. Dile al ranking tus prioridades y reordenará los experimentos." },
        { sel: "input[type=range]", title: "Marca tus prioridades", body: "Cada control es un criterio. Llévalo hacia Esencial en lo que te importe.", tryIt: "Mueve un control y mira cómo cambia el ranking." },
      ],
      "/references": [
        { sel: "main h1", title: "De dónde sale todo", body: "Aquí están todos los datos, librerías y licencias usados en JaPax. Has terminado el recorrido." },
      ],
    } as Record<string, Step[]>,
  },
};
