import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { navFor } from '../config/nav'
import { EmptyState } from '../components/ui'

export function DashboardPage() {
  const { user } = useAuth()
  if (!user) return null

  const links = navFor(user.role)

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-800">
        Welcome, {user.full_name}
      </h1>
      <p className="mt-1 text-slate-500">
        Signed in as{' '}
        <span className="font-medium capitalize text-slate-700">
          {user.role}
        </span>
        .
      </p>

      {links.length === 0 ? (
        <div className="mt-8">
          <EmptyState>No tools are available for your role yet.</EmptyState>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.to}
                to={item.to}
                className="group rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow"
              >
                <div className="mb-3 inline-flex rounded-lg bg-indigo-50 p-2.5 text-indigo-600 transition group-hover:bg-indigo-100">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="font-medium text-slate-800">{item.label}</div>
                <div className="mt-0.5 text-sm text-slate-500">
                  {item.description}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
