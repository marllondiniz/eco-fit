'use client'

import { useState, useRef, useEffect } from 'react'
import { EXERCISE_LIST } from '@/lib/exercises-list'
import { Search } from 'lucide-react'

interface Props {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  className?: string
}

export function ExerciseCombobox({
  value,
  onChange,
  placeholder = 'Buscar exercício…',
  className = '',
}: Props) {
  const [query, setQuery]   = useState(value)
  const [open, setOpen]     = useState(false)
  const containerRef        = useRef<HTMLDivElement>(null)

  // Sync query when value changes externally
  useEffect(() => { setQuery(value) }, [value])

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = query.trim().length >= 2
    ? EXERCISE_LIST.filter(e =>
        e.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 10)
    : []

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <input
          value={query}
          onChange={e => {
            setQuery(e.target.value)
            onChange(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full h-9 pl-8 pr-3 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
        />
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filtered.map((ex, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={e => e.preventDefault()} // keep focus on input
              onClick={() => {
                onChange(ex.name)
                setQuery(ex.name)
                setOpen(false)
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center justify-between gap-3 transition-colors"
            >
              <span className="text-foreground">{ex.name}</span>
              <span className="text-xs text-muted-foreground flex-shrink-0 bg-muted px-1.5 py-0.5 rounded">
                {ex.group}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
