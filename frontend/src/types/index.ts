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
  slot_start: string
  slot_end: string
  source: AppointmentSource
  status: AppointmentStatus
  token_number: number | null
  reason: string | null
}

// --- Consultations ---
export interface ClinicalSummary {
  chief_complaint: string
  history_of_present_illness: string
  symptoms: string[]
  diagnosis: string
  treatment_plan: string
  follow_up: string
}

export interface Consultation {
  id: string
  appointment_id: string
  recording_consent: boolean
  consented_at: string | null
  audio_path: string | null
  processing_status: ProcessingStatus
  transcript: string | null
  ai_summary_draft: ClinicalSummary | null
  final_summary: ClinicalSummary | null
  reviewed_at: string | null
  error_message: string | null
}
