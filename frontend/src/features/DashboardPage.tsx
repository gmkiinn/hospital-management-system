import { useAuth } from '../auth/useAuth'

export function DashboardPage() {
  const { user } = useAuth()

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-800">
        Welcome, {user?.full_name}
      </h1>
      <p className="mt-1 text-slate-500">
        You are signed in as{' '}
        <span className="font-medium capitalize text-slate-700">
          {user?.role}
        </span>
        .
      </p>

      <div className="mt-8 rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
        Front desk and consultation features are coming next.
      </div>
    </div>
  )
}
