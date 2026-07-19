import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import toast from 'react-hot-toast'
import { Building2, Stethoscope } from 'lucide-react'
import { createDepartment, listDepartments } from '../../api/departments'
import { createDoctor, listDoctors, updateDoctor } from '../../api/doctors'
import type { Doctor, DoctorSession } from '../../types'
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  SelectField,
  Spinner,
  TextField,
} from '../../components/ui'
import { SessionsEditor } from './SessionsEditor'

function apiError(err: unknown, fallback: string): string {
  return err instanceof AxiosError
    ? String(err.response?.data?.detail ?? fallback)
    : fallback
}

const deptSchema = z.object({
  name: z.string().min(1, 'Required'),
  description: z.string().optional(),
})
type DeptForm = z.infer<typeof deptSchema>

const doctorSchema = z.object({
  full_name: z.string().min(1, 'Required'),
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'Min 8 characters'),
  department_id: z.string().min(1, 'Select a department'),
  specialization: z.string().optional(),
  slot_duration_minutes: z.number().min(5).max(120),
})
type DoctorForm = z.infer<typeof doctorSchema>

export function SetupPage() {
  const queryClient = useQueryClient()
  const departmentsQuery = useQuery({
    queryKey: ['departments'],
    queryFn: listDepartments,
  })
  const doctorsQuery = useQuery({
    queryKey: ['doctors'],
    queryFn: () => listDoctors(),
  })

  const deptForm = useForm<DeptForm>({ resolver: zodResolver(deptSchema) })
  const doctorForm = useForm<DoctorForm>({
    resolver: zodResolver(doctorSchema),
    defaultValues: { slot_duration_minutes: 15 },
  })
  const [sessions, setSessions] = useState<DoctorSession[]>([])

  const createDept = useMutation({
    mutationFn: createDepartment,
    onSuccess: (d) => {
      toast.success(`Added ${d.name}`)
      deptForm.reset()
      queryClient.invalidateQueries({ queryKey: ['departments'] })
    },
    onError: (err) => toast.error(apiError(err, 'Could not add department')),
  })

  const createDoc = useMutation({
    mutationFn: createDoctor,
    onSuccess: (d) => {
      toast.success(`Onboarded ${d.full_name}`)
      doctorForm.reset({ slot_duration_minutes: 15 })
      setSessions([])
      queryClient.invalidateQueries({ queryKey: ['doctors'] })
    },
    onError: (err) => toast.error(apiError(err, 'Could not onboard doctor')),
  })

  const departments = departmentsQuery.data ?? []
  const doctors = doctorsQuery.data ?? []

  return (
    <div>
      <PageHeader
        title="Setup"
        subtitle="Departments and doctors for your hospital"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Departments */}
        <Card>
          <h2 className="mb-4 flex items-center gap-2 font-medium text-slate-800">
            <Building2 className="h-4 w-4 text-indigo-600" /> Departments
          </h2>
          <form
            onSubmit={deptForm.handleSubmit((v) => createDept.mutate(v))}
            className="mb-4 space-y-3"
          >
            <TextField
              label="Name"
              error={deptForm.formState.errors.name?.message}
              {...deptForm.register('name')}
            />
            <TextField
              label="Description"
              {...deptForm.register('description')}
            />
            <Button type="submit" disabled={createDept.isPending}>
              Add department
            </Button>
          </form>
          {departmentsQuery.isLoading ? (
            <Spinner />
          ) : departments.length === 0 ? (
            <EmptyState>No departments yet.</EmptyState>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {departments.map((d) => (
                <li key={d.id} className="py-2 text-slate-700">
                  {d.name}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Doctors */}
        <Card>
          <h2 className="mb-4 flex items-center gap-2 font-medium text-slate-800">
            <Stethoscope className="h-4 w-4 text-indigo-600" /> Doctors
          </h2>
          <form
            onSubmit={doctorForm.handleSubmit((v) =>
              createDoc.mutate({ ...v, sessions }),
            )}
            className="mb-4 space-y-3"
          >
            <TextField
              label="Full name"
              error={doctorForm.formState.errors.full_name?.message}
              {...doctorForm.register('full_name')}
            />
            <TextField
              label="Email (login)"
              error={doctorForm.formState.errors.email?.message}
              {...doctorForm.register('email')}
            />
            <TextField
              label="Password"
              type="password"
              error={doctorForm.formState.errors.password?.message}
              {...doctorForm.register('password')}
            />
            <SelectField
              label="Department"
              error={doctorForm.formState.errors.department_id?.message}
              {...doctorForm.register('department_id')}
            >
              <option value="">Select…</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </SelectField>
            <TextField
              label="Specialization"
              {...doctorForm.register('specialization')}
            />
            <TextField
              label="Slot length (minutes)"
              type="number"
              error={doctorForm.formState.errors.slot_duration_minutes?.message}
              {...doctorForm.register('slot_duration_minutes', {
                valueAsNumber: true,
              })}
            />
            <SessionsEditor value={sessions} onChange={setSessions} />
            <Button type="submit" disabled={createDoc.isPending}>
              Onboard doctor
            </Button>
          </form>
          {doctorsQuery.isLoading ? (
            <Spinner />
          ) : doctors.length === 0 ? (
            <EmptyState>No doctors yet.</EmptyState>
          ) : (
            <ul className="divide-y divide-slate-100">
              {doctors.map((d) => (
                <DoctorRow key={d.id} doctor={d} />
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}

// --- One doctor in the list, with an inline "edit hours" editor ---
function DoctorRow({ doctor }: { doctor: Doctor }) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [sessions, setSessions] = useState<DoctorSession[]>(doctor.sessions)
  const [duration, setDuration] = useState(doctor.slot_duration_minutes)

  const save = useMutation({
    mutationFn: () =>
      updateDoctor(doctor.id, {
        sessions,
        slot_duration_minutes: duration,
      }),
    onSuccess: () => {
      toast.success('Hours updated')
      setEditing(false)
      queryClient.invalidateQueries({ queryKey: ['doctors'] })
    },
    onError: (err) => toast.error(apiError(err, 'Could not update hours')),
  })

  const summary =
    doctor.sessions.length === 0
      ? 'No hours set'
      : doctor.sessions
          .map((s) => `${s.label || 'Session'} ${s.start}–${s.end}`)
          .join(' · ')

  return (
    <li className="py-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="font-medium text-slate-700">{doctor.full_name}</span>
          {doctor.specialization && (
            <span className="text-slate-500"> · {doctor.specialization}</span>
          )}
          <div className="mt-0.5 text-xs text-slate-400">
            {summary} · {doctor.slot_duration_minutes}m slots
          </div>
        </div>
        <Button variant="ghost" onClick={() => setEditing((v) => !v)}>
          {editing ? 'Close' : 'Edit hours'}
        </Button>
      </div>
      {editing && (
        <div className="mt-3 space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3">
          <SessionsEditor value={sessions} onChange={setSessions} />
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Slot length (minutes)
            </span>
            <input
              type="number"
              min={5}
              max={120}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-32 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </label>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            Save hours
          </Button>
        </div>
      )}
    </li>
  )
}
