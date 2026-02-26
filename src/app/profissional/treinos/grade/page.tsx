'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChevronLeft, Calendar, Plus, Pencil, Dumbbell, Send, Loader2, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { getLocalDateString, getLocalWeekStart, getLocalDayOfWeek, getWeekDates, getDaysInMonth } from '@/lib/date-utils'

const DIAS_SEMANA = [
  { value: 'mon', label: 'Segunda' },
  { value: 'tue', label: 'Terça' },
  { value: 'wed', label: 'Quarta' },
  { value: 'thu', label: 'Quinta' },
  { value: 'fri', label: 'Sexta' },
  { value: 'sat', label: 'Sábado' },
  { value: 'sun', label: 'Domingo' },
] as const

const DEFAULT_SCHEDULE: { day_of_week: string; workout_label: string | null }[] = [
  { day_of_week: 'mon', workout_label: 'A' },
  { day_of_week: 'tue', workout_label: 'B' },
  { day_of_week: 'wed', workout_label: 'C' },
  { day_of_week: 'thu', workout_label: 'A' },
  { day_of_week: 'fri', workout_label: 'B' },
  { day_of_week: 'sat', workout_label: 'C' },
  { day_of_week: 'sun', workout_label: null },
]

interface Cliente {
  id: string
  full_name: string | null
  email: string | null
}

interface ScheduleRow {
  client_id: string
  day_of_week: string
  workout_label: string | null
}

export default function GradeSemanalPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [clienteId, setClienteId] = useState<string>('')
  const [schedule, setSchedule] = useState<ScheduleRow[]>([])
  const [workoutsByLabel, setWorkoutsByLabel] = useState<Record<string, { id: string; name: string; status: string }>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [viewPeriod, setViewPeriod] = useState<'1week' | '4weeks' | 'month'>('1week')
  const [sendingPlan, setSendingPlan] = useState(false)
  const [loadingIA, setLoadingIA] = useState(false)
  const [iaMessage, setIaMessage] = useState<string | null>(null)
  const [planDuration, setPlanDuration] = useState<'1' | '2' | '4' | '8' | 'custom'>('4')
  const [planStartDate, setPlanStartDate] = useState(getLocalDateString())
  const [planCustomEndDate, setPlanCustomEndDate] = useState('')

  const loadClientes = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'user')
      .order('full_name')
    setClientes((data as Cliente[]) ?? [])
  }, [])

  const loadScheduleAndWorkouts = useCallback(async (cid: string) => {
    if (!cid) {
      setSchedule([])
      setWorkoutsByLabel({})
      setLoading(false)
      return
    }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const [{ data: scheduleData }, { data: workoutsData }] = await Promise.all([
      supabase
        .from('client_workout_schedule')
        .select('client_id, day_of_week, workout_label')
        .eq('client_id', cid)
        .order('day_of_week'),
      supabase
        .from('workouts')
        .select('id, name, label, status')
        .eq('client_id', cid)
        .eq('professional_id', user.id)
        .in('label', ['A', 'B', 'C'])
        .order('label'),
    ])

    if (scheduleData && scheduleData.length === 7) {
      setSchedule(scheduleData as ScheduleRow[])
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const rows = DEFAULT_SCHEDULE.map(d => ({
        client_id: cid,
        day_of_week: d.day_of_week,
        workout_label: d.workout_label,
      }))
      await supabase.from('client_workout_schedule').upsert(rows, {
        onConflict: 'client_id,day_of_week',
      })
      setSchedule(rows)
    }

    const byLabel: Record<string, { id: string; name: string; status: string }> = {}
    for (const w of workoutsData ?? []) {
      if (w.label) byLabel[w.label] = { id: w.id, name: w.name, status: w.status }
    }
    setWorkoutsByLabel(byLabel)
    setLoading(false)
  }, [])

  useEffect(() => { loadClientes() }, [loadClientes])
  useEffect(() => {
    if (clienteId) loadScheduleAndWorkouts(clienteId)
    else { setSchedule([]); setWorkoutsByLabel({}); setLoading(false) }
  }, [clienteId, loadScheduleAndWorkouts])

  async function updateDay(dayOfWeek: string, workoutLabel: string | null) {
    if (!clienteId) return
    setSaving(dayOfWeek)
    const payload = { client_id: clienteId, day_of_week: dayOfWeek, workout_label: workoutLabel }
    await supabase.from('client_workout_schedule').upsert(payload, { onConflict: 'client_id,day_of_week' })
    setSchedule(prev => prev.map(r => r.day_of_week === dayOfWeek ? { ...r, workout_label: workoutLabel } : r))
    setSaving(null)
  }

  const scheduleMap = schedule.reduce((acc, r) => {
    acc[r.day_of_week] = r.workout_label
    return acc
  }, {} as Record<string, string | null>)

  function getLabelForDate(dateStr: string): string | null {
    const day = getLocalDayOfWeek(new Date(dateStr + 'T12:00:00'))
    return scheduleMap[day] ?? null
  }

  const weekStart = getLocalWeekStart()
  const calendarDates: string[] =
    viewPeriod === '1week'
      ? getWeekDates(weekStart)
      : viewPeriod === '4weeks'
        ? Array.from({ length: 28 }, (_, i) => {
            const d = new Date(weekStart + 'T12:00:00')
            d.setDate(d.getDate() + i)
            return getLocalDateString(d)
          })
        : (() => {
            const now = new Date()
            const year = now.getFullYear()
            const month = now.getMonth()
            const days = getDaysInMonth(year, month + 1)
            return Array.from({ length: days }, (_, i) =>
              getLocalDateString(new Date(year, month, i + 1))
            )
          })()

  function computedEndDate(): string {
    const start = new Date(planStartDate + 'T12:00:00')
    if (planDuration === 'custom') return planCustomEndDate
    const weeks = parseInt(planDuration, 10)
    start.setDate(start.getDate() + weeks * 7 - 1)
    return getLocalDateString(start)
  }

  async function enviarPlanoCompleto() {
    if (!clienteId) return
    const endDate = computedEndDate()
    if (!endDate || endDate <= planStartDate) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setSendingPlan(true)

    const { data: list } = await supabase
      .from('workouts')
      .select('id')
      .eq('client_id', clienteId)
      .eq('professional_id', user.id)
      .in('label', ['A', 'B', 'C'])
    if (list?.length) {
      await supabase
        .from('workouts')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          start_date: planStartDate,
          end_date: endDate,
          duration_weeks: planDuration === 'custom' ? null : parseInt(planDuration, 10),
        })
        .in('id', list.map(w => w.id))
    }

    // Marcar solicitação pendente como concluída
    await supabase
      .from('plan_requests')
      .update({ status: 'completed' })
      .eq('client_id', clienteId)
      .eq('professional_id', user.id)
      .in('status', ['pending', 'in_progress'])

    await loadScheduleAndWorkouts(clienteId)
    setSendingPlan(false)
  }

  async function gerarSugestaoIA() {
    if (!clienteId) return
    setIaMessage(null)
    setLoadingIA(true)
    try {
      const res = await fetch('/api/ai/planejamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: clienteId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setIaMessage(data.error ?? 'Erro ao gerar sugestão.')
        return
      }
      for (const { day, label } of data.semana ?? []) {
        await updateDay(day, label)
      }
      setIaMessage(`Sugestão aplicada: ${data.tipo_divisao}. Revise a grade e envie quando aprovar.`)
    } finally {
      setLoadingIA(false)
    }
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/profissional/treinos">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground -ml-2">
            <ChevronLeft className="w-4 h-4" />
            Treinos
          </Button>
        </Link>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Calendar className="w-7 h-7 text-primary" />
          Grade semanal A/B/C
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Defina qual treino (A, B ou C) o cliente faz em cada dia. A estrutura se repete toda a semana.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={clienteId || 'none'} onValueChange={v => setClienteId(v === 'none' ? '' : v)}>
            <SelectTrigger className="max-w-sm">
              <SelectValue placeholder="Selecionar cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Selecionar cliente</SelectItem>
              {clientes.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.full_name ?? c.email ?? c.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {!clienteId && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Selecione um cliente para ver e editar a grade semanal.
          </CardContent>
        </Card>
      )}

      {clienteId && loading && (
        <div className="h-64 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      )}

      {clienteId && !loading && (
        <>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Semana tipo</CardTitle>
                  <p className="text-sm text-muted-foreground font-normal mt-0.5">
                    Altere o treino de cada dia. Descanso = nenhum treino nesse dia.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={gerarSugestaoIA}
                  disabled={loadingIA}
                >
                  {loadingIA ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Gerar sugestão com IA
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {iaMessage && (
                <p className="text-sm text-muted-foreground mb-4 px-1">{iaMessage}</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
                {DIAS_SEMANA.map(({ value, label }) => (
                  <div key={value} className="border rounded-xl p-4 space-y-2">
                    <p className="text-sm font-semibold text-foreground">{label}</p>
                    <Select
                      value={scheduleMap[value] ?? 'rest'}
                      onValueChange={v => updateDay(value, v === 'rest' ? null : v)}
                      disabled={!!saving}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rest">Descanso</SelectItem>
                        <SelectItem value="A">Treino A</SelectItem>
                        <SelectItem value="B">Treino B</SelectItem>
                        <SelectItem value="C">Treino C</SelectItem>
                      </SelectContent>
                    </Select>
                    {scheduleMap[value] && workoutsByLabel[scheduleMap[value]] && (
                      <p className="text-xs text-muted-foreground truncate" title={workoutsByLabel[scheduleMap[value]].name}>
                        {workoutsByLabel[scheduleMap[value]].name}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Dumbbell className="w-4 h-4" />
                Treinos A, B e C
              </CardTitle>
              <p className="text-sm text-muted-foreground font-normal">
                Crie ou edite o conteúdo de cada treino. Depois envie para o cliente.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-3 gap-4">
                {(['A', 'B', 'C'] as const).map(label => {
                  const w = workoutsByLabel[label]
                  return (
                    <div
                      key={label}
                      className="border rounded-xl p-4 flex flex-col gap-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">Treino {label}</span>
                        {w ? (
                          <Link href={`/profissional/treinos/${w.id}/editar`}>
                            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                              <Pencil className="w-3 h-3" />
                              Editar
                            </Button>
                          </Link>
                        ) : (
                          <Link href={`/profissional/treinos/novo?clientId=${clienteId}&label=${label}`}>
                            <Button size="sm" className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                              <Plus className="w-3 h-3" />
                              Criar
                            </Button>
                          </Link>
                        )}
                      </div>
                      {w ? (
                        <>
                          <p className="text-sm text-muted-foreground truncate">{w.name}</p>
                          {w.status !== 'sent' && (
                            <p className="text-xs text-amber-600 dark:text-amber-400">Rascunho / em revisão</p>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground">Ainda não criado</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Visualizar planejamento</CardTitle>
              <p className="text-sm text-muted-foreground font-normal">
                Veja como a semana tipo se repete no período escolhido. Edite a semana tipo acima para ajustar.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={viewPeriod} onValueChange={v => setViewPeriod(v as '1week' | '4weeks' | 'month')}>
                <SelectTrigger className="max-w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1week">1 semana</SelectItem>
                  <SelectItem value="4weeks">4 semanas</SelectItem>
                  <SelectItem value="month">Mês atual</SelectItem>
                </SelectContent>
              </Select>
              <div
                className={
                  viewPeriod === 'month'
                    ? 'grid grid-cols-7 gap-1 text-center'
                    : 'grid grid-cols-7 gap-2 text-center'
                }
              >
                {calendarDates.map(dateStr => {
                  const label = getLabelForDate(dateStr)
                  const dayNum = dateStr.split('-')[2]
                  const isToday = dateStr === getLocalDateString()
                  return (
                    <div
                      key={dateStr}
                      className={`rounded-lg border p-2 text-xs ${isToday ? 'ring-2 ring-primary bg-primary/5' : ''}`}
                    >
                      <div className="font-medium text-muted-foreground">{dayNum}</div>
                      <div className={label ? 'font-semibold text-foreground' : 'text-muted-foreground'}>
                        {label ?? '—'}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Send className="w-4 h-4" />
                Enviar plano ao cliente
              </CardTitle>
              <p className="text-sm text-muted-foreground font-normal">
                Define a duração, marca todos os treinos como enviados e notifica o cliente. O plano fica ativo até a data de término.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">Início do plano</Label>
                  <Input
                    type="date"
                    value={planStartDate}
                    onChange={e => setPlanStartDate(e.target.value)}
                    className="max-w-[200px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Duração</Label>
                  <Select value={planDuration} onValueChange={v => setPlanDuration(v as typeof planDuration)}>
                    <SelectTrigger className="max-w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 semana</SelectItem>
                      <SelectItem value="2">2 semanas</SelectItem>
                      <SelectItem value="4">4 semanas</SelectItem>
                      <SelectItem value="8">8 semanas</SelectItem>
                      <SelectItem value="custom">Data personalizada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {planDuration === 'custom' && (
                <div className="space-y-1.5">
                  <Label className="text-sm">Data de término</Label>
                  <Input
                    type="date"
                    value={planCustomEndDate}
                    onChange={e => setPlanCustomEndDate(e.target.value)}
                    min={planStartDate}
                    className="max-w-[200px]"
                  />
                </div>
              )}

              {planDuration !== 'custom' && planStartDate && (
                <p className="text-xs text-muted-foreground">
                  O plano ficará ativo de <span className="font-medium text-foreground">{planStartDate}</span> até <span className="font-medium text-foreground">{computedEndDate()}</span>.
                </p>
              )}

              <Button
                onClick={enviarPlanoCompleto}
                disabled={
                  sendingPlan ||
                  Object.keys(workoutsByLabel).length === 0 ||
                  (planDuration === 'custom' && !planCustomEndDate)
                }
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {sendingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {sendingPlan ? 'Enviando…' : 'Confirmar e enviar plano'}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
