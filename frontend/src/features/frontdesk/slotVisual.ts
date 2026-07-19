import type { SlotStatus } from '../../types'

type BadgeTone = 'slate' | 'blue' | 'amber' | 'indigo' | 'green' | 'red'

interface SlotVisual {
  cell: string // classes for the slot button
  badge: BadgeTone
  label: string
}

// Color codes for every slot state on the receptionist board.
export const SLOT_VISUALS: Record<SlotStatus, SlotVisual> = {
  available: {
    cell: 'border-slate-200 bg-white text-slate-600 hover:border-indigo-400 hover:bg-indigo-50',
    badge: 'slate',
    label: 'Available',
  },
  booked: {
    cell: 'border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100',
    badge: 'blue',
    label: 'Booked',
  },
  arrived: {
    cell: 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100',
    badge: 'amber',
    label: 'Arrived',
  },
  in_consultation: {
    cell: 'border-indigo-300 bg-indigo-50 text-indigo-800 hover:bg-indigo-100',
    badge: 'indigo',
    label: 'In consultation',
  },
  completed: {
    cell: 'border-green-300 bg-green-50 text-green-800 hover:bg-green-100',
    badge: 'green',
    label: 'Completed',
  },
  cancelled: {
    cell: 'border-red-200 bg-red-50 text-red-600 line-through hover:bg-red-100',
    badge: 'red',
    label: 'Cancelled',
  },
  no_show: {
    cell: 'border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200',
    badge: 'slate',
    label: 'No show',
  },
}

export const SLOT_LEGEND: SlotStatus[] = [
  'available',
  'booked',
  'arrived',
  'in_consultation',
  'completed',
]
