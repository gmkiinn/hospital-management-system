// Frontend-only prescription model + mock data.
// NOTE: the backend AI scribe still returns the old clinical-note shape; these
// medications are mocked on the client until the backend adds a prescription
// schema and a drug catalog. See ConsultationRoomPage for where this is wired.

export type MealTiming = 'before' | 'after'

export interface Medication {
  id: string
  name: string
  morning: boolean
  afternoon: boolean
  evening: boolean
  night: boolean
  meal: MealTiming
  duration: string
}

export const MEAL_LABEL: Record<MealTiming, string> = {
  before: 'Before food',
  after: 'After food',
}

// Mock medicine catalog powering the typeahead (common Indian OPD meds).
export const MEDICINE_CATALOG: string[] = [
  'Paracetamol 500mg',
  'Paracetamol 650mg',
  'Azithromycin 500mg',
  'Amoxicillin 500mg',
  'Amoxicillin + Clavulanate 625mg',
  'Cefixime 200mg',
  'Ciprofloxacin 500mg',
  'Doxycycline 100mg',
  'Cetirizine 10mg',
  'Levocetirizine 5mg',
  'Montelukast 10mg',
  'Pantoprazole 40mg',
  'Omeprazole 20mg',
  'Ranitidine 150mg',
  'Domperidone 10mg',
  'Ondansetron 4mg',
  'Ibuprofen 400mg',
  'Diclofenac 50mg',
  'Aceclofenac 100mg',
  'Metformin 500mg',
  'Amlodipine 5mg',
  'Telmisartan 40mg',
  'Atorvastatin 10mg',
  'Aspirin 75mg',
  'Prednisolone 10mg',
  'Salbutamol Inhaler',
  'Vitamin D3 60000 IU',
  'Vitamin B-Complex',
  'Calcium + Vitamin D3',
  'Iron + Folic Acid',
  'ORS Sachet',
  'Ascoril Cough Syrup',
  'Benadryl Cough Syrup',
  'Cheston Cold',
  'Azee 500 Syrup',
  'Meftal-P Syrup',
  'Zincovit Syrup',
]

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

// Mock "AI-extracted" medications shown as a starting point in the table.
export function mockExtractedMedications(): Medication[] {
  return [
    {
      id: crypto.randomUUID(),
      name: 'Paracetamol 500mg',
      morning: true,
      afternoon: false,
      evening: false,
      night: true,
      meal: 'after',
      duration: '5 days',
    },
    {
      id: crypto.randomUUID(),
      name: 'Azithromycin 500mg',
      morning: true,
      afternoon: false,
      evening: false,
      night: false,
      meal: 'after',
      duration: '3 days',
    },
  ]
}

export function medicationToText(m: Medication): string {
  const times = [
    m.morning && 'Morning',
    m.afternoon && 'Afternoon',
    m.evening && 'Evening',
    m.night && 'Night',
  ]
    .filter(Boolean)
    .join(', ')
  return `${m.name} — ${times || 'as needed'} · ${MEAL_LABEL[m.meal]}${
    m.duration ? ` · ${m.duration}` : ''
  }`
}
