'use client'

import { useState } from 'react'
import { Dumbbell, Loader2, CheckCircle2 } from 'lucide-react'

interface Props {
  label?: string
}

export function SolicitarTreinoButton({ label = 'Solicitar plano de treino' }: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [msg, setMsg] = useState<string | null>(null)

  async function solicitar() {
    setState('loading')
    setMsg(null)
    const res = await fetch('/api/cliente/solicitar-plano', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'workout' }),
    })
    const data = await res.json()
    if (!res.ok) {
      setMsg(data.error ?? 'Erro ao solicitar treino.')
      setState('error')
    } else {
      setMsg('Solicitação enviada! Aguarde seu personal criar o plano.')
      setState('done')
    }
  }

  if (state === 'done') {
    return (
      <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 rounded-xl px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
        {msg}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <button
        onClick={solicitar}
        disabled={state === 'loading'}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-opacity disabled:opacity-60"
      >
        {state === 'loading' ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Enviando solicitação…</>
        ) : (
          <><Dumbbell className="w-4 h-4" /> {label}</>
        )}
      </button>
      {state === 'error' && msg && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border border-red-100 dark:border-red-800 rounded-xl px-4 py-2.5">
          {msg}
        </p>
      )}
    </div>
  )
}
