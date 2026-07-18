import { Outlet, useNavigate } from 'react-router-dom'
import { LogOut, Stethoscope } from 'lucide-react'
import { useAuth } from '../auth/useAuth'

export function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <Stethoscope className="h-5 w-5 text-indigo-600" />
            <span>HMS</span>
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
