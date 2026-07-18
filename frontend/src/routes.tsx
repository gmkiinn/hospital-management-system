import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { AppLayout } from './components/AppLayout'
import { LoginPage } from './features/auth/LoginPage'
import { DashboardPage } from './features/DashboardPage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [{ index: true, path: '/', element: <DashboardPage /> }],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
