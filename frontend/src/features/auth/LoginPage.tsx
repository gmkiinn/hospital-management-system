import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Navigate, useNavigate } from 'react-router-dom'
import { AxiosError } from 'axios'
import toast from 'react-hot-toast'
import { Stethoscope } from 'lucide-react'
import { useAuth } from '../../auth/useAuth'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

type FormValues = z.infer<typeof schema>

// Demo accounts shown on the login screen (portfolio/hackathon build).
const DEMO_ACCOUNTS: { role: string; email: string; password: string }[] = [
  { role: 'Admin', email: 'admin@demo.com', password: 'admin12345' },
  {
    role: 'Receptionist',
    email: 'reception@demo.com',
    password: 'reception123',
  },
  { role: 'Doctor', email: 'dr.rahul@demo.com', password: 'doctor12345' },
]

export function LoginPage() {
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    try {
      await login(values.email, values.password)
      toast.success('Welcome back')
      navigate('/', { replace: true })
    } catch (err) {
      const detail =
        err instanceof AxiosError
          ? (err.response?.data?.detail ?? 'Login failed')
          : 'Login failed'
      toast.error(String(detail))
    } finally {
      setSubmitting(false)
    }
  }

  // Already signed in — don't show the login form.
  if (user) return <Navigate to="/" replace />

  return (
    <div className="grid min-h-screen place-items-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="grid h-11 w-11 place-items-center rounded-lg bg-indigo-600">
            <Stethoscope className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-lg font-semibold text-slate-800">
            AI Hospital Management System
          </h1>
          <p className="text-sm text-slate-500">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              type="email"
              autoComplete="username"
              {...register('email')}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="admin@demo.com"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              {...register('password')}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-600">
                {errors.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {/* Demo credentials — click a role to fill the form */}
        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 text-center text-xs font-medium uppercase tracking-wide text-slate-500">
            Demo logins — tap to fill
          </p>
          <div className="space-y-1.5">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => {
                  setValue('email', acc.email, { shouldValidate: true })
                  setValue('password', acc.password, { shouldValidate: true })
                }}
                className="flex w-full flex-col items-start gap-0.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-xs transition hover:border-indigo-300 hover:bg-indigo-50 sm:flex-row sm:items-center sm:justify-between sm:gap-2"
              >
                <span className="font-medium text-slate-700">{acc.role}</span>
                <span className="text-slate-500">
                  {acc.email} · {acc.password}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
