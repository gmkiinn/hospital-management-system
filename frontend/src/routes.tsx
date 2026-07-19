import { createBrowserRouter } from 'react-router-dom'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { AppLayout } from './components/AppLayout'
import { ErrorPage } from './components/ErrorPage'
import { LoginPage } from './features/auth/LoginPage'
import { DashboardPage } from './features/DashboardPage'
import { NotFoundPage } from './features/NotFoundPage'
import { PatientsPage } from './features/frontdesk/PatientsPage'
import { SetupPage } from './features/frontdesk/SetupPage'
import { BookingPage } from './features/frontdesk/BookingPage'
import { QueuePage } from './features/frontdesk/QueuePage'
import { ConsultationsHome } from './features/consultation/ConsultationsHome'
import { ConsultationRoomPage } from './features/consultation/ConsultationRoomPage'

export const router = createBrowserRouter([
  {
    // Pathless layout route: catches render errors across the whole app.
    errorElement: <ErrorPage />,
    children: [
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
                  { path: '/appointments', element: <BookingPage /> },
                  { path: '/queue', element: <QueuePage /> },
                ],
              },
              {
                element: <ProtectedRoute roles={['admin']} />,
                children: [
                  { path: '/patients', element: <PatientsPage /> },
                  { path: '/setup', element: <SetupPage /> },
                ],
              },
              {
                element: <ProtectedRoute roles={['doctor', 'admin']} />,
                children: [
                  {
                    path: '/consultations',
                    element: <ConsultationsHome />,
                  },
                  {
                    path: '/consultations/:id',
                    element: <ConsultationRoomPage />,
                  },
                ],
              },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
