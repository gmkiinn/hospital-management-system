import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { AppLayout } from './components/AppLayout'
import { LoginPage } from './features/auth/LoginPage'
import { DashboardPage } from './features/DashboardPage'
import { PatientsPage } from './features/frontdesk/PatientsPage'
import { SetupPage } from './features/frontdesk/SetupPage'
import { BookingPage } from './features/frontdesk/BookingPage'
import { QueuePage } from './features/frontdesk/QueuePage'
import { DoctorConsultationsPage } from './features/consultation/DoctorConsultationsPage'
import { ConsultationRoomPage } from './features/consultation/ConsultationRoomPage'

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
          {
            element: <ProtectedRoute roles={['doctor', 'admin']} />,
            children: [
              { path: '/consultations', element: <DoctorConsultationsPage /> },
              { path: '/consultations/:id', element: <ConsultationRoomPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
