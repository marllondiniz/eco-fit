'use client'

import { useState, useEffect } from 'react'

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
  streak: number
  hasActivityToday: boolean
}

export function ClienteGreeting({ firstName, streak, hasActivityToday }: ClienteGreetingProps) {
  const [greeting, setGreeting] = useState('Boa noite')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) setGreeting(getGreeting())
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
