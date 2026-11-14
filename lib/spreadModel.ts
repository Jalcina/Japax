import lab from '@/data/lab.json'

/**
 * Evidence layer for "how does a fire spread here?".
 * It never extrapolates: every number is a measured point taken from a published table, and every
 * environment is compared against the ranges that were actually tested.
 * Phase-1 audit (INFORME-FASE1.txt) found that no PSI table contains a spread-rate curve, only these points.
 */

export type GravityClass = 'micro' | '1g' | 'partial'

export interface SpreadPoint {
  id: string
  program: 'SAFFIRE-I' | 'SAFFIRE-II' | 'SAFFIRE-III'
  psiId: string
  doi: string
  material: string
  thickness: string
  flowCmS: number
  flowNote?: string
  o2Pct: [number, number]
  direction: 'Concurrent' | 'Opposed'
  gravity: Exclude<GravityClass, 'partial'>
  /** mm/s. null = no measurable propagation */
  rateMmS: number | null
  burnLengthCm: string
  burnSec: number | null
  note?: string
  source: string
}

const T1 = 'NASA NTRS 20180005168, Table 1'

/** Measured flame-spread points. SAFFIRE-II rows are cross-checked against data/lab.json (PSI-99 CSV). */
export const SPREAD_POINTS: SpreadPoint[] = [
  { id: 'I-1', program: 'SAFFIRE-I', psiId: 'PSI-98', doi: '10.60555/0t15-1z43', material: 'Cotton-fiberglass (SIBAL), 40.6 x 94 cm', thickness: '0.37 mm', flowCmS: 20, o2Pct: [21.5, 21.7], direction: 'Concurrent', gravity: 'micro', rateMmS: 1.8, burnLengthCm: '~84', burnSec: 420, source: T1 },
  { id: 'I-2', program: 'SAFFIRE-I', psiId: 'PSI-98', doi: '10.60555/0t15-1z43', material: 'Cotton-fiberglass (SIBAL), 40.6 cm wide', thickness: '0.37 mm', flowCmS: 20, o2Pct: [21.5, 21.5], direction: 'Opposed', gravity: 'micro', rateMmS: 1.3, burnLengthCm: '~10', burnSec: 70, source: T1 },
  { id: 'II-5', program: 'SAFFIRE-II', psiId: 'PSI-99', doi: '10.60555/2chp-m469', material: 'Cotton-fiberglass (SIBAL), 5 cm wide', thickness: '0.37 mm', flowCmS: 20, o2Pct: [22.1, 22.1], direction: 'Concurrent', gravity: 'micro', rateMmS: 2.1, burnLengthCm: '29 (whole sample)', burnSec: 145, source: T1 },
  { id: 'II-6', program: 'SAFFIRE-II', psiId: 'PSI-99', doi: '10.60555/2chp-m469', material: 'Cotton-fiberglass (SIBAL), 5 cm wide', thickness: '0.37 mm', flowCmS: 20, flowNote: 'PSI table says 20 cm/s; the NASA summary says 25 cm/s', o2Pct: [22.1, 22.1], direction: 'Concurrent', gravity: 'micro', rateMmS: 2.6, burnLengthCm: '29 (whole sample)', burnSec: 115, source: T1 },
  { id: 'III-1', program: 'SAFFIRE-III', psiId: 'PSI-100', doi: '10.60555/040q-4h36', material: 'Cotton-fiberglass (SIBAL), 40.6 x 94 cm', thickness: '0.37 mm', flowCmS: 30, flowNote: '30 cm/s planned (PSI-100, NTRS 20170001636); 25 cm/s in the post-flight summary', o2Pct: [21.0, 21.2], direction: 'Concurrent', gravity: 'micro', rateMmS: 2.3, burnLengthCm: '~84', burnSec: 300, note: 'The PSI-100 table lists conditions only; the result comes from the publication.', source: T1 },
  { id: 'III-2', program: 'SAFFIRE-III', psiId: 'PSI-100', doi: '10.60555/040q-4h36', material: 'Cotton-fiberglass (SIBAL), 40.6 cm wide', thickness: '0.37 mm', flowCmS: 30, flowNote: '30 cm/s planned; 25 cm/s in the post-flight summary', o2Pct: [21.0, 21.2], direction: 'Opposed', gravity: 'micro', rateMmS: 0.98, burnLengthCm: '~10', burnSec: 60, source: T1 },
  { id: 'II-1..4', program: 'SAFFIRE-II', psiId: 'PSI-99', doi: '10.60555/2chp-m469', material: 'Silicone, 5 cm wide (0.27, 0.61, 1.03 mm; 0.37 mm opposed)', thickness: '0.27-1.03 mm', flowCmS: 20, o2Pct: [21.5, 22.1], direction: 'Concurrent', gravity: 'micro', rateMmS: null, burnLengthCm: '~0 (no propagation)', burnSec: null, note: 'Ignited, but the flame did not spread in microgravity.', source: T1 },
  { id: 'II-2', program: 'SAFFIRE-II', psiId: 'PSI-99', doi: '10.60555/2chp-m469', material: 'Silicone, 5 cm wide', thickness: '0.61 mm', flowCmS: 20, o2Pct: [22.1, 22.1], direction: 'Concurrent', gravity: '1g', rateMmS: 1.2, burnLengthCm: '7.6', burnSec: null, note: 'Ground test in normal gravity with the same hardware.', source: T1 },
  { id: 'II-4', program: 'SAFFIRE-II', psiId: 'PSI-99', doi: '10.60555/2chp-m469', material: 'Silicone, 5 cm wide', thickness: '0.37 mm', flowCmS: 20, o2Pct: [22.1, 22.1], direction: 'Opposed', gravity: '1g', rateMmS: 0.6, burnLengthCm: 'Complete', burnSec: null, note: 'Ground test in normal gravity with the same hardware.', source: T1 },
]

export interface EnvQuery { o2: number; pressureAtm: number; gravityG: number | null }

export function gravityClass(g: number | null): GravityClass {
  if (g === null || g === 0) return 'micro'
  if (Math.abs(g - 1) < 0.05) return '1g'
  return 'partial'
}

/** Points whose gravity class and oxygen match the environment (oxygen within 3 points, ~1 atm spacecraft cabin). */
export function matchSpread(env: EnvQuery): SpreadPoint[] {
  const gc = gravityClass(env.gravityG)
  if (gc === 'partial') return []
  if (env.pressureAtm < 0.85 || env.pressureAtm > 1.3) return []
  return SPREAD_POINTS.filter((p) => p.gravity === gc && Math.abs(env.o2 * 100 - (p.o2Pct[0] + p.o2Pct[1]) / 2) <= 3)
}

export type SpreadStatus = 'measured' | 'gravity-gap' | 'atmosphere-gap'

export function spreadStatus(env: EnvQuery): SpreadStatus {
  if (gravityClass(env.gravityG) === 'partial') return 'gravity-gap'
  return matchSpread(env).length > 0 ? 'measured' : 'atmosphere-gap'
}

/* ------------------------------------------------------------------ tested ranges (computed from data/lab.json) */

export interface TestedRange {
  id: string
  name: string
  psiId: string
  doi: string
  kind: 'droplet' | 'solid' | 'gas flame'
  rows: number
  o2: [number, number]
  p: [number, number] | null
}

type Pair = [number, number]
const range = (v: (number | null | undefined)[]): Pair => {
  const a = v.filter((x): x is number => typeof x === 'number' && isFinite(x))
  return [Math.min(...a), Math.max(...a)]
}
const BAR_TO_ATM = 0.986923

function build(): TestedRange[] {
  const flexRows = lab.flex.rows.filter((r) => r.pAtm && r.pAtm > 0.3)
  return [
    { id: 'flex', name: 'FLEX', psiId: 'PSI-69', doi: lab.flex.doi, kind: 'droplet', rows: lab.flex.rows.length,
      o2: range(lab.flex.rows.map((r) => (r.o2 ?? NaN) * 100)), p: range(flexRows.map((r) => r.pAtm)) },
    { id: 'bass2', name: 'BASS-II', psiId: 'PSI-25', doi: lab.bass2.doi, kind: 'solid', rows: lab.bass2.rows.length,
      o2: range(lab.bass2.rows.map((r) => r.o2Initial)), p: null },
    { id: 'cfig-n', name: 'ACME CFI-G (normal flames)', psiId: 'PSI-159', doi: lab.cfigNormal.doi, kind: 'gas flame', rows: lab.cfigNormal.rows.length,
      o2: range(lab.cfigNormal.rows.map((r) => (r.o2Before ?? NaN) * 100)), p: range(lab.cfigNormal.rows.map((r) => (r.pressureBar ?? NaN) * BAR_TO_ATM)) },
    { id: 'cfig-i', name: 'ACME CFI-G (inverse flames)', psiId: 'PSI-159', doi: lab.cfigInverse.doi, kind: 'gas flame', rows: lab.cfigInverse.rows.filter((r) => r.o2 != null).length,
      o2: range(lab.cfigInverse.rows.map((r) => (r.o2 ?? NaN) * 100)), p: range(lab.cfigInverse.rows.map((r) => (r.pressureBar ?? NaN) * BAR_TO_ATM)) },
    { id: 'acme-n', name: 'ACME Flame Design (normal flames)', psiId: 'PSI-10', doi: '10.60555/w4zy-bt45', kind: 'gas flame', rows: lab.acmeNormal.rows.length,
      o2: range(lab.acmeNormal.rows.map((r) => (r.o2Init ?? NaN) * 100)), p: range(lab.acmeNormal.rows.map((r) => r.pInitAtm)) },
  ]
}

export const TESTED: TestedRange[] = build()

export interface RangeCheck extends TestedRange { o2In: boolean; pIn: boolean | null }

/** Which datasets were actually run in an atmosphere like this one. Pressure has 3 % tolerance. */
export function rangeCheck(env: EnvQuery): RangeCheck[] {
  const o2 = env.o2 * 100
  return TESTED.map((t) => ({
    ...t,
    o2In: o2 >= t.o2[0] - 1e-6 && o2 <= t.o2[1] + 1e-6,
    pIn: t.p ? env.pressureAtm >= t.p[0] * 0.97 && env.pressureAtm <= t.p[1] * 1.03 : null,
  }))
}
