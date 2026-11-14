---
name: fire-science
description: Expert knowledge on microgravity combustion science, fire behavior in space, and NASA experiment results. Use when explaining science to users or writing Claude prompts.
---

# Fire Science in Microgravity — Expert Knowledge

## Flame behavior by environment
| Environment | Gravity | O2% | Pressure | Flame shape | Temp | Mechanism |
|-------------|---------|-----|----------|-------------|------|-----------|
| Earth | 1g | 21% | 14.7 psi | Teardrop | ~2000K | Convection dominates |
| ISS | 0g | 21% | 14.7 psi | Sphere | ~1800K | Diffusion only |
| Moon Base | 0.16g | ~30% | ~10.2 psi | Unknown* | Unknown* | Partial gravity gap |
| Mars | 0.38g | ~0.13% | ~0.1 psi | Unknown* | - | Very low O2 |
| Spacesuit | 0g | 100% | 4.3 psi | Sphere | High | Extremely flammable |

*PSI has no partial-gravity data; LUCI (2025, simulated by rotation) gave the first very limited data, and FM2 will measure on the Moon.

## Why microgravity is dangerous for fire
1. No buoyancy → hot gases don't rise → flame feeds on itself
2. No convection → depleted O2 zone doesn't refresh → "cool flames" can persist undetected
3. Smoke doesn't rise → detectors designed for 1g may miss it
4. Suppression agents behave differently (CO2, helium dilution tested in FLEX)

## Key scientific findings from PSI data
- FLEX (PSI-69): CO2 and helium effectively suppress droplet flames in 0g
- BASS-II (PSI-25): Cotton/SIBAL fabric flammability increases with O2 concentration
- ACME CFI-G (PSI-159): "Cool flames" persist at conditions where normal flames extinguish — 272 tests up to 85% O2
- SAME-R (PSI-101): Standard ISS smoke detectors respond slower in microgravity (134 tests)
- SAFFIRE: Largest fires ever intentionally set in space — cotton/fiberglass panels

## Moon Base fire risk calculation
Earth baseline (21% O2, 14.7 psi) → Moon Base (30% O2, 10.2 psi):
- O2 increase: +43% → dramatically increases flammability limits
- Pressure decrease: -31% → partially offsets, but net effect is MORE dangerous
- Result: Materials safe on Earth may ignite on the Moon

## Scoring rubric for investigation relevance (0-100)
- Habitat match (Moon Base): 35 points
  - O2 ≥ 26.5%: +17.5 pts
  - Pressure ≤ 10.2 psi: +17.5 pts
- O2 within tested range: 25 points
- Safety area (prevention/detection/suppression): 20 points
- Airflow data present: 10 points
- Verified NASA source: 10 points

## Citation template for Claude responses
"Based on [Investigation Name] ([PSI-ID], DOI: [doi]), which conducted [N] tests under [conditions], the finding shows [result]. This is relevant to [environment] because [reason]."

---

# EXTRA — Información adicional (NASA NTRS, 2026-11-14)
> Añadido sin modificar lo anterior. NO procede de PSI: son fuentes NASA/NTRS verificadas en el PDF salvo donde se indica. Detalle completo en `INVESTIGACION-COMBUSTION.txt` (Anexos A–D).

## ¿Solo con oxígeno? Combustión con otros oxidantes
- Todos los experimentos PSI usan O2 como oxidante (diluyentes N2, He, CO2). La base PSI no cubre otros oxidantes.
- Magnesio arde en CO2 (Mg + CO2 → MgO + CO), ignición ~1000 K; en microgravedad tarda ~2x que en 1g y ~5x más que en O2 — NTRS 20010074061 y NASA/TP-2007-215077.
- JPL TR 32-1073 (1967): en atmósferas simuladas de Marte/Venus (N2/CO2) arden litio, berilio, calcio, titanio, circonio, torio y cerio; Mg no se enciende en la de Marte ni en N2 puro (hasta ~1071 °C); Al no se enciende en la de Marte. Nitrógeno y CO2 no son siempre inertes con metales.
- Trifluoruro de cloro: hipergólico con la mayoría de propelentes; no enciende por debajo de ~2–3 psia (NASA SP-8051). Flúor: oxidante más fuerte (NASA SP-4-44).
- Peróxido de hidrógeno: no arde pero sostiene la combustión al liberar O2; espuma y CO2 no lo apagan (NASA SP-4-44).
- Oxidante en el propio sólido: perclorato de litio en la vela generadora de O2 de Mir (1997); causa más probable: guante de látex en el cartucho (NASA History).
- Batería de litio: el cátodo puede liberar O2 por sobretensión y ventear con llamas (NASA, Guidelines on Li-ion Battery Use in Space, NTRS 20090023862).

## Metales y O2 elevado
- Titanio: todas las muestras se encendieron por fricción en LOX; no usar con LOX ni con GOX >207 kPa (NTRS 20090006758, NSS 1740.15).
- Casi todos los materiales son más inflamables al subir presión/concentración de O2 (NASA/TM-2007-213740).

## Gravedad parcial — datos recientes (LUCI ya voló)
- LUCI voló el 4-feb-2025 (Blue Origin New Shepard, gravedad lunar simulada por rotación, 11 RPM): SIBAL base 0.92 mm/s, punta 1.1 mm/s; PMMA punta 1.5 mm/s vs ~3.95 mm/s en 1g. Limitaciones: Coriolis, una quema por muestra (NTRS 20250010653).
- FM2 (superficie lunar) previsto a finales de 2026 (fecha NASA sin confirmar). Hipótesis (no demostrada): algunos materiales son más inflamables en gravedad lunar que en 1g (Ferkul, LPSC 2026).
- Nota de coherencia (actualizada): la tabla «Moon Base» de arriba ya refleja que los datos de gravedad parcial son muy limitados (LUCI 2025) y que FM2 medirá en la Luna.

## Lo que NO se pudo confirmar
- Que el Mg arda en N2 formando nitruro (el JPL indica que no se enciende hasta ~1071 °C).
- Que el ClF3 queme arena u hormigón (sin fuente NASA).
