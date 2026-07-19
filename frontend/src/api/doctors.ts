import { api } from '../lib/api'
import type { DaySlots, Doctor, DoctorSession } from '../types'

export interface DoctorCreate {
  email: string
  password: string
  full_name: string
  department_id: string
  specialization?: string | null
  qualification?: string | null
  slot_duration_minutes?: number
  sessions?: DoctorSession[]
}

export interface DoctorUpdate {
  specialization?: string | null
  slot_duration_minutes?: number
  sessions?: DoctorSession[]
  is_active?: boolean
}

export async function listDoctors(departmentId?: string): Promise<Doctor[]> {
  const { data } = await api.get<Doctor[]>('/doctors', {
    params: departmentId ? { department_id: departmentId } : undefined,
  })
  return data
}

export async function createDoctor(payload: DoctorCreate): Promise<Doctor> {
  const { data } = await api.post<Doctor>('/doctors', payload)
  return data
}

export async function updateDoctor(
  doctorId: string,
  payload: DoctorUpdate,
): Promise<Doctor> {
  const { data } = await api.patch<Doctor>(`/doctors/${doctorId}`, payload)
  return data
}

// date is a plain calendar date, "YYYY-MM-DD"
export async function getDoctorSlots(
  doctorId: string,
  date: string,
): Promise<DaySlots> {
  const { data } = await api.get<DaySlots>(`/doctors/${doctorId}/slots`, {
    params: { date },
  })
  return data
}
