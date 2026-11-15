import type { SpreadPoint } from './spreadModel'

/**
 * Pure summary of the measured flame-spread points, used by the Ask oracle for "how fast does a fire spread?".
 * Every figure is computed from the points (never typed by hand), and it only describes what was measured:
 * thin cotton-fiberglass fabric in microgravity, with the flow (concurrent) and against it (opposed).
 */
export interface Band { min: number; max: number; n: number }
export interface SpreadSummary {
  /** fabric, microgravity, flame spreading with the flow */
  withFlow: Band | null
  /** fabric, microgravity, flame spreading against the flow */
  against: Band | null
  /** microgravity points where the flame ignited but did not spread (silicone) */
  noSpreadN: number
  /** points measured in normal gravity with the same hardware */
  groundN: number
  /** flow range (cm/s) and oxygen range (%) actually covered by the fabric points */
  flowCmS: [number, number] | null
  o2Pct: [number, number] | null
  programs: string[]
}

const band = (rates: number[]): Band | null => (rates.length ? { min: Math.min(...rates), max: Math.max(...rates), n: rates.length } : null)

export function summarizeSpread(points: SpreadPoint[]): SpreadSummary {
  const micro = points.filter((p) => p.gravity === 'micro')
  const fabric = micro.filter((p) => /cotton/i.test(p.material) && p.rateMmS !== null)
  const rate = (p: SpreadPoint) => p.rateMmS as number
  return {
    withFlow: band(fabric.filter((p) => p.direction === 'Concurrent').map(rate)),
    against: band(fabric.filter((p) => p.direction === 'Opposed').map(rate)),
    noSpreadN: micro.filter((p) => p.rateMmS === null).length,
    groundN: points.filter((p) => p.gravity === '1g').length,
    flowCmS: fabric.length ? [Math.min(...fabric.map((p) => p.flowCmS)), Math.max(...fabric.map((p) => p.flowCmS))] : null,
    o2Pct: fabric.length ? [Math.min(...fabric.map((p) => p.o2Pct[0])), Math.max(...fabric.map((p) => p.o2Pct[1]))] : null,
    programs: [...new Set(points.map((p) => p.program))],
  }
}

/** "1.8-2.6 mm/s", or "2.1 mm/s" when every point agrees */
export const fmtBand = (b: Band): string => (b.min === b.max ? `${b.min} mm/s` : `${b.min}-${b.max} mm/s`)
