// TypeScript mirrors of the backend Pydantic schemas / enums.
// Keep these in sync with backend/app/models/enums.py and backend/app/schemas/*.

export type UserRole =
  'admin' | 'receptionist' | 'patient' | 'doctor' | 'pharmacist'

export type Gender = 'male' | 'female' | 'other'

export type AppointmentSource = 'online' | 'walk_in'

export type AppointmentStatus =
  | 'booked'
  | 'arrived'
  | 'in_consultation'
  | 'completed'
  | 'cancelled'
  | 'no_show'

export type ProcessingStatus =
  'pending' | 'transcribing' | 'summarizing' | 'ready' | 'failed'

// --- Auth ---
export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  is_active: boolean
}

// --- Departments ---
export interface Department {
  id: string
  name: string
  description: string | null
  is_active: boolean
}

// --- Doctors ---
export interface DoctorSession {
  label: string
  start: string // local "HH:MM"
  end: string // local "HH:MM"
}

export interface Doctor {
  id: string
  user_id: string
  department_id: string
  full_name: string
  email: string
  specialization: string | null
  qualification: string | null
  consultation_fee: string | null
  slot_duration_minutes: number
  sessions: DoctorSession[]
  is_active: boolean
}

// --- Patients ---
export interface Patient {
  id: string
  full_name: string
  phone: string
  date_of_birth: string | null
  gender: Gender | null
  blood_group: string | null
  email: string | null
  allergies: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
}

// --- Appointments ---
export interface Appointment {
  id: string
  doctor_id: string
  patient_id: string
  patient_name: string | null
  slot_start: string
  slot_end: string
  source: AppointmentSource
  status: AppointmentStatus
  token_number: number | null
  paid: boolean
  reason: string | null
}

// --- Scheduling board (slot grid) ---
// A slot's status is "available", "past" (free but elapsed), or any
// AppointmentStatus value.
export type SlotStatus = 'available' | 'past' | AppointmentStatus

export interface Slot {
  slot_start: string // UTC ISO; sent back verbatim when booking
  slot_end: string
  label: string // local clock time, e.g. "10:15"
  status: SlotStatus
  appointment_id: string | null
  patient_name: string | null
  paid: boolean | null
  token_number: number | null
}

export interface SlotSession {
  label: string
  start: string
  end: string
  slots: Slot[]
}

export interface DaySlots {
  doctor_id: string
  date: string
  timezone: string
  slot_duration_minutes: number
  sessions: SlotSession[]
}

// --- Consultations ---
export type MealTiming = 'before' | 'after'

// Medication as stored/returned by the API (no client-side id).
export interface ApiMedication {
  name: string
  morning: boolean
  afternoon: boolean
  evening: boolean
  night: boolean
  meal: MealTiming
  duration: string
}

export interface Prescription {
  summary: string
  medications: ApiMedication[]
}

export interface Consultation {
  id: string
  appointment_id: string
  recording_consent: boolean
  consented_at: string | null
  audio_path: string | null
  processing_status: ProcessingStatus
  transcript: string | null
  ai_summary_draft: Prescription | null
  final_summary: Prescription | null
  reviewed_at: string | null
  error_message: string | null
}
