import { api } from '../lib/api'
import type { Doctor } from '../types'

export interface DoctorCreate {
  email: string
  password: string
  full_name: string
  department_id: string
  specialization?: string | null
  qualification?: string | null
  slot_duration_minutes?: number
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
