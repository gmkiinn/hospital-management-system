import type { DoctorSession } from '../../types'
import { Button } from '../../components/ui'

// Small editor for a doctor's daily working sessions (label + start/end times).
// <input type="time"> yields "HH:MM", which matches the backend's format.
export function SessionsEditor({
  value,
  onChange,
}: {
  value: DoctorSession[]
  onChange: (sessions: DoctorSession[]) => void
}) {
  function update(index: number, patch: Partial<DoctorSession>) {
    onChange(value.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }
  function add() {
    onChange([...value, { label: '', start: '10:00', end: '13:00' }])
  }
  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium text-slate-700">
        Working sessions
      </span>
      {value.length === 0 && (
        <p className="text-xs text-slate-400">
          No sessions yet — add one so the receptionist can book slots.
        </p>
      )}
      {value.map((s, i) => (
        <div key={i} className="flex items-end gap-2">
          <label className="flex-1">
            <span className="mb-1 block text-xs text-slate-500">Label</span>
            <input
              value={s.label}
              onChange={(e) => update(i, { label: e.target.value })}
              placeholder="Morning"
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-indigo-500"
            />
          </label>
          <label>
            <span className="mb-1 block text-xs text-slate-500">Start</span>
            <input
              type="time"
              value={s.start}
              onChange={(e) => update(i, { start: e.target.value })}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-indigo-500"
            />
          </label>
          <label>
            <span className="mb-1 block text-xs text-slate-500">End</span>
            <input
              type="time"
              value={s.end}
              onChange={(e) => update(i, { end: e.target.value })}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-indigo-500"
            />
          </label>
          <button
            type="button"
            onClick={() => remove(i)}
            className="pb-2 text-slate-400 hover:text-red-600"
            aria-label="Remove session"
          >
            ✕
          </button>
        </div>
      ))}
      <Button type="button" variant="secondary" onClick={add}>
        + Add session
      </Button>
    </div>
  )
}
