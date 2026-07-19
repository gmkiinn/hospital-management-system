import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { TokenResponse } from '../types'

const ACCESS_KEY = 'hms_access_token'
const REFRESH_KEY = 'hms_refresh_token'

export const tokenStore = {
  get access() {
    return localStorage.getItem(ACCESS_KEY)
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY)
  },
  set({ access_token, refresh_token }: TokenResponse) {
    localStorage.setItem(ACCESS_KEY, access_token)
    localStorage.setItem(REFRESH_KEY, refresh_token)
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

export const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

// Attach the access token to every request.
api.interceptors.request.use((config) => {
  const token = tokenStore.access
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// On 401, try a one-time refresh, then replay the original request.
let refreshing: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const refresh = tokenStore.refresh
  if (!refresh) return null
  try {
    // Bare axios (not `api`) to avoid recursive interceptor loops.
    const { data } = await axios.post<TokenResponse>('/api/v1/auth/refresh', {
      refresh_token: refresh,
    })
    tokenStore.set(data)
    return data.access_token
  } catch {
    tokenStore.clear()
    return null
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean
    }
    const isAuthCall = original?.url?.includes('/auth/')
    if (error.response?.status === 401 && !original._retry && !isAuthCall) {
      original._retry = true
      refreshing ??= refreshAccessToken()
      const newToken = await refreshing
      refreshing = null
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      }
      // Refresh failed — hard reset to login.
      tokenStore.clear()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)
