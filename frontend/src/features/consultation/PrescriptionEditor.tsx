import { useState } from 'react'
import { CheckCircle2, Circle, Plus, Trash2 } from 'lucide-react'
import { Button } from '../../components/ui'
import { cn } from '../../lib/utils'
import { MedicineTypeahead } from './MedicineTypeahead'
import { type Medication, type MealTiming, newMedication } from './prescription'

export interface PrescriptionPayload {
  summary: string
  medications: Medication[]
}

const TIMINGS: Array<{ key: keyof Medication; label: string }> = [
  { key: 'morning', label: 'M' },
  { key: 'afternoon', label: 'A' },
  { key: 'evening', label: 'E' },
  { key: 'night', label: 'N' },
]

export function PrescriptionEditor({
  initialSummary,
  initialMedications,
  saving,
  reviewed,
  onSave,
}: {
  initialSummary: string
  initialMedications: Medication[]
  saving: boolean
  reviewed: boolean
  onSave: (payload: PrescriptionPayload) => void
}) {
  const [summary, setSummary] = useState(initialSummary)
  const [meds, setMeds] = useState<Medication[]>(initialMedications)

  function patchMed(id: string, patch: Partial<Medication>) {
    setMeds((list) => list.map((m) => (m.id === id ? { ...m, ...patch } : m)))
  }
  function removeMed(id: string) {
    setMeds((list) => list.filter((m) => m.id !== id))
  }

  return (
    <div className="space-y-5">
      {/* Summary */}
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">
          Summary
        </span>
        <textarea
          rows={4}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </label>

      {/* Medications */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">
            Medications
          </span>
          <Button
            variant="secondary"
            onClick={() => setMeds((l) => [...l, newMedication()])}
          >
            <Plus className="h-4 w-4" /> Add medicine
          </Button>
        </div>

        {meds.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-300 p-4 text-center text-sm text-slate-400">
            No medicines. Click “Add medicine” to prescribe.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-y-2 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-500">
                  <th className="px-2 font-medium">Medicine</th>
                  <th className="px-2 font-medium">Timing</th>
                  <th className="px-2 font-medium">Food</th>
                  <th className="px-2 font-medium">Duration</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {meds.map((m) => (
                  <tr key={m.id} className="align-top">
                    <td className="w-64 px-2">
                      <MedicineTypeahead
                        value={m.name}
                        onChange={(name) => patchMed(m.id, { name })}
                      />
                    </td>
                    <td className="px-2">
                      <div className="flex gap-1 pt-1">
                        {TIMINGS.map((t) => {
                          const active = m[t.key] as boolean
                          return (
                            <button
                              key={t.key}
                              type="button"
                              title={t.key}
                              onClick={() =>
                                patchMed(m.id, { [t.key]: !active })
                              }
                              className={cn(
                                'h-8 w-8 rounded-md border text-xs font-semibold transition',
                                active
                                  ? 'border-indigo-600 bg-indigo-600 text-white'
                                  : 'border-slate-300 text-slate-500 hover:bg-slate-50',
                              )}
                            >
                              {t.label}
                            </button>
                          )
                        })}
                      </div>
                    </td>
                    <td className="px-2">
                      <select
                        value={m.meal}
                        onChange={(e) =>
                          patchMed(m.id, { meal: e.target.value as MealTiming })
                        }
                        className="mt-1 rounded-md border border-slate-300 px-2 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="before">Before food</option>
                        <option value="after">After food</option>
                      </select>
                    </td>
                    <td className="px-2">
                      <input
                        value={m.duration}
                        onChange={(e) =>
                          patchMed(m.id, { duration: e.target.value })
                        }
                        placeholder="e.g. 5 days"
                        className="mt-1 w-28 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-1 pt-2">
                      <button
                        type="button"
                        onClick={() => removeMed(m.id)}
                        title="Remove"
                        className="text-slate-400 transition hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-1 text-xs text-slate-400">
          M · Morning, A · Afternoon, E · Evening, N · Night
        </p>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <Button
          onClick={() => onSave({ summary, medications: meds })}
          disabled={saving}
        >
          <CheckCircle2 className="h-4 w-4" />
          {saving ? 'Saving…' : 'Approve & save note'}
        </Button>
        {reviewed && (
          <span className="flex items-center gap-1 text-sm text-green-700">
            <Circle className="h-3 w-3 fill-green-600 text-green-600" /> Saved
          </span>
        )}
      </div>
    </div>
  )
}
