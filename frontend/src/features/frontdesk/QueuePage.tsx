import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import toast from 'react-hot-toast'
import { CheckCircle2 } from 'lucide-react'
import { doctorQueue, markArrived } from '../../api/appointments'
import { listDoctors } from '../../api/doctors'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  Spinner,
} from '../../components/ui'
import { statusTone } from './status'

function apiError(err: unknown, fallback: string): string {
  return err instanceof AxiosError
    ? String(err.response?.data?.detail ?? fallback)
    : fallback
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

export function QueuePage() {
  const queryClient = useQueryClient()
  const [doctorId, setDoctorId] = useState('')

  const doctorsQuery = useQuery({
    queryKey: ['doctors'],
    queryFn: () => listDoctors(),
  })
  const queueQuery = useQuery({
    queryKey: ['queue', doctorId],
    queryFn: () => doctorQueue(doctorId),
    enabled: Boolean(doctorId),
    refetchInterval: 5000, // keep the board live as the doctor works
  })

  const arrive = useMutation({
    mutationFn: markArrived,
    onSuccess: (a) => {
      toast.success(`Checked in · token #${a.token_number}`)
      queryClient.invalidateQueries({ queryKey: ['queue'] })
    },
    onError: (err) => toast.error(apiError(err, 'Could not check in')),
  })

  const doctors = doctorsQuery.data ?? []
  const queue = queueQuery.data ?? []

  const waiting = queue.filter((a) => a.status === 'booked').length
  const arrived = queue.filter((a) => a.status === 'arrived').length
  const inConsult = queue.filter((a) => a.status === 'in_consultation').length

  return (
    <div>
      <PageHeader title="Queue" subtitle="Live queue and status counts" />

      <div className="mb-4 max-w-sm">
        <select
          value={doctorId}
          onChange={(e) => setDoctorId(e.target.value)}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">Select a doctor…</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.full_name}
            </option>
          ))}
        </select>
      </div>

      {doctorId && (
        <div className="mb-5 grid grid-cols-3 gap-3 sm:max-w-lg">
          <Stat label="Waiting" value={waiting} tone="text-blue-700" />
          <Stat label="Arrived" value={arrived} tone="text-amber-700" />
          <Stat label="In consult" value={inConsult} tone="text-indigo-700" />
        </div>
      )}

      {!doctorId ? (
        <EmptyState>Choose a doctor to see their queue.</EmptyState>
      ) : queueQuery.isLoading ? (
        <Spinner />
      ) : queue.length === 0 ? (
        <EmptyState>No patients in the queue.</EmptyState>
      ) : (
        <div className="space-y-2">
          {queue.map((a) => (
            <Card key={a.id} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-4">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                  {a.token_number ?? '—'}
                </div>
                <div>
                  <div className="font-medium text-slate-800">
                    {a.patient_name ?? '—'}
                  </div>
                  <div className="text-xs text-slate-500">
                    {new Date(a.slot_start).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone={statusTone(a.status)}>
                  {a.status.replace('_', ' ')}
                </Badge>
                {a.status === 'booked' && (
                  <Button
                    variant="secondary"
                    onClick={() => arrive.mutate(a.id)}
                    disabled={arrive.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4" /> Check in
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
