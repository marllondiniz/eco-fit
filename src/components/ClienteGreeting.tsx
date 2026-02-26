'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getLocalDateString } from '@/lib/date-utils'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function getMotivation(streak: number, hasActivityToday: boolean) {
  if (streak >= 7) return `Você está imparável! ${streak} dias seguidos!`
  if (streak >= 3) return `${streak} dias seguidos — continue assim!`
  if (hasActivityToday) return 'Ótimo trabalho hoje! Continue evoluindo.'
  return 'Vamos continuar sua evolução hoje?'
}

interface ClienteGreetingProps {
  firstName: string
}

export function ClienteGreeting({ firstName }: ClienteGreetingProps) {
  const [greeting, setGreeting] = useState('Boa noite')
  const [mounted, setMounted] = useState(false)
  const [streak, setStreak] = useState(0)
  const [hasActivityToday, setHasActivityToday] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) setGreeting(getGreeting())
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
    <div>
      <p className="text-sm text-muted-foreground font-medium">{greeting},</p>
      <h2 className="text-2xl font-bold text-foreground">{firstName}</h2>
      <p className="text-muted-foreground mt-1 text-sm">{motivation}</p>
    </div>
  )
}
