import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import toast from 'react-hot-toast'
import { Building2, Stethoscope } from 'lucide-react'
import { createDepartment, listDepartments } from '../../api/departments'
import { createDoctor, listDoctors } from '../../api/doctors'
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  SelectField,
  Spinner,
  TextField,
} from '../../components/ui'

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
  })

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
      doctorForm.reset()
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
            onSubmit={doctorForm.handleSubmit((v) => createDoc.mutate(v))}
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
            <Button type="submit" disabled={createDoc.isPending}>
              Onboard doctor
            </Button>
          </form>
          {doctorsQuery.isLoading ? (
            <Spinner />
          ) : doctors.length === 0 ? (
            <EmptyState>No doctors yet.</EmptyState>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {doctors.map((d) => (
                <li key={d.id} className="py-2 text-slate-700">
                  <span className="font-medium">{d.full_name}</span>
                  {d.specialization && (
                    <span className="text-slate-500">
                      {' '}
                      · {d.specialization}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
