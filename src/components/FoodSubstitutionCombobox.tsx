'use client'

import { useState, useRef, useEffect } from 'react'
import { Search } from 'lucide-react'
import { searchTacoFoods, calcEquivalentQuantity, type TacoFood } from '@/lib/taco-foods'

export interface FoodSubstitution {
  name: string
  quantity: string
  unit: string
}

interface Props {
  originalCalories: number
  originalUnit: string
  onSelect: (sub: FoodSubstitution) => void
  placeholder?: string
  className?: string
}

export function FoodSubstitutionCombobox({
  originalCalories,
  originalUnit,
  onSelect,
  placeholder = 'Buscar alimento na TACO…',
  className = '',
}: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = searchTacoFoods(query, 12)

  function handleSelect(food: TacoFood) {
    const { quantity, unit } = calcEquivalentQuantity(
      originalCalories,
      food,
      originalUnit === 'g' || originalUnit === 'ml' ? originalUnit : 'g'
    )
    const sub: FoodSubstitution = {
      name: food.name,
      quantity,
      unit,
    }
    onSelect(sub)
    setQuery('')
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
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full h-9 pl-8 pr-3 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
        />
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filtered.map((food, i) => {
            const { quantity, unit } = calcEquivalentQuantity(
              originalCalories,
              food,
              originalUnit === 'g' || originalUnit === 'ml' ? originalUnit : 'g'
            )
            return (
              <button
                key={i}
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => handleSelect(food)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex flex-col gap-0.5 transition-colors"
              >
                <span className="text-foreground font-medium">{food.name}</span>
                <span className="text-xs text-muted-foreground flex items-center gap-2">
                  <span className="bg-muted px-1.5 py-0.5 rounded">{food.category}</span>
                  <span>
                    ~{quantity} {unit} (equiv. {originalCalories} kcal)
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
