import {
  Building2,
  CalendarDays,
  ListOrdered,
  Stethoscope,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { UserRole } from '../types'

export interface NavItem {
  to: string
  label: string
  roles: UserRole[]
  icon: LucideIcon
  description: string
}

export const NAV_ITEMS: NavItem[] = [
  {
    to: '/setup',
    label: 'Setup',
    roles: ['admin'],
    icon: Building2,
    description: 'Departments and doctors',
  },
  {
    to: '/patients',
    label: 'Patients',
    roles: ['admin', 'receptionist'],
    icon: Users,
    description: 'Register and search patients',
  },
  {
    to: '/appointments',
    label: 'Appointments',
    roles: ['admin', 'receptionist'],
    icon: CalendarDays,
    description: 'Book and track appointments',
  },
  {
    to: '/queue',
    label: 'Queue',
    roles: ['admin', 'receptionist'],
    icon: ListOrdered,
    description: 'Check patients in for their doctor',
  },
  {
    to: '/consultations',
    label: 'Consultations',
    roles: ['doctor', 'admin'],
    icon: Stethoscope,
    description: 'See your patients and start the AI scribe',
  },
]

export function navFor(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role))
}
