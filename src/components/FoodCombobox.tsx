'use client'

import { useState, useRef, useEffect } from 'react'
import { Search } from 'lucide-react'
import { searchTacoFoods, type TacoFood } from '@/lib/taco-foods'

interface Props {
  value: string
  onChange: (name: string) => void
  onSelectFood?: (food: TacoFood) => void
  placeholder?: string
  className?: string
}

/**
 * Combobox para seleção de alimentos da base TACO no campo principal de alimentos.
 * Mesma lista usada nas substituições.
 */
export function FoodCombobox({
  value,
  onChange,
  onSelectFood,
  placeholder = 'Buscar alimento (Base TACO)…',
  className = '',
}: Props) {
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setQuery(value)
  }, [value])

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
    ? searchTacoFoods(query, 12)
    : []

  function handleSelect(food: TacoFood) {
    onChange(food.name)
    setQuery(food.name)
    onSelectFood?.(food)
    setOpen(false)
  }

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
          {filtered.map((food, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => handleSelect(food)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center justify-between gap-3 transition-colors"
            >
              <span className="text-foreground font-medium">{food.name}</span>
              <span className="text-xs text-muted-foreground flex-shrink-0 bg-muted px-1.5 py-0.5 rounded">
                {food.category} · {Math.round(food.energy_kcal)} kcal/100g
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
