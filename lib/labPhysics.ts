/**
 * Pure physics-of-the-lab helpers (no imports, so they can be unit-tested with plain node).
 *
 * HONESTY: no dataset contains a spread-rate curve. The anchor is the measured SAFFIRE concurrent spread on thin fabric
 * (NTRS 20180005168 Table 1: 1.8, 2.1, 2.3, 2.6 mm/s at ~21-22 % O2, 20-30 cm/s of flow, microgravity). Every factor
 * that scales it to another atmosphere is ESTIMATED (monotonic, not fitted) and is returned with its own tag and source
 * so the UI can show "how this number was built".
 */

export interface Atm { o2: number; pressureAtm: number; gravityG: number; flowCmS: number }
export type FactorTag = "measured" | "reported" | "estimated";
export interface Factor { key: string; label: string; value: number; tag: FactorTag; why: string; src: string }
export interface Speed { mmS: number; note: string; factors: Factor[] }

export const ANCHOR_MM_S = 2.0;

export function spreadFactors(a: Atm, material: string): Speed {
  const o2 = Math.min(1, Math.max(0.1, a.o2));
  const micro = a.gravityG < 0.05;

  const fO2 = Math.pow(o2 / 0.22, 1.3);

  const raw = a.flowCmS >= 15 ? 1 : a.flowCmS >= 5 ? 0.7 : a.flowCmS >= 1 ? 0.35 : micro && o2 <= 0.25 ? 0 : 0.2;
  const fFlow = micro ? raw : raw + (Math.max(raw, 0.7) - raw) * Math.min(1, a.gravityG * 3);

  const fG = micro ? 1 : 1 + 0.8 * Math.min(1, a.gravityG);

  const fMat = material === "plastic" ? 0.6 : material === "cable" ? 0.5 : material === "liquid" ? 0.8 : 1;

  const factors: Factor[] = [
    { key: "anchor", label: "Anchor", value: ANCHOR_MM_S, tag: "measured", why: "Measured concurrent spread on thin fabric (SAFFIRE I-III, 1.8-2.6 mm/s).", src: "NTRS 20180005168 Table 1; PSI-98, PSI-99, PSI-100" },
    { key: "o2", label: "Oxygen", value: fO2, tag: "estimated", why: "Spread rises with O2 in microgravity (qualitative). The exponent 1.3 is a modelling choice, relative to 22 % O2.", src: "NTRS 20160000593 (BASS-II, PMMA rods, O2 16-21 %)" },
    { key: "flow", label: "Airflow", value: fFlow, tag: raw === 0 ? "reported" : "estimated", why: raw === 0 ? "No airflow near 21 % O2 in 0 g: the flame starves." : "Flame quenches below about 1-5 cm/s at 16-21 % O2; the steps 15/5/1 cm/s are a discretisation. With gravity, buoyant convection supplies air, so low forced flow matters less.", src: "NTRS 20150008962 (SIBAL, flow 1-40 cm/s); PSI-20 ACME BRE" },
    { key: "g", label: "Gravity", value: fG, tag: "estimated", why: "1 g spread was faster than microgravity in PMMA rods and silicone tests. The slope 0.8 per g is a modelling choice; partial gravity (Moon) is an extrapolation.", src: "NTRS 20160000593; PSI-99 (silicone, 1 g vs 0 g)" },
    { key: "mat", label: "Material", value: fMat, tag: "estimated", why: "Thicker or non-fabric solids spread slower (PMMA rods: slower with diameter). The exact factor is a modelling choice; cable insulation has no flame-spread data at all.", src: "NTRS 20160000593; no cable flame-spread dataset" },
  ];
  const mmS = ANCHOR_MM_S * fO2 * fFlow * fG * fMat;
  const note = raw === 0 ? "no airflow at ~21 % O2 in 0 g: the flame starves (PSI-20 BRE, reported)" : "scaled from the SAFFIRE anchor; the factors are estimated";
  return { mmS, note, factors };
}

export function spreadSpeed(a: Atm, material: string): { mmS: number; note: string } {
  const { mmS, note } = spreadFactors(a, material);
  return { mmS, note };
}

export type MaterialGuess = "fabric" | "plastic" | "cable" | "liquid";

/**
 * Best-effort guess of what a tapped mesh is made of, from its name only. This is a heuristic (estimated): the NASA models
 * carry no material metadata. Returns null when the name says nothing, so the user's own choice is kept.
 */
export function inferMaterial(name: string): MaterialGuess | null {
  const n = name.toLowerCase();
  if (!n) return null;
  if (/(cable|wire|hose|harness|cord|tether|umbilical|antenna)/.test(n)) return "cable";
  if (/(fuel|tank|propellant|oil|liquid)/.test(n)) return "liquid";
  if (/(suit|emu|extravehicular|mobility_unit|garment|fabric|cloth|textile|glove|boot|blanket|bag|strap|thermal|mli|nomex|sibal|curtain)/.test(n)) return "fabric";
  if (/(panel|plate|rack|hull|wall|shell|window|visor|helmet|screen|display|locker|handle|door|hatch|floor|ceiling|mount|rail|frame|truss)/.test(n)) return "plastic";
  return null;
}
