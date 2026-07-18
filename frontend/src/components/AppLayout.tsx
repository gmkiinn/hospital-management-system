import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LogOut, Stethoscope } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import type { UserRole } from '../types'
import { cn } from '../lib/utils'

interface NavItem {
  to: string
  label: string
  roles: UserRole[]
}

const NAV: NavItem[] = [
  { to: '/setup', label: 'Setup', roles: ['admin'] },
  { to: '/patients', label: 'Patients', roles: ['admin', 'receptionist'] },
  {
    to: '/appointments',
    label: 'Appointments',
    roles: ['admin', 'receptionist'],
  },
  { to: '/queue', label: 'Queue', roles: ['admin', 'receptionist'] },
]

export function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  const links = NAV.filter((item) => user && item.roles.includes(user.role))

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 font-semibold text-slate-800">
              <Stethoscope className="h-5 w-5 text-indigo-600" />
              <span>HMS</span>
            </div>
            <nav className="flex items-center gap-1">
              {links.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'rounded-md px-3 py-1.5 text-sm font-medium transition',
                      isActive
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-600 hover:bg-slate-100',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <div className="text-right text-sm leading-tight">
                <div className="font-medium text-slate-800">
                  {user.full_name}
                </div>
                <div className="capitalize text-slate-500">{user.role}</div>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
