import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { AppLayout } from './components/AppLayout'
import { LoginPage } from './features/auth/LoginPage'
import { DashboardPage } from './features/DashboardPage'
import { PatientsPage } from './features/frontdesk/PatientsPage'
import { SetupPage } from './features/frontdesk/SetupPage'
import { BookingPage } from './features/frontdesk/BookingPage'
import { QueuePage } from './features/frontdesk/QueuePage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          {
            element: <ProtectedRoute roles={['admin', 'receptionist']} />,
            children: [
              { path: '/patients', element: <PatientsPage /> },
              { path: '/appointments', element: <BookingPage /> },
              { path: '/queue', element: <QueuePage /> },
            ],
          },
          {
            element: <ProtectedRoute roles={['admin']} />,
            children: [{ path: '/setup', element: <SetupPage /> }],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
