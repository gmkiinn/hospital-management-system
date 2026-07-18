import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import toast from 'react-hot-toast'
import { CalendarPlus } from 'lucide-react'
import { bookAppointment, listAppointments } from '../../api/appointments'
import { listDoctors } from '../../api/doctors'
import { listPatients } from '../../api/patients'
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
import { statusTone } from './status'

function apiError(err: unknown, fallback: string): string {
  return err instanceof AxiosError
    ? String(err.response?.data?.detail ?? fallback)
    : fallback
}

const schema = z.object({
  doctor_id: z.string().min(1, 'Select a doctor'),
  patient_id: z.string().min(1, 'Select a patient'),
  slot_start: z.string().min(1, 'Pick a time'),
  reason: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export function BookingPage() {
  const queryClient = useQueryClient()
  const doctorsQuery = useQuery({
    queryKey: ['doctors'],
    queryFn: () => listDoctors(),
  })
  const patientsQuery = useQuery({
    queryKey: ['patients', ''],
    queryFn: () => listPatients(),
  })
  const appointmentsQuery = useQuery({
    queryKey: ['appointments'],
    queryFn: () => listAppointments(),
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const book = useMutation({
    mutationFn: bookAppointment,
    onSuccess: () => {
      toast.success('Appointment booked')
      reset()
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
    },
    onError: (err) => toast.error(apiError(err, 'Could not book appointment')),
  })

  function onSubmit(values: FormValues) {
    book.mutate({
      doctor_id: values.doctor_id,
      patient_id: values.patient_id,
      // datetime-local has no timezone; convert to an ISO instant.
      slot_start: new Date(values.slot_start).toISOString(),
      source: 'walk_in',
      reason: values.reason || null,
    })
  }

  const doctors = doctorsQuery.data ?? []
  const patients = patientsQuery.data ?? []
  const appointments = appointmentsQuery.data ?? []
  const doctorName = (id: string) =>
    doctors.find((d) => d.id === id)?.full_name ?? '—'
  const patientName = (id: string) =>
    patients.find((p) => p.id === id)?.full_name ?? '—'

  return (
    <div>
      <PageHeader title="Appointments" subtitle="Book and track appointments" />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <h2 className="mb-4 flex items-center gap-2 font-medium text-slate-800">
            <CalendarPlus className="h-4 w-4 text-indigo-600" /> New appointment
          </h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <SelectField
              label="Doctor"
              error={errors.doctor_id?.message}
              {...register('doctor_id')}
            >
              <option value="">Select…</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.full_name}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Patient"
              error={errors.patient_id?.message}
              {...register('patient_id')}
            >
              <option value="">Select…</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name} · {p.phone}
                </option>
              ))}
            </SelectField>
            <TextField
              label="Slot start"
              type="datetime-local"
              error={errors.slot_start?.message}
              {...register('slot_start')}
            />
            <TextField label="Reason" {...register('reason')} />
            <Button type="submit" className="w-full" disabled={book.isPending}>
              {book.isPending ? 'Booking…' : 'Book appointment'}
            </Button>
          </form>
        </Card>

        <div className="lg:col-span-2">
          {appointmentsQuery.isLoading ? (
            <Spinner />
          ) : appointments.length === 0 ? (
            <EmptyState>No appointments yet.</EmptyState>
          ) : (
            <Card className="overflow-hidden p-0">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Patient</th>
                    <th className="px-4 py-2.5 font-medium">Doctor</th>
                    <th className="px-4 py-2.5 font-medium">When</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {appointments.map((a) => (
                    <tr key={a.id}>
                      <td className="px-4 py-2.5 font-medium text-slate-800">
                        {patientName(a.patient_id)}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">
                        {doctorName(a.doctor_id)}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">
                        {new Date(a.slot_start).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge tone={statusTone(a.status)}>
                          {a.status.replace('_', ' ')}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
