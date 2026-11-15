import type { Fuel } from './flameEngine'
import { suppressionEvidence, AGENT_MAX, type Agent, type Tally } from './suppression'

/**
 * "Touch to burn" scenario logic. PROVISIONAL (14-nov-2026).
 * Nothing here is a numeric fire model: no dataset gives growth time, heat release or spread speed for these
 * cases. Each statement is a fact with its own evidence tag; anything the data cannot support is tagged
 * 'estimated' and says so. Counts for CO2/He come from MEASURED FLEX droplet tests (PSI-69) via suppressionEvidence.
 */

export type Tag = 'measured' | 'reported' | 'predicted' | 'estimated'
export type Material = 'fabric' | 'plastic' | 'cable' | 'liquid'
export type Airflow = 'still' | 'low' | 'moderate'
export type Extinguisher = 'none' | 'vent-off' | 'co2' | 'he' | 'depressurize'
export interface Atmos { o2: number; pressureAtm: number; gravityG: number | null }
/** `text` may hold {placeholders}; `vars` fills them (see factText) so the same fact can be translated before it is filled */
export interface Fact { tag: Tag; text: string; src: string; eli5?: string; vars?: Record<string, string | number> }

export function factText(f: Fact, tr: (s: string) => string = (s) => s): string {
  const base = tr(f.text)
  return f.vars ? base.replace(/\{(\w+)\}/g, (_, k) => String(f.vars![k] ?? `{${k}}`)) : base
}

export const MATERIALS: Record<Material, { label: string; fuel: Fuel; basis: string }> = {
  fabric: { label: 'Fabric (cotton-fiberglass SIBAL, Nomex-type)', fuel: 'heptane', basis: 'BASS / BASS-II, thin-fabric tests' },
  plastic: { label: 'Rigid plastic (PMMA panel, rod or sheet)', fuel: 'heptane', basis: 'BASS-II PMMA rods and films' },
  cable: { label: 'Cable insulation (Kapton, Teflon, silicone)', fuel: 'heptane', basis: 'SAME smoke tests only; no flame-spread data' },
  liquid: { label: 'Liquid fuel droplet (heptane or methanol)', fuel: 'methanol', basis: 'FLEX droplet tests (PSI-69)' },
}

export const AIRFLOW: Record<Airflow, { label: string }> = {
  still: { label: 'Still air (< 1 cm/s)' },
  low: { label: 'Gentle flow (1-5 cm/s)' },
  moderate: { label: 'Ventilation (about 10 cm/s)' },
}

export const AGENT_LIMIT = AGENT_MAX

export interface Scenario {
  fate: 'burn' | 'extinguish' | 'unknown'
  fuel: Fuel
  headline: string
  banners: string[]
  facts: Fact[]
  evidence: { agent: Exclude<Agent, 'none'>; frac: number; withAgent: Tally; baseline: Tally; enough: boolean; inRange: boolean } | null
}

const S = {
  sibal: 'NTRS 20150008962 (BASS/BASS-II on the ISS; SIBAL samples 1.2 and 2.2 cm wide, O2 16-21 %, flow 1-40 cm/s)',
  bass: 'NTRS 20140011099 (BASS on the ISS; flow 0-40 cm/s)',
  bass2: 'NTRS 20160000593 (BASS-II; PMMA rods, O2 16-21 %, flow 0.4-4 cm/s, 54 spread rates)',
  bre: 'PSI-20 ACME BRE, DOI 10.60555/vb93-3y72 (gas burner emulating solids)',
  flex: 'PSI-69 FLEX, DOI 10.60555/mbq8-0451, 274 droplet tests',
  helium: 'NTRS 20040161188 (foam fuel; drop tower and ZGF, short tests)',
  guide: 'NASA challenge guide p.31 (BASS)',
  same: 'PSI-102 SAME (30 smoke samples; DOI in /references)',
  saffire6: 'NTRS 20240002981 (Saffire VI, 1.5-3.2 kW fires in 17-19 m3)',
  vent: 'NTRS 19970020617 (PMMA cylinder, depressurization in low gravity; abstract)',
}

export function scenario(a: { atm: Atmos; env: 'earth' | 'iss' | 'moon' | 'suit'; material: Material; airflow: Airflow; ext: Extinguisher; frac: number; delayS: number }): Scenario {
  const { atm, env, material, airflow, ext, frac, delayS } = a
  const fuel = MATERIALS[material].fuel
  const facts: Fact[] = []
  const banners: string[] = []
  let fate: Scenario['fate'] = 'burn'
  let evidence: Scenario['evidence'] = null

  if (env === 'moon') banners.push('Lunar gravity is an extrapolation: no experimental combustion data exist at 1/6 g yet (NASA LUCI and FM2 are the first).')
  if (env === 'suit') banners.push('Spacesuit: 100 % O2 at 4.3 psi is outside every tested atmosphere. Everything shown for it is estimated.')
  if (env === 'earth') banners.push('Earth (1 g): the PSI tables are microgravity tests, so the 1 g side of this simulator is the least evidenced.')

  // --- how the fire behaves (material + airflow) ---
  if (material === 'fabric') facts.push({ tag: 'measured', src: S.sibal, text: 'Thin fabric burning with the airflow spreads steadily; the flame goes out when the flow drops below about 1-5 cm/s (higher flow needed at lower O2). Wider samples, faster flow and more O2 spread faster.', eli5: 'Concurrent-flow spread is oxidiser-limited: below the quench velocity the flame is starved.' })
  if (material === 'plastic') facts.push({ tag: 'measured', src: S.bass2, text: 'On PMMA rods, spread slows as the rod gets thicker, and in microgravity it rises with oxygen. In these tests 1 g rods spread faster than microgravity rods.', eli5: 'Thermally thick fuels spread more slowly than thin ones; spread rate increases with O₂ fraction.' })
  if (material === 'cable') facts.push({ tag: 'estimated', src: 'No flame-spread dataset for cable insulation in PSI or NTRS (checked 14-nov-2026)', text: 'There is no measured flame-spread data for cable insulation, so the flame shown is an illustration. What is measured is the smoke it gives off before it burns: mean particles of 100-200 nm.', eli5: 'Smoke particle size is characterised (SAME); no spread-rate dataset exists for cable insulation.' })
  if (material === 'cable') facts.push({ tag: 'measured', src: S.same, text: 'Heated cable materials give off sub-micron smoke; ionization detectors see it best and light-scattering detectors work well for most cases.' })
  if (material === 'liquid') facts.push({ tag: 'measured', src: S.flex, text: 'A liquid droplet burns as a sphere, so there is no spread to model; what FLEX measures is whether it goes out.' })

  if (airflow === 'still') facts.push({ tag: 'reported', src: S.bass, text: 'Under 1 cm/s the flame becomes dim, blue and very stable. It can burn for a long time, so a tiny flame can go unnoticed (acrylic flames burned over 5 minutes before going out).', eli5: 'A dim, blue, quasi-steady flame is easily missed by visual inspection but remains active.' })
  if (airflow === 'low') facts.push({ tag: 'reported', src: S.bass, text: 'Between about 1 and 5 cm/s the flame keeps heating the solid, so it gets hotter and brighter as time goes on.' })
  if (airflow === 'moderate') facts.push({ tag: 'reported', src: S.bass, text: 'With a moderate flow, a thin fuel burning with the airflow spreads faster as the flow rises. Opposed thin fuel spreads fastest at an intermediate flow.' })
  if (airflow !== 'still' && (material === 'fabric' || material === 'plastic')) facts.push({ tag: 'reported', src: S.bass, text: 'Danger: a suddenly stronger airflow, or touching another fuel, can make a small flame flare up.' })

  // --- what the user did about it ---
  if (ext === 'none') {
    facts.push({ tag: 'estimated', src: 'No dataset gives growth time versus size for these cases', text: 'Nothing is applied. How big the fire gets after {d} s cannot be quantified from the data; the animation only shows that it keeps burning.', vars: { d: delayS } })
  }

  if (ext === 'vent-off') {
    if (env === 'earth') {
      facts.push({ tag: 'estimated', src: 'No 1 g PSI table covers this', text: 'In 1 g, hot gases rise and pull fresh air in by themselves, so switching the fans off does not remove the airflow. Treated as not proven.' })
    } else if (atm.o2 <= 0.25) {
      fate = 'extinguish'
      facts.push({ tag: 'reported', src: S.bre, text: 'Without airflow, flames at 21 % O2 went out on their own in a short time. Cutting ventilation is an established step to put out spacecraft fires.', eli5: 'Without forced flow or O₂ enrichment, the oxidiser supply to the flame is exhausted.' })
      facts.push({ tag: 'measured', src: S.sibal, text: 'On fabric the flame quenched when the flow fell below about 1-5 cm/s.' })
    } else {
      facts.push({ tag: 'reported', src: S.bre, text: 'In oxygen-enriched atmospheres a flame kept burning (quasi-steady) in microgravity with NO airflow, so cutting ventilation may not be enough.', eli5: 'With O₂ enrichment the flame is sustained by the oxidiser already present in the atmosphere.' })
      fate = 'burn'
    }
  }

  if (ext === 'depressurize') {
    fate = 'unknown'
    facts.push({ tag: 'reported', src: S.vent, text: 'Venting the cabin (depressurization) is an emergency option in the ISS fire-suppression plans, but it creates a flow that can temporarily intensify the fire, as seen in Skylab flammability tests. Current knowledge of reduced pressure combined with forced flow in low gravity is described as inadequate for designing a venting system.', eli5: 'Depressurisation can starve the fire of oxidiser, but the transient flow may first intensify it; the combination is not characterised well enough to validate it.' })
    facts.push({ tag: 'estimated', src: 'No PSI table tests venting a cabin with a burning solid', text: 'Shown as unknown on purpose. A venting action also removes air the crew needs, so it is a last resort, not a default.' })
  }

  if (ext === 'co2' || ext === 'he') {
    const f = Math.min(frac, AGENT_MAX[ext])
    const ev = suppressionEvidence({ fuel: fuel === 'heptane' ? 'heptane' : 'methanol', o2: atm.o2, pressureAtm: atm.pressureAtm, agent: ext, agentFrac: f })
    evidence = { agent: ext, frac: f, withAgent: ev.withAgent, baseline: ev.baseline, enough: ev.enough, inRange: ev.verdict.inRange }
    if (ev.verdict.inRange) {
      fate = ev.verdict.fate
      facts.push({ tag: 'measured', src: S.flex, text: ev.enough ? 'In a window around this atmosphere, {a} of {an} droplet tests with this agent ended in extinction, against {b} of {bn} with no agent.' : 'Fewer than 3 tests fall in this window, so a comparison would be noise.', vars: ev.enough ? { a: ev.withAgent.extinction, an: ev.withAgent.n, b: ev.baseline.extinction, bn: ev.baseline.n } : undefined, eli5: 'FLEX ignited fuel droplets with and without the agent and recorded the extinction outcomes.' })
    } else {
      fate = 'unknown'
      facts.push({ tag: 'estimated', src: S.flex, text: 'No FLEX test was run with an agent in an atmosphere like this one (O2 {o2} %, {p} atm; tested range O2 12-25 % with an agent). Showing "unknown" instead of a made-up result.', vars: { o2: (atm.o2 * 100).toFixed(0), p: atm.pressureAtm }, eli5: 'No suppression test covers this atmosphere, so the outcome is undetermined.' })
    }
    facts.push({ tag: 'reported', src: S.helium, text: 'In microgravity helium can be the better agent: CO2 glows and re-radiates heat to the fuel, and helium works about 11 times better per kilogram. On the ISS the extinguishers are CO2.' })
    facts.push({ tag: 'reported', src: S.guide, text: 'Spraying an agent only at the flame is not enough: the jet drags air in and keeps the flame alive even with the ambient airflow off. Dilute the whole space.' })
    facts.push({ tag: 'measured', src: S.flex, text: 'FLEX burned fuel droplets, not cloth, plastic or cables, so this shows the mechanism, not a safe dose for this material.' })
  }

  if (ext !== 'none' && delayS > 0) {
    facts.push({ tag: 'estimated', src: 'No dataset gives detector or extinguisher response times', text: 'You chose to act after {d} s. The data do not say how large the fire is by then or how much longer the agent would need; the delay is yours to explore, not a measured time.', vars: { d: delayS } })
  }
  facts.push({ tag: 'reported', src: S.saffire6, text: 'In a large spacecraft fire the rise in CO2 and CO was bigger than the rise in temperature and pressure, which favours detecting gases early.' })

  const headline =
    fate === 'extinguish' ? 'Likely to go out (estimated for this case)'
    : fate === 'unknown' ? 'Unknown: no experiment covers this combination'
    : ext === 'none' ? 'Keeps burning'
    : 'Not proven to go out'
  return { fate, fuel, headline, banners, facts, evidence }
}
