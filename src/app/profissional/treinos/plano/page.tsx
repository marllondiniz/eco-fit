'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, ChevronLeft, Send, Calendar, Dumbbell, User, Info, Sparkles, Loader2, ChevronsUpDown } from 'lucide-react'
import Link from 'next/link'
import { AnamnesePanel } from '@/components/AnamnesePanel'
import { ExerciseCombobox } from '@/components/ExerciseCombobox'

// ─── Constantes ───────────────────────────────────────────────────────────────

const DIAS = [
  { key: 'mon', label: 'Seg' },
  { key: 'tue', label: 'Ter' },
  { key: 'wed', label: 'Qua' },
  { key: 'thu', label: 'Qui' },
  { key: 'fri', label: 'Sex' },
  { key: 'sat', label: 'Sáb' },
  { key: 'sun', label: 'Dom' },
] as const

const DIVISION_LABELS: Record<string, string[]> = {
  'A/B':      ['A', 'B'],
  'A/B/C':    ['A', 'B', 'C'],
  'FullBody':  ['A'],
}

const DIVISION_DISPLAY: Record<string, string> = {
  'A/B':      'A/B — 2 treinos alternados',
  'A/B/C':    'A/B/C — 3 treinos rotativos',
  'FullBody':  'Full Body — 1 treino completo',
}

const DEFAULT_SCHEDULES: Record<string, Record<string, string | null>> = {
  'A/B':     { mon: 'A', tue: 'B', wed: null, thu: 'A', fri: 'B', sat: null, sun: null },
  'A/B/C':   { mon: 'A', tue: 'B', wed: 'C', thu: 'A', fri: 'B', sat: 'C', sun: null },
  'FullBody': { mon: 'A', tue: null, wed: 'A', thu: null, fri: 'A', sat: null, sun: null },
}

const LABEL_COLORS: Record<string, string> = {
  A: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  B: 'bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800',
  C: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Exercicio {
  id: string
  name: string
  sets: string
  reps: string
  rest_seconds: string
  notes: string
  alt_name: string   // exercício alternativo (opcional)
  alt_notes: string  // observação da alternativa
  showAlt: boolean   // controle UI
}

interface WorkoutData {
  label: string
  name: string
  methodology: string
  notes: string
  exercises: Exercicio[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function novoEx(): Exercicio {
  return { id: Math.random().toString(36).slice(2), name: '', sets: '', reps: '', rest_seconds: '', notes: '', alt_name: '', alt_notes: '', showAlt: false }
}

function novoWorkout(label: string): WorkoutData {
  return { label, name: `Treino ${label}`, methodology: '', notes: '', exercises: [novoEx()] }
}

function calcEndDate(startDate: string, weeks: number): string {
  const d = new Date(startDate + 'T12:00:00')
  d.setDate(d.getDate() + weeks * 7 - 1)
  return d.toISOString().slice(0, 10)
}

function formatBR(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Página ───────────────────────────────────────────────────────────────────

function PlanoForm() {
  const router = useRouter()
  const params = useSearchParams()
  const clienteId  = params?.get('clientId')  ?? ''
  const requestId  = params?.get('requestId') ?? ''

  const [clienteName, setClienteName] = useState('')
  const [loadingClient, setLoadingClient] = useState(true)
  const [sending, setSending] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [gerandoIA, setGerandoIA] = useState(false)
  const [erroIA, setErroIA] = useState<string | null>(null)

  // Config do plano
  const today = new Date().toISOString().slice(0, 10)
  const [startDate,     setStartDate]     = useState(today)
  const [durationWeeks, setDurationWeeks] = useState('4')
  const [divisionType,  setDivisionType]  = useState('A/B/C')

  // Grade semanal
  const [schedule, setSchedule] = useState<Record<string, string | null>>(DEFAULT_SCHEDULES['A/B/C'])

  // Treinos (um por label)
  const [workouts, setWorkouts] = useState<WorkoutData[]>([
    novoWorkout('A'), novoWorkout('B'), novoWorkout('C'),
  ])

  // Carregar nome do cliente
  useEffect(() => {
    if (!clienteId) { setLoadingClient(false); return }
    supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', clienteId)
      .maybeSingle()
      .then(({ data }) => {
        setClienteName(data?.full_name ?? data?.email ?? 'Cliente')
        setLoadingClient(false)
      })
  }, [clienteId])

  // ── Handlers ────────────────────────────────────────────────────────────────

  function changeDivision(div: string) {
    setDivisionType(div)
    setSchedule(DEFAULT_SCHEDULES[div] ?? {})
    const labels = DIVISION_LABELS[div] ?? ['A']
    setWorkouts(labels.map(l => workouts.find(w => w.label === l) ?? novoWorkout(l)))
  }

  function setDay(day: string, value: string | null) {
    setSchedule(prev => ({ ...prev, [day]: value }))
  }

  function updateWorkout(idx: number, field: keyof Pick<WorkoutData, 'name' | 'methodology' | 'notes'>, value: string) {
    setWorkouts(prev => prev.map((w, i) => i === idx ? { ...w, [field]: value } : w))
  }

  function addEx(wIdx: number) {
    setWorkouts(prev => prev.map((w, i) => i === wIdx ? { ...w, exercises: [...w.exercises, novoEx()] } : w))
  }

  function removeEx(wIdx: number, eIdx: number) {
    setWorkouts(prev => prev.map((w, i) => i === wIdx
      ? { ...w, exercises: w.exercises.filter((_, j) => j !== eIdx) }
      : w
    ))
  }

  function toggleAlt(wIdx: number, eIdx: number) {
    setWorkouts(prev => prev.map((w, i) => i !== wIdx ? w : {
      ...w,
      exercises: w.exercises.map((e, j) => j !== eIdx ? e : { ...e, showAlt: !e.showAlt }),
    }))
  }

  function updateEx(wIdx: number, eIdx: number, field: keyof Omit<Exercicio, 'id'>, value: string) {
    setWorkouts(prev => prev.map((w, i) => i !== wIdx ? w : {
      ...w,
      exercises: w.exercises.map((e, j) => j !== eIdx ? e : { ...e, [field]: value }),
    }))
  }

  // ── Geração por IA ───────────────────────────────────────────────────────────

  async function gerarComIA() {
    if (!clienteId) return
    setGerandoIA(true)
    setErroIA(null)

    // Buscar dados da anamnese para enriquecer o prompt
    const [{ data: profile }, { data: anamnese }] = await Promise.all([
      supabase
        .from('client_profiles')
        .select('goal, activity_level, training_experience, age, sex')
        .eq('user_id', clienteId)
        .maybeSingle(),
      supabase
        .from('client_anamnese')
        .select('injuries, diseases, training_location, weekly_availability, notes')
        .eq('user_id', clienteId)
        .maybeSingle(),
    ])

    const GOAL_PT: Record<string, string> = {
      weight_loss: 'Emagrecimento', muscle_gain: 'Ganho de massa',
      maintenance: 'Manutenção', health: 'Saúde geral',
      performance: 'Performance', rehabilitation: 'Reabilitação',
    }
    const LEVEL_PT: Record<string, string> = {
      sedentary: 'Sedentário', light: 'Iniciante', moderate: 'Intermediário',
      intense: 'Avançado', athlete: 'Atleta',
    }

    const restricoes = [anamnese?.injuries, anamnese?.diseases]
      .filter(Boolean).join('; ') || 'Nenhuma'

    try {
      const res = await fetch('/api/ai/plano-treino', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          divisao:         divisionType,
          clienteNome:     clienteName,
          objetivo:        GOAL_PT[profile?.goal ?? ''] ?? profile?.goal ?? '',
          nivel:           LEVEL_PT[profile?.activity_level ?? ''] ?? (anamnese as any)?.training_experience ?? '',
          restricoes,
          localTreino:     anamnese?.training_location ?? '',
          disponibilidade: anamnese?.weekly_availability ?? '',
          observacoes:     anamnese?.notes ?? '',
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setErroIA(data.error ?? 'Erro ao gerar com IA.')
        return
      }

      const aiWorkouts: { label: string; name: string; methodology: string; notes: string; exercises: { name: string; sets: number; reps: string; rest_seconds: number; notes: string }[] }[] = data.workouts ?? []

      if (!aiWorkouts.length) {
        setErroIA('A IA não retornou treinos. Tente novamente.')
        return
      }

      setWorkouts(aiWorkouts.map(w => ({
        label:       w.label,
        name:        w.name        || `Treino ${w.label}`,
        methodology: w.methodology || '',
        notes:       w.notes       || '',
        exercises:   (w.exercises ?? []).map(e => ({
          id:           Math.random().toString(36).slice(2),
          name:         e.name         || '',
          sets:         e.sets         ? String(e.sets)         : '',
          reps:         e.reps         ? String(e.reps)         : '',
          rest_seconds: e.rest_seconds ? String(e.rest_seconds) : '',
          notes:        e.notes        || '',
          alt_name:     '',
          alt_notes:    '',
          showAlt:      false,
        })),
      })))
    } catch {
      setErroIA('Erro de conexão com a IA. Verifique OPENAI_API_KEY no .env.local.')
    } finally {
      setGerandoIA(false)
    }
  }

  // ── Submit ───────────────────────────────────────────────────────────────────

  async function handleEnviar() {
    if (!clienteId) return setErro('Cliente não identificado.')
    const hasExercises = workouts.some(w => w.exercises.some(e => e.name.trim()))
    if (!hasExercises) return setErro('Adicione pelo menos um exercício antes de enviar.')

    setSending(true)
    setErro(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSending(false); return }

    const durNum  = parseInt(durationWeeks, 10)
    const endDate = calcEndDate(startDate, durNum)
    const now     = new Date().toISOString()

    try {
      // 1. Criar cada treino + exercícios
      for (const workout of workouts) {
        const { data: wRow, error: wErr } = await supabase
          .from('workouts')
          .insert({
            professional_id: user.id,
            client_id:       clienteId,
            name:            workout.name.trim() || `Treino ${workout.label}`,
            division:        divisionType,
            methodology:     workout.methodology.trim() || null,
            notes:           workout.notes.trim() || null,
            label:           workout.label,
            day_of_week:     null,
            status:          'sent',
            sent_at:         now,
            start_date:      startDate,
            end_date:        endDate,
            duration_weeks:  durNum,
          })
          .select('id')
          .single()

        if (wErr || !wRow) throw new Error(`Erro ao criar Treino ${workout.label}: ${wErr?.message}`)

        const exRows = workout.exercises
          .filter(e => e.name.trim())
          .map((e, idx) => ({
            workout_id:        wRow.id,
            division_label:    workout.label,
            name:              e.name.trim(),
            sets:              e.sets ? parseInt(e.sets, 10) : null,
            reps:              e.reps.trim() || null,
            rest_seconds:      e.rest_seconds ? parseInt(e.rest_seconds, 10) : null,
            notes:             e.notes.trim() || null,
            alternative_name:  e.alt_name.trim() || null,
            alternative_notes: e.alt_notes.trim() || null,
            order_index:       idx,
          }))

        if (exRows.length > 0) {
          const { error: exErr } = await supabase.from('workout_exercises').insert(exRows)
          if (exErr) throw new Error(`Erro ao salvar exercícios do Treino ${workout.label}: ${exErr.message}`)
        }
      }

      // 2. Salvar grade semanal
      const scheduleRows = DIAS.map(d => ({
        client_id:     clienteId,
        day_of_week:   d.key,
        workout_label: schedule[d.key] ?? null,
      }))
      const { error: schedErr } = await supabase
        .from('client_workout_schedule')
        .upsert(scheduleRows, { onConflict: 'client_id,day_of_week' })
      if (schedErr) throw new Error(`Erro ao salvar grade: ${schedErr.message}`)

      // 3. Marcar solicitação como concluída
      if (requestId) {
        await supabase
          .from('plan_requests')
          .update({ status: 'completed' })
          .eq('id', requestId)
      }

      router.push('/profissional/treinos')
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao enviar plano.')
      setSending(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  if (!clienteId) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground mb-4">Nenhum cliente selecionado.</p>
        <Link href="/profissional/treinos">
          <Button variant="outline">← Voltar para Treinos</Button>
        </Link>
      </div>
    )
  }

  const durNum    = parseInt(durationWeeks, 10)
  const endDate   = calcEndDate(startDate, durNum)
  const labels    = DIVISION_LABELS[divisionType] ?? ['A']
  const trainingDays = Object.values(schedule).filter(Boolean).length

  return (
    <div className="space-y-7 pb-16">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <Link href="/profissional/treinos">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-4 h-4" />
            Voltar
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Criar Plano de Treino</h2>
          <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            {loadingClient ? 'Carregando...' : clienteName}
          </p>
        </div>
      </div>

      {/* ── Anamnese do cliente ── */}
      <AnamnesePanel clienteId={clienteId} />

      {/* ── Configuração do plano ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Configuração do Plano
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Início */}
            <div className="space-y-1.5">
              <Label className="text-sm">Início do plano</Label>
              <Input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="text-sm"
              />
            </div>

            {/* Duração */}
            <div className="space-y-1.5">
              <Label className="text-sm">Duração</Label>
              <Select value={durationWeeks} onValueChange={setDurationWeeks}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 semana</SelectItem>
                  <SelectItem value="2">2 semanas</SelectItem>
                  <SelectItem value="4">4 semanas</SelectItem>
                  <SelectItem value="8">8 semanas</SelectItem>
                  <SelectItem value="12">12 semanas</SelectItem>
                  <SelectItem value="16">16 semanas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Divisão */}
            <div className="space-y-1.5">
              <Label className="text-sm">Divisão</Label>
              <Select value={divisionType} onValueChange={changeDivision}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(DIVISION_DISPLAY).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Resumo do período */}
          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 rounded-lg px-4 py-2.5 text-sm">
            <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span className="text-emerald-700 dark:text-emerald-300">
              Plano ativo de <strong>{formatBR(startDate)}</strong> até <strong>{formatBR(endDate)}</strong>
              {' '}— {durNum} {durNum === 1 ? 'semana' : 'semanas'}, {trainingDays} dias de treino/semana
            </span>
          </div>

          {/* Ação: gerar com IA */}
          <div className="flex items-center justify-between gap-4 pt-1 border-t border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Preencher treinos com IA</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                A IA cria os exercícios baseada na anamnese do cliente — rascunho editável, nunca enviado automaticamente.
              </p>
            </div>
            <Button
              type="button"
              onClick={gerarComIA}
              disabled={gerandoIA}
              className="gap-2 bg-violet-600 hover:bg-violet-700 text-white flex-shrink-0"
            >
              {gerandoIA ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Gerando…</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Gerar com IA</>
              )}
            </Button>
          </div>

          {/* Erro da IA */}
          {erroIA && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border border-red-100 dark:border-red-800 rounded-lg px-4 py-2.5">
              {erroIA}
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Agenda semanal ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Agenda Semanal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {DIAS.map(dia => {
              const val = schedule[dia.key] ?? null
              return (
                <div key={dia.key} className="flex flex-col gap-1.5 items-center">
                  <span className="text-xs font-medium text-muted-foreground">{dia.label}</span>
                  <Select
                    value={val ?? 'rest'}
                    onValueChange={v => setDay(dia.key, v === 'rest' ? null : v)}
                  >
                    <SelectTrigger className={`h-10 text-xs px-2 font-semibold ${val ? LABEL_COLORS[val] : ''}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rest" className="text-muted-foreground">—</SelectItem>
                      {labels.map(l => (
                        <SelectItem key={l} value={l}>Treino {l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Esta grade se repete automaticamente a cada semana durante todo o período do plano.
          </p>
        </CardContent>
      </Card>

      {/* ── Treinos (A, B, C) ── */}
      {workouts.map((workout, wIdx) => (
        <Card key={workout.label}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <div className={`w-7 h-7 rounded-lg border flex items-center justify-center text-sm font-bold flex-shrink-0 ${LABEL_COLORS[workout.label] ?? ''}`}>
                {workout.label}
              </div>
              Treino {workout.label}
              <Badge variant="secondary" className="text-xs ml-auto">
                {workout.exercises.filter(e => e.name.trim()).length} exercício(s)
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">

            {/* Campos gerais do treino */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-sm">Nome</Label>
                <Input
                  value={workout.name}
                  onChange={e => updateWorkout(wIdx, 'name', e.target.value)}
                  placeholder={`Treino ${workout.label}`}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Metodologia</Label>
                <Input
                  value={workout.methodology}
                  onChange={e => updateWorkout(wIdx, 'methodology', e.target.value)}
                  placeholder="Ex: Série progressiva, Drop-set, Pirâmide…"
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-sm">Observações do treino</Label>
                <Textarea
                  value={workout.notes}
                  onChange={e => updateWorkout(wIdx, 'notes', e.target.value)}
                  placeholder="Orientações gerais, tempo de descanso entre séries, intensidade…"
                  rows={2}
                  className="text-sm resize-none"
                />
              </div>
            </div>

            {/* Exercícios */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between pb-1 border-b border-border">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Dumbbell className="w-3.5 h-3.5" /> Exercícios
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addEx(wIdx)}
                  className="h-7 text-xs gap-1.5"
                >
                  <Plus className="w-3 h-3" /> Adicionar
                </Button>
              </div>

              {/* Cabeçalho das colunas */}
              <div className="hidden sm:grid grid-cols-12 gap-2 px-1">
                <span className="col-span-5 text-xs text-muted-foreground">Exercício</span>
                <span className="col-span-2 text-xs text-muted-foreground text-center">Séries</span>
                <span className="col-span-2 text-xs text-muted-foreground text-center">Reps</span>
                <span className="col-span-2 text-xs text-muted-foreground text-center">Desc.(s)</span>
                <span className="col-span-1" />
              </div>

              {workout.exercises.map((ex, eIdx) => (
                <div key={ex.id} className="space-y-1.5">
                  {/* Linha principal */}
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <ExerciseCombobox
                      value={ex.name}
                      onChange={v => updateEx(wIdx, eIdx, 'name', v)}
                      placeholder={`Exercício ${eIdx + 1}`}
                      className="col-span-12 sm:col-span-5"
                    />
                    <Input
                      value={ex.sets}
                      onChange={e => updateEx(wIdx, eIdx, 'sets', e.target.value)}
                      placeholder="3"
                      className="col-span-4 sm:col-span-2 text-sm h-9 text-center"
                    />
                    <Input
                      value={ex.reps}
                      onChange={e => updateEx(wIdx, eIdx, 'reps', e.target.value)}
                      placeholder="12"
                      className="col-span-4 sm:col-span-2 text-sm h-9 text-center"
                    />
                    <Input
                      value={ex.rest_seconds}
                      onChange={e => updateEx(wIdx, eIdx, 'rest_seconds', e.target.value)}
                      placeholder="60"
                      className="col-span-3 sm:col-span-2 text-sm h-9 text-center"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeEx(wIdx, eIdx)}
                      disabled={workout.exercises.length <= 1}
                      className="col-span-1 h-9 w-full p-0 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  {/* Alternativa */}
                  {ex.showAlt ? (
                    <div className="ml-2 pl-3 border-l-2 border-dashed border-violet-300 dark:border-violet-700 space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-violet-600 dark:text-violet-400">Opção 2 (alternativa)</span>
                        <button
                          type="button"
                          onClick={() => toggleAlt(wIdx, eIdx)}
                          className="text-xs text-muted-foreground hover:text-red-500 ml-auto"
                        >
                          remover
                        </button>
                      </div>
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <ExerciseCombobox
                          value={ex.alt_name}
                          onChange={v => updateEx(wIdx, eIdx, 'alt_name', v)}
                          placeholder="Exercício alternativo…"
                          className="col-span-12 sm:col-span-9"
                        />
                        <Input
                          value={ex.alt_notes}
                          onChange={e => updateEx(wIdx, eIdx, 'alt_notes', e.target.value)}
                          placeholder="Obs. (opcional)"
                          className="col-span-12 sm:col-span-3 text-sm h-9"
                        />
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleAlt(wIdx, eIdx)}
                      className="text-xs text-violet-600 dark:text-violet-400 hover:opacity-80 flex items-center gap-1 ml-1"
                    >
                      <ChevronsUpDown className="w-3 h-3" />
                      Adicionar alternativa
                    </button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* ── Erro ── */}
      {erro && (
        <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border border-red-100 dark:border-red-800 rounded-xl px-4 py-3">
          {erro}
        </div>
      )}

      {/* ── Botões finais ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-border">
        <p className="text-xs text-muted-foreground order-2 sm:order-1">
          O plano será enviado diretamente ao cliente com status <strong>Ativo</strong>.
        </p>
        <div className="flex gap-3 order-1 sm:order-2 w-full sm:w-auto">
          <Link href="/profissional/treinos" className="flex-1 sm:flex-none">
            <Button variant="outline" className="w-full">Cancelar</Button>
          </Link>
          <Button
            onClick={handleEnviar}
            disabled={sending}
            className="flex-1 sm:flex-none gap-2 bg-emerald-600 hover:bg-emerald-700 text-white min-w-[160px]"
          >
            <Send className="w-4 h-4" />
            {sending ? 'Enviando plano…' : 'Enviar Plano'}
          </Button>
        </div>
      </div>

    </div>
  )
}

export default function PlanoTreinoPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    }>
      <PlanoForm />
    </Suspense>
  )
}
