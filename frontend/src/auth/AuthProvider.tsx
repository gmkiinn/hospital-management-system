import { useEffect, useState, type ReactNode } from 'react'
import { api, tokenStore } from '../lib/api'
import type { TokenResponse, User } from '../types'
import { AuthContext } from './context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  // Only "loading" if we have a token to validate on boot.
  const [loading, setLoading] = useState(() => Boolean(tokenStore.access))

  // On boot: if we have a token, hydrate the current user from /auth/me.
  useEffect(() => {
    if (!tokenStore.access) return
    api
      .get<User>('/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false))
  }, [])

  async function login(email: string, password: string) {
    const { data } = await api.post<TokenResponse>('/auth/login', {
      email,
      password,
    })
    tokenStore.set(data)
    const me = await api.get<User>('/auth/me')
    setUser(me.data)
  }

  function logout() {
    tokenStore.clear()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
