import type { ApiMedication, MealTiming } from '../../types'

// Editor-side medication: the API shape plus a client id for stable React keys.
export interface Medication extends ApiMedication {
  id: string
}

export type { MealTiming }

export function newMedication(name = ''): Medication {
  return {
    id: crypto.randomUUID(),
    name,
    morning: false,
    afternoon: false,
    evening: false,
    night: false,
    meal: 'after',
    duration: '',
  }
}

export function fromApiMedication(m: ApiMedication): Medication {
  return { id: crypto.randomUUID(), ...m }
}

export function toApiMedication(m: Medication): ApiMedication {
  return {
    name: m.name,
    morning: m.morning,
    afternoon: m.afternoon,
    evening: m.evening,
    night: m.night,
    meal: m.meal,
    duration: m.duration,
  }
}
