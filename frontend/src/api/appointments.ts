import { api } from '../lib/api'
import type {
  Appointment,
  AppointmentSource,
  AppointmentStatus,
} from '../types'

export interface AppointmentCreate {
  doctor_id: string
  patient_id: string
  slot_start: string
  source?: AppointmentSource
  reason?: string | null
}

export async function bookAppointment(
  payload: AppointmentCreate,
): Promise<Appointment> {
  const { data } = await api.post<Appointment>('/appointments', payload)
  return data
}

export interface WalkInBooking {
  doctor_id: string
  slot_start: string
  full_name: string
  phone: string
  email?: string | null
  address?: string | null
  paid: boolean
  reason?: string | null
}

// One-shot booking: captures the patient (reused by phone) and books the slot.
export async function bookWalkIn(payload: WalkInBooking): Promise<Appointment> {
  const { data } = await api.post<Appointment>('/appointments/walk-in', payload)
  return data
}

export async function listAppointments(params?: {
  doctor_id?: string
  status_filter?: AppointmentStatus
}): Promise<Appointment[]> {
  const { data } = await api.get<Appointment[]>('/appointments', { params })
  return data
}

export async function doctorQueue(doctorId: string): Promise<Appointment[]> {
  const { data } = await api.get<Appointment[]>('/appointments/queue', {
    params: { doctor_id: doctorId },
  })
  return data
}

export async function markArrived(appointmentId: string): Promise<Appointment> {
  const { data } = await api.post<Appointment>(
    `/appointments/${appointmentId}/arrive`,
  )
  return data
}

export async function cancelAppointment(
  appointmentId: string,
  reason?: string,
): Promise<Appointment> {
  const { data } = await api.post<Appointment>(
    `/appointments/${appointmentId}/cancel`,
    { reason },
  )
  return data
}
