import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import toast from 'react-hot-toast'
import { UserPlus } from 'lucide-react'
import { createPatient, listPatients } from '../../api/patients'
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  SelectField,
  Spinner,
  TextField,
} from '../../components/ui'

const schema = z.object({
  full_name: z.string().min(1, 'Required'),
  phone: z.string().min(3, 'Required'),
  gender: z.enum(['male', 'female', 'other']).optional().or(z.literal('')),
  blood_group: z.string().optional(),
  allergies: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

function apiError(err: unknown, fallback: string): string {
  return err instanceof AxiosError
    ? String(err.response?.data?.detail ?? fallback)
    : fallback
}

export function PatientsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')

  const patientsQuery = useQuery({
    queryKey: ['patients', search],
    queryFn: () => listPatients(search || undefined),
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const createMutation = useMutation({
    mutationFn: createPatient,
    onSuccess: (patient) => {
      toast.success(`Registered ${patient.full_name}`)
      reset()
      queryClient.invalidateQueries({ queryKey: ['patients'] })
    },
    onError: (err) => toast.error(apiError(err, 'Could not register patient')),
  })

  function onSubmit(values: FormValues) {
    createMutation.mutate({
      full_name: values.full_name,
      phone: values.phone,
      gender: values.gender ? values.gender : null,
      blood_group: values.blood_group || null,
      allergies: values.allergies || null,
    })
  }

  const patients = patientsQuery.data ?? []

  return (
    <div>
      <PageHeader title="Patients" subtitle="Register and look up patients" />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <h2 className="mb-4 flex items-center gap-2 font-medium text-slate-800">
            <UserPlus className="h-4 w-4 text-indigo-600" /> New patient
          </h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <TextField
              label="Full name"
              error={errors.full_name?.message}
              {...register('full_name')}
            />
            <TextField
              label="Phone"
              error={errors.phone?.message}
              {...register('phone')}
            />
            <SelectField label="Gender" {...register('gender')}>
              <option value="">—</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </SelectField>
            <TextField label="Blood group" {...register('blood_group')} />
            <TextField label="Allergies" {...register('allergies')} />
            <Button
              type="submit"
              className="w-full"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Saving…' : 'Register patient'}
            </Button>
          </form>
        </Card>

        <div className="lg:col-span-2">
          <div className="mb-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or phone…"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {patientsQuery.isLoading ? (
            <Spinner />
          ) : patients.length === 0 ? (
            <EmptyState>No patients found.</EmptyState>
          ) : (
            <Card className="overflow-x-auto p-0">
              <table className="w-full min-w-[28rem] text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Name</th>
                    <th className="px-4 py-2.5 font-medium">Phone</th>
                    <th className="px-4 py-2.5 font-medium">Gender</th>
                    <th className="px-4 py-2.5 font-medium">Blood</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {patients.map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-2.5 font-medium text-slate-800">
                        {p.full_name}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{p.phone}</td>
                      <td className="px-4 py-2.5 capitalize text-slate-600">
                        {p.gender ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">
                        {p.blood_group ?? '—'}
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
