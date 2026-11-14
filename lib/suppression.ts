import lab from '@/data/lab.json'
import type { Fuel } from './flameEngine'
import { flexVerdict } from './flexVerdict'

/**
 * Suppression evidence from the FLEX droplet tests (PSI-69).
 * Counts what MEASURED tests did inside a narrow window around the chosen atmosphere, and always compares
 * against the same atmosphere without an agent: in the Phase-1 audit, 58 of 101 diluent-free tests also
 * ended in extinction, so an extinction alone does not prove that the agent worked.
 * Outcomes follow NASA/TP-2015-216046: Extinction, Completion (droplet burned out) or Disruption (droplet
 * broke up; the flame did not go out at a finite size).
 */

type Row = (typeof lab.flex.rows)[number]
const NAME: Record<Fuel, string> = { methanol: 'Methanol', heptane: 'Heptane' }
const ROWS: Row[] = lab.flex.rows.filter((r) => r.o2 != null && r.pAtm && r.pAtm > 0.3)

export type Agent = 'none' | 'co2' | 'he'
export interface Query { fuel: Fuel; o2: number; pressureAtm: number; agent: Agent; agentFrac: number }
export interface Tally { n: number; extinction: number; disruption: number; completion: number }

const tally = (rows: Row[]): Tally => ({
  n: rows.length,
  extinction: rows.filter((r) => r.end === 'Extinction').length,
  disruption: rows.filter((r) => r.end === 'Disruption').length,
  completion: rows.filter((r) => r.end === 'Completion').length,
})

const W_O2 = 0.02 // oxygen mole fraction window (+/- 2 points)
const W_P = 0.05 // pressure window (+/- 5 %)
const W_AGENT = 0.08 // agent mole fraction window (+/- 8 points)

function atmosphere(q: Query): Row[] {
  return ROWS.filter((r) => r.fuel === NAME[q.fuel] && Math.abs(r.o2! - q.o2) <= W_O2 && Math.abs(r.pAtm! - q.pressureAtm) <= q.pressureAtm * W_P)
}

export interface SuppressionEvidence {
  withAgent: Tally
  baseline: Tally
  /** minimum tests in each window before a comparison is shown */
  enough: boolean
  verdict: ReturnType<typeof flexVerdict>
}

export function suppressionEvidence(q: Query): SuppressionEvidence {
  const atm = atmosphere(q)
  const none = atm.filter((r) => !r.co2 && !r.he)
  const agentRows =
    q.agent === 'none'
      ? none
      : atm.filter((r) => (q.agent === 'co2' ? (r.co2 ?? 0) > 0 && !r.he && Math.abs((r.co2 ?? 0) - q.agentFrac) <= W_AGENT : (r.he ?? 0) > 0 && !r.co2 && Math.abs((r.he ?? 0) - q.agentFrac) <= W_AGENT))
  const withAgent = tally(agentRows)
  const baseline = tally(none)
  const verdict = flexVerdict({ fuel: q.fuel, o2: q.o2, pressureAtm: q.pressureAtm, co2: q.agent === 'co2' ? q.agentFrac : 0, he: q.agent === 'he' ? q.agentFrac : 0 })
  return { withAgent, baseline, enough: withAgent.n >= 3 && baseline.n >= 3, verdict }
}

/** Lowest oxygen fraction at which a measured droplet still burned (Completion or Disruption) instead of going out. */
export function burnFloor(fuel: Fuel): { noAgent: number; anyAgent: number } {
  const burned = ROWS.filter((r) => r.fuel === NAME[fuel] && r.end !== 'Extinction')
  return {
    noAgent: Math.min(...burned.filter((r) => !r.co2 && !r.he).map((r) => r.o2!)),
    anyAgent: Math.min(...burned.map((r) => r.o2!)),
  }
}

/** Largest agent fractions that were actually tested, so the UI can cap its slider. */
export const AGENT_MAX: Record<Exclude<Agent, 'none'>, number> = {
  co2: Math.max(...ROWS.map((r) => r.co2 ?? 0)),
  he: Math.max(...ROWS.map((r) => r.he ?? 0)),
}
