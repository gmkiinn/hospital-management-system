import type { AppointmentStatus } from '../../types'

const tones: Record<
  AppointmentStatus,
  'slate' | 'blue' | 'amber' | 'indigo' | 'green' | 'red'
> = {
  booked: 'blue',
  arrived: 'amber',
  in_consultation: 'indigo',
  completed: 'green',
  cancelled: 'red',
  no_show: 'slate',
}

export function statusTone(status: AppointmentStatus) {
  return tones[status]
}
