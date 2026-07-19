import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { searchMedicines } from '../../api/medicines'

export function MedicineTypeahead({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value)
  const [debounced, setDebounced] = useState(value)

  // Debounce keystrokes before hitting the catalog endpoint.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 200)
    return () => clearTimeout(t)
  }, [query])

  const { data: matches = [] } = useQuery({
    queryKey: ['medicines', debounced],
    queryFn: () => searchMedicines(debounced),
    enabled: open,
  })

  function pick(name: string) {
    setQuery(name)
    onChange(name)
    setOpen(false)
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            onChange(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          placeholder="Search medicine…"
          className="w-full rounded-md border border-slate-300 py-2 pl-8 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      {open && matches.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-md border border-slate-200 bg-white text-sm shadow-lg">
          {matches.map((m) => (
            <li key={m}>
              {/* onMouseDown fires before the input's blur, so the pick registers */}
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  pick(m)
                }}
                className="block w-full px-3 py-1.5 text-left hover:bg-indigo-50"
              >
                {m}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
