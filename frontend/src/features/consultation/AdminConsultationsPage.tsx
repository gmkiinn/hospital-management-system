import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { AxiosError } from 'axios'
import toast from 'react-hot-toast'
import { Eye, Pencil } from 'lucide-react'
import { listAppointments } from '../../api/appointments'
import { listDoctors } from '../../api/doctors'
import { startConsultation } from '../../api/consultations'
import type { AppointmentStatus } from '../../types'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  SelectField,
  Spinner,
  TextField,
} from '../../components/ui'
import { statusTone } from '../frontdesk/status'

function apiError(err: unknown, fallback: string): string {
  return err instanceof AxiosError
    ? String(err.response?.data?.detail ?? fallback)
    : fallback
}

function todayStr(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function localDateStr(iso: string): string {
  const d = new Date(iso)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Statuses whose consultation note an admin can open (view or edit).
const OPENABLE: AppointmentStatus[] = [
  'arrived',
  'in_consultation',
  'completed',
]

export function AdminConsultationsPage() {
  const navigate = useNavigate()
  const [doctorId, setDoctorId] = useState('')
  const [date, setDate] = useState(todayStr())

  const doctorsQuery = useQuery({
    queryKey: ['doctors'],
    queryFn: () => listDoctors(),
  })
  const doctors = doctorsQuery.data ?? []
  const activeDoctorId = doctorId || doctors[0]?.id || ''

  const appointmentsQuery = useQuery({
    queryKey: ['appointments', activeDoctorId],
    queryFn: () => listAppointments({ doctor_id: activeDoctorId }),
    enabled: Boolean(activeDoctorId),
    refetchInterval: 5000,
  })
  const open = useMutation({
    mutationFn: startConsultation,
    onSuccess: (consultation) => navigate(`/consultations/${consultation.id}`),
    onError: (err) => toast.error(apiError(err, 'Could not open consultation')),
  })

  const rows = (appointmentsQuery.data ?? []).filter(
    (a) => a.status !== 'cancelled' && localDateStr(a.slot_start) === date,
  )
  const count = (s: AppointmentStatus) =>
    rows.filter((a) => a.status === s).length

  return (
    <div>
      <PageHeader
        title="Consultations"
        subtitle="Oversight — pick a doctor and day to review their consultations"
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:max-w-2xl">
        <SelectField
          label="Doctor"
          value={activeDoctorId}
          onChange={(e) => setDoctorId(e.target.value)}
        >
          {doctors.length === 0 && <option value="">No doctors</option>}
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.full_name}
              {d.specialization ? ` · ${d.specialization}` : ''}
            </option>
          ))}
        </SelectField>
        <TextField
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value || todayStr())}
        />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Booked" value={count('booked')} tone="text-blue-700" />
        <Stat label="Arrived" value={count('arrived')} tone="text-amber-700" />
        <Stat
          label="In consult"
          value={count('in_consultation')}
          tone="text-indigo-700"
        />
        <Stat
          label="Completed"
          value={count('completed')}
          tone="text-green-700"
        />
      </div>

      {!activeDoctorId ? (
        <EmptyState>Add a doctor in Setup first.</EmptyState>
      ) : appointmentsQuery.isLoading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <EmptyState>No consultations for this doctor on this day.</EmptyState>
      ) : (
        <div className="space-y-2">
          {rows.map((a) => {
            const canOpen = OPENABLE.includes(a.status)
            const isDone = a.status === 'completed'
            return (
              <Card
                key={a.id}
                className="flex items-center justify-between py-3"
              >
                <div className="flex items-center gap-4">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                    {a.token_number ?? '—'}
                  </div>
                  <div>
                    <div className="font-medium text-slate-800">
                      {a.patient_name ?? '—'}
                    </div>
                    <div className="text-xs text-slate-500">
                      {fmtTime(a.slot_start)}
                      {a.reason ? ` · ${a.reason}` : ''}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={statusTone(a.status)}>
                    {a.status.replace('_', ' ')}
                  </Badge>
                  {canOpen && (
                    <Button
                      variant="secondary"
                      onClick={() => open.mutate(a.id)}
                      disabled={open.isPending}
                    >
                      {isDone ? (
                        <>
                          <Pencil className="h-4 w-4" /> View / Edit
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4" /> Open
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: string
}) {
  return (
    <Card className="py-3 text-center">
      <div className={`text-2xl font-semibold ${tone}`}>{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </Card>
  )
}
