import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { AxiosError } from 'axios'
import toast from 'react-hot-toast'
import { Stethoscope } from 'lucide-react'
import { useAuth } from '../../auth/useAuth'
import { listAppointments } from '../../api/appointments'
import { listDoctors } from '../../api/doctors'
import { listPatients } from '../../api/patients'
import { startConsultation } from '../../api/consultations'
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
  })
  const patientsQuery = useQuery({
    queryKey: ['patients', ''],
    queryFn: () => listPatients(),
  })

  const open = useMutation({
    mutationFn: startConsultation,
    onSuccess: (consultation) => navigate(`/consultations/${consultation.id}`),
    onError: (err) => toast.error(apiError(err, 'Could not open consultation')),
  })

  const patientName = (id: string) =>
    patientsQuery.data?.find((p) => p.id === id)?.full_name ?? '—'

  if (doctorsQuery.isLoading) return <Spinner />

  if (!myDoctor) {
    return (
      <div>
        <PageHeader title="Consultations" />
        <EmptyState>No doctor profile is linked to this account.</EmptyState>
      </div>
    )
  }

  const consultable = (appointmentsQuery.data ?? []).filter((a) =>
    ['arrived', 'in_consultation'].includes(a.status),
  )

  return (
    <div>
      <PageHeader
        title="Consultations"
        subtitle={`Patients waiting for ${myDoctor.full_name}`}
      />
      {appointmentsQuery.isLoading ? (
        <Spinner />
      ) : consultable.length === 0 ? (
        <EmptyState>No patients are checked in right now.</EmptyState>
      ) : (
        <div className="space-y-2">
          {consultable.map((a) => (
            <Card key={a.id} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-4">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                  {a.token_number ?? '—'}
                </div>
                <div>
                  <div className="font-medium text-slate-800">
                    {patientName(a.patient_id)}
                  </div>
                  {a.reason && (
                    <div className="text-xs text-slate-500">{a.reason}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone={statusTone(a.status)}>
                  {a.status.replace('_', ' ')}
                </Badge>
                <Button
                  onClick={() => open.mutate(a.id)}
                  disabled={open.isPending}
                >
                  <Stethoscope className="h-4 w-4" />
                  {a.status === 'in_consultation' ? 'Resume' : 'Start'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
