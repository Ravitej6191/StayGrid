import indiaGeoData from './india-geo-data.json'

/** States and union territories of India, trimmed from the
 * `country-state-city` dataset down to just India at build time (see the
 * generation note in india-geo-data.json's sibling script/history) — the
 * full package ships every country's cities in one ~17MB JSON file with no
 * per-country code-splitting, which was bloating the production bundle by
 * multiple megabytes for data we never use. */
const { states, citiesByState } = indiaGeoData as {
  states: { name: string; isoCode: string }[]
  citiesByState: Record<string, string[]>
}

export const indianStates: string[] = states.map((s) => s.name).sort((a, b) => a.localeCompare(b))

const isoCodeByStateName = new Map(states.map((s) => [s.name, s.isoCode]))

/** Returns every city/town on record for a given Indian state name. */
export function getCitiesForState(stateName: string): string[] {
  const isoCode = isoCodeByStateName.get(stateName)
  if (!isoCode) return []
  return [...(citiesByState[isoCode] ?? [])].sort((a, b) => a.localeCompare(b))
}
