# JaPax — NASA Space Apps 2026

**Reto:** Flame in Freefall · Hackathon Sevilla 14-15 Nov 2026 · Equipo 2 personas
**Premio objetivo:** Best Use of Data + Most Inspirational
**Audiencia:** profesores, investigadores, ingenieros aeroespaciales, jurados
**Frase jurado:** "JaPax transforma 30 años de experimentos de combustión de la NASA en respuestas claras sobre qué arderá primero en una base lunar."

## Stack
- Next.js 16 + TypeScript + Tailwind CSS 4 + App Router (sin src/)
- Claude API: `claude-sonnet-5-5` · Anthropic SDK: `@anthropic-ai/sdk`
- SVG propio (sin Recharts) · `data/curated.json` + `data/psi/` → `node scripts/build-data.mjs` → `data/investigations.v2.json`
- Deploy: Vercel (URL pública requerida)

## Comandos
```bash
npm run dev          # → http://localhost:3000
npm run build
npm run type-check
node scripts/build-data.mjs   # regenera investigations.v2.json
npm run test:lab     # motor de componentes, catálogos, CSV y RunRecord (node --test, 76 tests)
```

## Motor de componentes (en `/simulator#fire`)
- Un toque en el modelo 3D identifica un componente y simula cómo un fuego pasa entre componentes (grafo, nivel A) con medidas "Apply measure", aviso de ruptura, evento de fin y ventana de resultados + CSV/.txt.
- Datos por escena en `data/components/<env>.catalog.json` (+ `.map.json`): `suit`, `iss` (conjunto), `iss-interior`, `earth` (sitio), `earth-planet`, `moon` (módulo lunar) y `mars` (sin selector aún). Registro y vista en `lib/componentEnvs.ts`.
- Todo `Fact` del catálogo lleva `tag` + `src` (lo valida `tests/componentCatalog.test.mjs`); lo sin fuente es `estimated`/hypothesis. Los huecos van en `gaps` de cada catálogo.
- Motor puro: `lib/componentSpread.ts`; informe de ruptura: `lib/componentReport.ts`; registro inmutable de cada run (fuente única de ventana, CSV y .txt): `lib/runRecord.ts`, `lib/componentCsv.ts`; UI: `components/ComponentPanel.tsx`, `components/ResultsDialog.tsx`.
- Herramienta de etiquetado solo para desarrollo: `/dev-label?model=iss|emu|lm` (da 404 en producción).

## APIs NASA (sin auth)
```
GET https://psi.nasa.gov/geode-py/ws/repo/investigations/{accession}
GET https://psi.nasa.gov/geode-py/ws/repo/search?source=psi&type=investigation&size=50
GET https://ntrs.nasa.gov/api/citations/search?q=microgravity+fire&rows=20
```

## Investigaciones PSI clave
| ID | Nombre | DOI | Filas |
|----|--------|-----|-------|
| PSI-25 | BASS-II | 10.60555/4qc4-de67 | 129 |
| PSI-26 | BASS | 10.60555/58h4-dy80 | - |
| PSI-69 | FLEX | 10.60555/mbq8-0451 | 274 |
| PSI-68 | FLEX-2 | 10.60555/byp8-h018 | - |
| PSI-39 | CFI | 10.60555/m6pj-a914 | 146 |
| PSI-98 | SAFFIRE-I | - | - |
| PSI-99 | SAFFIRE-II | - | - |
| PSI-100 | SAFFIRE-III | - | - |
| PSI-101 | SAME-R | - | 134 |
| PSI-159 | ACME CFI-G | 10.60555/cyt1-kh64 | 272 |
| PSI-20 | ACME BRE | 10.60555/vb93-3y72 | - |

## Contexto científico
| Entorno | O2 | Presión | Gravedad |
|---------|-----|---------|----------|
| Tierra | 21% | 14.7 psi | 1g |
| ISS | 21% | 14.7 psi | 0g — llamas esféricas azules |
| Base Lunar | ~30% | ~10.2 psi | 0.16g (la cifra "40% más inflamable" es del enunciado del reto, sin tabla ni fuente: no mostrarla como dato medido) |
| Marte | ~0.13% | baja | 0.38g |
| Traje EVA | 100% | 4.3 psi | extremadamente inflamable |

GAP crítico: datos de gravedad parcial muy limitados. LUCI voló el 4-feb-2025 (gravedad lunar simulada por rotación, NTRS 20250010653) y FM2 medirá en la Luna real (previsto fines de 2026); el archivo PSI no contiene ninguno. Todo lo lunar sin dato experimental es extrapolación y debe verse marcado.

## Áreas del reto
- **Prevención** — BASS, BASS-II, FLEX, ACME
- **Detección** — SAME, SAME-R, DAFT
- **Supresión** — FLEX, Cool Flames

## Incidentes históricos (usar en demo)
Apollo 1 (1967) · Apollo 13 (1970) · Mir (1997) · Artemis II (reciente)

## Criterios del jurado (igual peso)
Impact · Creativity · Validity (PSI ID + DOI + filas) · Relevance · Presentation
Presentación: máx 7 slides O vídeo 30s · Todo en inglés · Entrega 15-nov-2026 23:59

## Reglas de desarrollo
1. Siempre citar PSI ID + DOI en datos científicos
2. Nunca inventar datos — solo PSI/NTRS
3. Marcar "medido" vs "predicho" vs "estimado"
4. Mobile responsive · UI accesible para no-especialistas
5. Componentes PascalCase · funciones camelCase · Tailwind (sin CSS modules)

## Variables de entorno
```
ANTHROPIC_API_KEY=
BRAVE_SEARCH_API_KEY=
```

## Orden de build
Fase 1 (sin API key): page.tsx → simulator → explorer → dashboard
`/simulator` es la ÚNICA experiencia de simulación: pestañas por hash `#fire` (Touch to burn), `#evidence` y `#data`; `/lab` y `/simulacion-en-progreso` redirigen allí. Solo una escena WebGL montada a la vez.
Fase 2 (con API key): ask/page.tsx (chat Claude) → Claude Vision (opcional)
Regla: Fase 1 desplegada en Vercel antes de tocar Fase 2.
