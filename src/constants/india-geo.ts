import { City, State } from 'country-state-city'

/** States and union territories of India (full official name), sourced from
 * the `country-state-city` dataset instead of a hand-maintained list. */
const indiaStates = State.getStatesOfCountry('IN')

export const indianStates: string[] = indiaStates.map((s) => s.name).sort((a, b) => a.localeCompare(b))

const isoCodeByStateName = new Map(indiaStates.map((s) => [s.name, s.isoCode]))

/** Returns every city/town on record for a given Indian state name. */
export function getCitiesForState(stateName: string): string[] {
  const isoCode = isoCodeByStateName.get(stateName)
  if (!isoCode) return []
  return City.getCitiesOfState('IN', isoCode)
    .map((c) => c.name)
    .sort((a, b) => a.localeCompare(b))
}
