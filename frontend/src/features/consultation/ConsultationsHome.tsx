import { useAuth } from '../../auth/useAuth'
import { AdminConsultationsPage } from './AdminConsultationsPage'
import { DoctorConsultationsPage } from './DoctorConsultationsPage'

// Admins get the oversight view (any doctor, any date); doctors get their own
// live worklist. Same route, branched by role.
export function ConsultationsHome() {
  const { user } = useAuth()
  return user?.role === 'admin' ? (
    <AdminConsultationsPage />
  ) : (
    <DoctorConsultationsPage />
  )
}
