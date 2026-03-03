'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Activity, CheckCircle2, Circle, ChevronDown, ChevronUp, Calendar } from 'lucide-react'
import { formatDate, getLocalDateString } from '@/lib/date-utils'
import { SolicitarCardioButton } from '@/components/SolicitarCardioButton'

export default function ClienteCardioPage() {
  const [cardioPlan, setCardioPlan] = useState<any | null>(null)
  const [sessionToday, setSessionToday] = useState<any | null>(null)
  const [history, setHistory] = useState<any[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [pendingCardioRequest, setPendingCardioRequest] = useState(false)

  const today = getLocalDateString()

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const todayStr = getLocalDateString()

    const [
      { data: planData },
      { data: sessionData },
      { data: sessionsData },
      { data: cardioRequestData },
    ] = await Promise.all([
      supabase
        .from('cardio_plans')
        .select('*, profiles!cardio_plans_professional_id_fkey(full_name)')
        .eq('client_id', user.id)
        .eq('status', 'sent')
        .or(`end_date.is.null,end_date.gte.${todayStr}`)
        .order('sent_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('cardio_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', todayStr)
        .maybeSingle(),
      supabase
        .from('cardio_sessions')
        .select('*, cardio_plans!inner(prescription)')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(30),
      supabase
        .from('plan_requests')
        .select('id')
        .eq('client_id', user.id)
        .in('status', ['pending', 'in_progress'])
        .in('type', ['cardio', 'both'])
        .limit(1)
        .maybeSingle(),
    ])

    setCardioPlan(planData ?? null)
    setSessionToday(sessionData ?? null)
    setHistory((sessionsData ?? []) as any[])
    setPendingCardioRequest(!!cardioRequestData)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') loadData() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [loadData])

  useEffect(() => {
    document.title = 'LB.FIT — Cardio'
    return () => { document.title = 'LB.FIT' }
  }, [])

  async function markComplete(complete: boolean) {
    if (!userId || !cardioPlan) return
    setSaving(true)
    try {
      const { error } = await supabase.from('cardio_sessions').upsert(
        {
          user_id: userId,
          cardio_plan_id: cardioPlan.id,
          date: today,
          is_complete: complete,
        },
        { onConflict: 'user_id,cardio_plan_id,date' }
      )
      if (!error) {
        setSessionToday({ ...sessionToday, is_complete: complete })
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  // Sem plano ativo
  if (!cardioPlan) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Activity className="w-7 h-7 text-primary" />
            Cardio
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Atividade aeróbica prescrita pelo seu profissional.
          </p>
        </div>

        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <Activity className="w-12 h-12 text-muted-foreground/50 mx-auto" />
            <div>
              <p className="text-muted-foreground font-medium">Nenhuma prescrição de cardio ativa.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Solicite um plano de cardio ao seu profissional.
              </p>
            </div>
            {pendingCardioRequest ? (
              <div className="flex justify-center">
                <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700">
                  Solicitação em andamento
                </Badge>
              </div>
            ) : (
              <SolicitarCardioButton onSuccess={loadData} />
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  const isComplete = sessionToday?.is_complete ?? false

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Activity className="w-7 h-7 text-primary" />
          Cardio
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Atividade aeróbica prescrita pelo seu profissional.
        </p>
      </div>

      {/* Prescrição de hoje */}
      <Card className={isComplete
        ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20'
        : ''
      }>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Prescrição de hoje</CardTitle>
            {cardioPlan.profiles?.full_name && (
              <span className="text-xs text-muted-foreground">Por {cardioPlan.profiles.full_name}</span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl bg-muted/60 dark:bg-muted/30 p-4 whitespace-pre-wrap text-sm text-foreground">
            {cardioPlan.prescription || 'Sem descrição.'}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => markComplete(true)}
              disabled={saving}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-60 ${
                isComplete
                  ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border-2 border-emerald-200 dark:border-emerald-800'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              Concluído
            </button>
            <button
              onClick={() => markComplete(false)}
              disabled={saving}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-60 ${
                !isComplete && sessionToday
                  ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-2 border-red-200 dark:border-red-800'
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground'
              }`}
            >
              <Circle className="w-4 h-4" />
              Não realizado
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Histórico */}
      <Card>
        <CardHeader className="pb-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center justify-between w-full text-left"
          >
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Histórico por data
            </CardTitle>
            {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </CardHeader>
        {showHistory && (
          <CardContent>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum registro ainda.</p>
            ) : (
              <div className="space-y-2">
                {history.map((s: any) => {
                  const d = new Date(s.date + 'T12:00:00')
                  const prescription = s.cardio_plans?.prescription ?? '—'
                  return (
                    <div
                      key={s.id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-border"
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        s.is_complete ? 'bg-emerald-100 dark:bg-emerald-900/60' : 'bg-muted'
                      }`}>
                        {s.is_complete
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          : <Circle className="w-4 h-4 text-muted-foreground" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {prescription}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                      <Badge
                        variant={s.is_complete ? 'default' : 'secondary'}
                        className={s.is_complete
                          ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                          : ''
                        }
                      >
                        {s.is_complete ? 'Concluído' : 'Não realizado'}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  )
}
