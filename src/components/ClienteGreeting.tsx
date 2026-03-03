'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getLocalDateString } from '@/lib/date-utils'
import { Flame } from 'lucide-react'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function getMotivation(streak: number, hasActivityToday: boolean) {
  if (streak >= 7) return `${streak} dias seguidos — você está imparável!`
  if (streak >= 3) return `${streak} dias seguidos, continue assim!`
  if (hasActivityToday) return 'Ótimo trabalho hoje!'
  return 'Vamos evoluir hoje?'
}

function getDayLabel() {
  return new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
}

interface ClienteGreetingProps {
  firstName: string
}

export function ClienteGreeting({ firstName }: ClienteGreetingProps) {
  const [greeting, setGreeting] = useState('Boa noite')
  const [dayLabel, setDayLabel] = useState('')
  const [mounted, setMounted] = useState(false)
  const [streak, setStreak] = useState(0)
  const [hasActivityToday, setHasActivityToday] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      setGreeting(getGreeting())
      setDayLabel(getDayLabel())
    }
  }, [mounted])

  useEffect(() => {
    if (!mounted) return
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const today = getLocalDateString()
      const [{ data: gami }, { data: sessions }] = await Promise.all([
        supabase.from('user_gamification').select('streak_days').eq('user_id', user.id).maybeSingle(),
        supabase.from('workout_sessions').select('id').eq('user_id', user.id).eq('date', today),
      ])
      setStreak(gami?.streak_days ?? 0)
      setHasActivityToday((sessions?.length ?? 0) > 0)
    }
    load()
  }, [mounted])

  const motivation = getMotivation(streak, hasActivityToday)

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">{greeting}</p>
        <h2 className="text-2xl font-bold text-foreground leading-tight">{firstName}</h2>
        {dayLabel && (
          <p className="text-xs text-muted-foreground mt-0.5 capitalize">{dayLabel}</p>
        )}
      </div>

      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <p className="text-xs text-muted-foreground text-right">{motivation}</p>
        {streak > 0 && (
          <div className="flex items-center gap-1 bg-orange-50 dark:bg-orange-950/40 border border-orange-100 dark:border-orange-900/50 rounded-full px-2.5 py-1">
            <Flame className="w-3.5 h-3.5 text-orange-500" />
            <span className="text-xs font-bold text-orange-600 dark:text-orange-400">{streak}</span>
          </div>
        )}
      </div>
    </div>
  )
}
