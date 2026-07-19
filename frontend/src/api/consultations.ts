import { api } from '../lib/api'
import type { Consultation, Prescription } from '../types'

export async function startConsultation(
  appointmentId: string,
): Promise<Consultation> {
  const { data } = await api.post<Consultation>(
    `/appointments/${appointmentId}/consultation`,
  )
  return data
}

export async function getConsultation(id: string): Promise<Consultation> {
  const { data } = await api.get<Consultation>(`/consultations/${id}`)
  return data
}

export async function setConsent(
  id: string,
  recording_consent: boolean,
): Promise<Consultation> {
  const { data } = await api.post<Consultation>(
    `/consultations/${id}/consent`,
    { recording_consent },
  )
  return data
}

export async function uploadAudio(
  id: string,
  blob: Blob,
  filename = 'consultation.webm',
): Promise<Consultation> {
  const form = new FormData()
  form.append('file', blob, filename)
  const { data } = await api.post<Consultation>(
    `/consultations/${id}/audio`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return data
}

export async function saveFinalNote(
  id: string,
  final_summary: Prescription,
): Promise<Consultation> {
  const { data } = await api.patch<Consultation>(
    `/consultations/${id}/final-note`,
    { final_summary },
  )
  return data
}
