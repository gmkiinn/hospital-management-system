import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import toast from 'react-hot-toast'
import { CalendarDays, CheckCircle2, LogIn } from 'lucide-react'
import {
  bookWalkIn,
  cancelAppointment,
  markArrived,
} from '../../api/appointments'
import { getDoctorSlots, listDoctors } from '../../api/doctors'
import type { Gender, Slot } from '../../types'
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
import { SLOT_LEGEND, SLOT_VISUALS } from './slotVisual'

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

export function BookingPage() {
  const queryClient = useQueryClient()
  const [doctorId, setDoctorId] = useState('')
  const [date, setDate] = useState(todayStr())
  const [selectedStart, setSelectedStart] = useState<string | null>(null)

  const doctorsQuery = useQuery({
    queryKey: ['doctors'],
    queryFn: () => listDoctors(),
  })
  const doctors = doctorsQuery.data ?? []

  // Default to the first doctor without a setState-in-effect: derive it.
  const activeDoctorId = doctorId || doctors[0]?.id || ''

  const slotsQuery = useQuery({
    queryKey: ['slots', activeDoctorId, date],
    queryFn: () => getDoctorSlots(activeDoctorId, date),
    enabled: Boolean(activeDoctorId),
  })
  const board = slotsQuery.data

  // Track the selected slot by its start so it stays in sync after refetches.
  const selectedSlot = useMemo<Slot | null>(() => {
    if (!board || !selectedStart) return null
    for (const session of board.sessions) {
      for (const slot of session.slots) {
        if (slot.slot_start === selectedStart) return slot
      }
    }
    return null
  }, [board, selectedStart])

  function refreshSlots() {
    queryClient.invalidateQueries({ queryKey: ['slots', activeDoctorId, date] })
  }

  const bookMutation = useMutation({
    mutationFn: bookWalkIn,
    onSuccess: () => {
      toast.success('Appointment booked')
      setSelectedStart(null)
      refreshSlots()
    },
    onError: (err) => {
      toast.error(apiError(err, 'Could not book'))
      refreshSlots() // slot may have just been taken
    },
  })

  const arriveMutation = useMutation({
    mutationFn: markArrived,
    onSuccess: () => {
      toast.success('Patient checked in')
      refreshSlots()
    },
    onError: (err) => toast.error(apiError(err, 'Could not check in')),
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelAppointment(id),
    onSuccess: () => {
      toast.success('Appointment cancelled')
      setSelectedStart(null)
      refreshSlots()
    },
    onError: (err) => toast.error(apiError(err, 'Could not cancel')),
  })

  const selectedDoctor = doctors.find((d) => d.id === activeDoctorId)
  const hasSessions = (selectedDoctor?.sessions.length ?? 0) > 0

  return (
    <div>
      <PageHeader
        title="Appointments"
        subtitle="Pick a doctor and day, then click an open slot to book a patient"
      />

      {/* Controls */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:max-w-2xl">
        <SelectField
          label="Doctor"
          value={activeDoctorId}
          onChange={(e) => {
            setDoctorId(e.target.value)
            setSelectedStart(null)
          }}
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
          onChange={(e) => {
            setDate(e.target.value || todayStr())
            setSelectedStart(null)
          }}
        />
      </div>

      {/* Legend */}
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
        {SLOT_LEGEND.map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span
              className={`inline-block h-3 w-3 rounded border ${SLOT_VISUALS[s].cell.split(' hover')[0]}`}
            />
            {SLOT_VISUALS[s].label}
          </span>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        {/* Board */}
        <div>
          {!activeDoctorId ? (
            <EmptyState>Add a doctor in Setup to start booking.</EmptyState>
          ) : slotsQuery.isLoading ? (
            <Spinner />
          ) : !hasSessions ? (
            <EmptyState>
              {selectedDoctor?.full_name} has no working hours yet. An admin can
              add sessions on the Setup screen.
            </EmptyState>
          ) : (
            <div className="space-y-6">
              {board?.sessions.map((session) => (
                <Card key={`${session.label}-${session.start}`}>
                  <div className="mb-3 flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-indigo-600" />
                    <h2 className="font-medium text-slate-800">
                      {session.label}
                    </h2>
                    <span className="text-sm text-slate-400">
                      {session.start}–{session.end}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                    {session.slots.map((slot) => {
                      const v = SLOT_VISUALS[slot.status]
                      const active = slot.slot_start === selectedStart
                      return (
                        <button
                          key={slot.slot_start}
                          onClick={() => setSelectedStart(slot.slot_start)}
                          className={`rounded-md border px-3 py-2 text-left text-sm transition ${v.cell} ${
                            active ? 'ring-2 ring-indigo-500' : ''
                          }`}
                        >
                          <div className="font-semibold">{slot.label}</div>
                          <div className="truncate text-xs opacity-80">
                            {slot.status === 'available'
                              ? 'Open'
                              : (slot.patient_name ?? v.label)}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          {!selectedSlot ? (
            <Card className="text-sm text-slate-500">
              Select a slot to book or manage an appointment.
            </Card>
          ) : selectedSlot.status === 'available' ? (
            <BookingForm
              key={selectedSlot.slot_start}
              time={selectedSlot.label}
              pending={bookMutation.isPending}
              onSubmit={(values) =>
                bookMutation.mutate({
                  doctor_id: activeDoctorId,
                  slot_start: selectedSlot.slot_start,
                  ...values,
                })
              }
              onClose={() => setSelectedStart(null)}
            />
          ) : (
            <SlotDetails
              slot={selectedSlot}
              onArrive={() =>
                selectedSlot.appointment_id &&
                arriveMutation.mutate(selectedSlot.appointment_id)
              }
              arrivePending={arriveMutation.isPending}
              onCancel={() =>
                selectedSlot.appointment_id &&
                cancelMutation.mutate(selectedSlot.appointment_id)
              }
              cancelPending={cancelMutation.isPending}
              onClose={() => setSelectedStart(null)}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// --- Booking form (available slot) ---
const bookingSchema = z.object({
  full_name: z.string().min(1, 'Required'),
  phone: z.string().min(3, 'Required'),
  gender: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().optional(),
  paid: z.boolean(),
})
type BookingForm = z.infer<typeof bookingSchema>

function BookingForm({
  time,
  pending,
  onSubmit,
  onClose,
}: {
  time: string
  pending: boolean
  onSubmit: (values: {
    full_name: string
    phone: string
    gender: Gender | null
    email: string | null
    address: string | null
    paid: boolean
  }) => void
  onClose: () => void
}) {
  const { register, handleSubmit, formState } = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
    defaultValues: { paid: false },
  })

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-medium text-slate-800">Book {time}</h2>
        <button
          onClick={onClose}
          className="text-sm text-slate-400 hover:text-slate-600"
        >
          ✕
        </button>
      </div>
      <form
        onSubmit={handleSubmit((v) =>
          onSubmit({
            full_name: v.full_name,
            phone: v.phone,
            gender: v.gender ? (v.gender as Gender) : null,
            email: v.email ? v.email : null,
            address: v.address ? v.address : null,
            paid: v.paid,
          }),
        )}
        className="space-y-3"
      >
        <TextField
          label="Patient name"
          error={formState.errors.full_name?.message}
          {...register('full_name')}
        />
        <TextField
          label="Phone"
          error={formState.errors.phone?.message}
          {...register('phone')}
        />
        <SelectField label="Gender (optional)" {...register('gender')}>
          <option value="">Select…</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </SelectField>
        <TextField
          label="Email (optional)"
          error={formState.errors.email?.message}
          {...register('email')}
        />
        <TextField
          label="Address (optional)"
          error={formState.errors.address?.message}
          {...register('address')}
        />
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            {...register('paid')}
          />
          Payment collected
        </label>
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? 'Booking…' : 'Book appointment'}
        </Button>
      </form>
    </Card>
  )
}

// --- Slot details (occupied slot) ---
function SlotDetails({
  slot,
  onArrive,
  arrivePending,
  onCancel,
  cancelPending,
  onClose,
}: {
  slot: Slot
  onArrive: () => void
  arrivePending: boolean
  onCancel: () => void
  cancelPending: boolean
  onClose: () => void
}) {
  const v = SLOT_VISUALS[slot.status]
  const canArrive = slot.status === 'booked'
  const canCancel = slot.status === 'booked' || slot.status === 'arrived'

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-medium text-slate-800">{slot.label}</h2>
        <button
          onClick={onClose}
          className="text-sm text-slate-400 hover:text-slate-600"
        >
          ✕
        </button>
      </div>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-500">Patient</dt>
          <dd className="font-medium text-slate-800">
            {slot.patient_name ?? '—'}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-slate-500">Status</dt>
          <dd>
            <Badge tone={v.badge}>{v.label}</Badge>
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Payment</dt>
          <dd className="font-medium text-slate-800">
            {slot.paid ? 'Collected' : 'Pending'}
          </dd>
        </div>
        {slot.token_number != null && (
          <div className="flex justify-between">
            <dt className="text-slate-500">Token</dt>
            <dd className="font-medium text-slate-800">#{slot.token_number}</dd>
          </div>
        )}
      </dl>

      {(canArrive || canCancel) && (
        <div className="mt-4 space-y-2">
          {canArrive && (
            <Button
              onClick={onArrive}
              disabled={arrivePending}
              className="w-full"
            >
              <LogIn className="h-4 w-4" /> Check in (send to doctor)
            </Button>
          )}
          {canCancel && (
            <Button
              variant="danger"
              onClick={onCancel}
              disabled={cancelPending}
              className="w-full"
            >
              Cancel appointment
            </Button>
          )}
        </div>
      )}
      {slot.status === 'completed' && (
        <p className="mt-4 flex items-center gap-1.5 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4" /> Visit completed
        </p>
      )}
    </Card>
  )
}
