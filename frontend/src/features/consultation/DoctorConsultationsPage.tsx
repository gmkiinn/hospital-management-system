import type { ReactNode } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { AxiosError } from 'axios'
import toast from 'react-hot-toast'
import { Pencil, Stethoscope } from 'lucide-react'
import { useAuth } from '../../auth/useAuth'
import { listAppointments } from '../../api/appointments'
import { listDoctors } from '../../api/doctors'
import { startConsultation } from '../../api/consultations'
import type { Appointment } from '../../types'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  Spinner,
} from '../../components/ui'
import { statusTone } from '../frontdesk/status'

function apiError(err: unknown, fallback: string): string {
  return err instanceof AxiosError
    ? String(err.response?.data?.detail ?? fallback)
    : fallback
}

function isToday(iso: string): boolean {
  return new Date(iso).toDateString() === new Date().toDateString()
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function DoctorConsultationsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const doctorsQuery = useQuery({
    queryKey: ['doctors'],
    queryFn: () => listDoctors(),
  })
  const myDoctor = doctorsQuery.data?.find((d) => d.user_id === user?.id)

  const appointmentsQuery = useQuery({
    queryKey: ['appointments', myDoctor?.id],
    queryFn: () => listAppointments({ doctor_id: myDoctor!.id }),
    enabled: Boolean(myDoctor?.id),
    refetchInterval: 5000, // live updates when reception checks patients in
  })
  const open = useMutation({
    mutationFn: startConsultation,
    onSuccess: (consultation) => navigate(`/consultations/${consultation.id}`),
    onError: (err) => toast.error(apiError(err, 'Could not open consultation')),
  })

  if (doctorsQuery.isLoading) return <Spinner />

  if (!myDoctor) {
    return (
      <div>
        <PageHeader title="Consultations" />
        <EmptyState>No doctor profile is linked to this account.</EmptyState>
      </div>
    )
  }

  const today = (appointmentsQuery.data ?? []).filter(
    (a) => a.status !== 'cancelled' && isToday(a.slot_start),
  )
  const ready = today.filter((a) =>
    ['arrived', 'in_consultation'].includes(a.status),
  )
  const waiting = today.filter((a) => a.status === 'booked')
  const completed = today.filter((a) => a.status === 'completed')

  return (
    <div>
      <PageHeader
        title="Consultations"
        subtitle={`${myDoctor.full_name} · today`}
      />

      {/* Live counts */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <Stat label="Waiting" value={waiting.length} tone="text-blue-700" />
        <Stat label="Ready to see" value={ready.length} tone="text-amber-700" />
        <Stat
          label="Completed"
          value={completed.length}
          tone="text-green-700"
        />
      </div>

      {appointmentsQuery.isLoading ? (
        <Spinner />
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Ready to see
            </h2>
            {ready.length === 0 ? (
              <EmptyState>No patients are checked in right now.</EmptyState>
            ) : (
              <div className="space-y-2">
                {ready.map((a) => (
                  <Row
                    key={a.id}
                    a={a}
                    name={a.patient_name ?? '—'}
                    action={
                      <Button
                        onClick={() => open.mutate(a.id)}
                        disabled={open.isPending}
                      >
                        <Stethoscope className="h-4 w-4" />
                        {a.status === 'in_consultation' ? 'Resume' : 'Start'}
                      </Button>
                    }
                  />
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Waiting in queue
            </h2>
            {waiting.length === 0 ? (
              <EmptyState>No booked patients waiting.</EmptyState>
            ) : (
              <div className="space-y-2">
                {waiting.map((a) => (
                  <Row key={a.id} a={a} name={a.patient_name ?? '—'} />
                ))}
              </div>
            )}
          </section>

          {completed.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Completed today
              </h2>
              <div className="space-y-2">
                {completed.map((a) => (
                  <Row
                    key={a.id}
                    a={a}
                    name={a.patient_name ?? '—'}
                    action={
                      <Button
                        variant="secondary"
                        onClick={() => open.mutate(a.id)}
                        disabled={open.isPending}
                      >
                        <Pencil className="h-4 w-4" /> View / Edit
                      </Button>
                    }
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function Row({
  a,
  name,
  action,
}: {
  a: Appointment
  name: string
  action?: ReactNode
}) {
  return (
    <Card className="flex items-center justify-between py-3">
      <div className="flex items-center gap-4">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
          {a.token_number ?? '—'}
        </div>
        <div>
          <div className="font-medium text-slate-800">{name}</div>
          <div className="text-xs text-slate-500">
            {fmtTime(a.slot_start)}
            {a.reason ? ` · ${a.reason}` : ''}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge tone={statusTone(a.status)}>{a.status.replace('_', ' ')}</Badge>
        {action}
      </div>
    </Card>
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
