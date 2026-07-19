import { api } from '../lib/api'
import type { Gender, Patient } from '../types'

export interface PatientCreate {
  full_name: string
  phone: string
  date_of_birth?: string | null
  gender?: Gender | null
  blood_group?: string | null
  email?: string | null
  allergies?: string | null
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
}

export async function listPatients(phone?: string): Promise<Patient[]> {
  const { data } = await api.get<Patient[]>('/patients', {
    params: phone ? { phone } : undefined,
  })
  return data
}

export async function createPatient(payload: PatientCreate): Promise<Patient> {
  const { data } = await api.post<Patient>('/patients', payload)
  return data
}
