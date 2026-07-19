import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LogOut, Menu, Stethoscope, X } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { cn } from '../lib/utils'
import { navFor } from '../config/nav'

export function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  function handleLogout() {
    setMenuOpen(false)
    logout()
    navigate('/login', { replace: true })
  }

  const links = user ? navFor(user.role) : []

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="relative border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <Link
            to="/"
            onClick={() => setMenuOpen(false)}
            className="flex shrink-0 items-center gap-2 font-semibold text-slate-800 transition hover:text-indigo-600"
            aria-label="Go to dashboard"
          >
            <Stethoscope className="h-5 w-5 text-indigo-600" />
            <span>AI HMS</span>
          </Link>

          {/* Inline nav — tablet and up */}
          <nav className="no-scrollbar hidden flex-1 items-center gap-1 overflow-x-auto whitespace-nowrap md:flex">
            {links.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition',
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

          {/* User + logout — tablet and up */}
          <div className="hidden shrink-0 items-center gap-4 md:flex">
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

          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="ml-auto inline-flex items-center rounded-md border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 md:hidden"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <div className="absolute inset-x-0 top-14 z-20 border-t border-slate-200 bg-white shadow-sm md:hidden">
            <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
              {links.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'rounded-md px-3 py-2 text-sm font-medium transition',
                      isActive
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-600 hover:bg-slate-100',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              {user && (
                <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-3">
                  <div className="text-sm leading-tight">
                    <div className="font-medium text-slate-800">
                      {user.full_name}
                    </div>
                    <div className="capitalize text-slate-500">{user.role}</div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              )}
            </nav>
          </div>
        )}
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  )
}
