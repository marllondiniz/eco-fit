'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Dumbbell, Timer, CheckCircle2, Circle, Flame, Star, Trophy, Zap, Calendar, RefreshCw, Lock, CheckCheck, Clock3, X, Moon, ChevronsUpDown } from 'lucide-react'
import { SolicitarTreinoButton } from '@/components/SolicitarTreinoButton'
import {
  formatDate,
  getLocalDateString,
  getLocalDayOfWeek,
  getLocalWeekStart,
  getWeekDates,
  getDaysInMonth,
} from '@/lib/date-utils'

// XP constants
const XP_PER_EXERCISE = 10
const XP_FULL_WORKOUT_BONUS = 50
const XP_PER_LEVEL = 500

const DIAS_SEMANA = [
  { value: 'mon', label: 'Seg' },
  { value: 'tue', label: 'Ter' },
  { value: 'wed', label: 'Qua' },
  { value: 'thu', label: 'Qui' },
  { value: 'fri', label: 'Sex' },
  { value: 'sat', label: 'Sáb' },
  { value: 'sun', label: 'Dom' },
] as const

function getLevelInfo(xp: number) {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1
  const xpInLevel = xp % XP_PER_LEVEL
  const pct = Math.round((xpInLevel / XP_PER_LEVEL) * 100)
  return { level, xpInLevel, pct }
}

function getLevelLabel(level: number) {
  if (level <= 2) return { label: 'Iniciante', color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-800' }
  if (level <= 5) return { label: 'Intermediário', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/60' }
  if (level <= 10) return { label: 'Avançado', color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/60' }
  if (level <= 20) return { label: 'Expert', color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/60' }
  return { label: 'Elite', color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/60' }
}

interface Session {
  id: string
  workout_id: string
  completed_exercise_ids: string[]
  total_exercises: number
  completed_count: number
  is_complete: boolean
  date: string
}

interface Gamification {
  total_xp: number
  level: number
  streak_days: number
  longest_streak: number
  total_sessions: number
  total_exercises_done: number
  last_workout_date: string | null
}

function getYesterdayDateString(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return getLocalDateString(d)
}

export default function ClienteTreinosPage() {
  const [treinos, setTreinos] = useState<any[]>([])
  const [sessions, setSessions] = useState<Record<string, Session>>({})
  const [gamification, setGamification] = useState<Gamification | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingExercise, setSavingExercise] = useState<string | null>(null)
  const [yesterdaySessionToConfirm, setYesterdaySessionToConfirm] = useState<{
    session: Session
    workoutName: string
  } | null>(null)
  const [confirmingPrevious, setConfirmingPrevious] = useState(false)
  const [planejamentoView, setPlanejamentoView] = useState<'week' | 'month'>('week')
  const [scheduleMap, setScheduleMap] = useState<Record<string, string | null>>({})
  const [selectedDay, setSelectedDay] = useState<{
    label: string | null   // e.g. 'A', 'B', null = descanso
    dayName: string        // e.g. 'Quinta-feira'
    isToday: boolean
  } | null>(null)

  const today = getLocalDateString()
  const yesterday = getYesterdayDateString()
  const todayDayOfWeek = getLocalDayOfWeek()
  const scheduleLabelToday = scheduleMap[todayDayOfWeek] ?? null

  /** Mapa dia -> rótulo para exibir a grade. Usa client_workout_schedule; se vazio, deriva dos treinos (day_of_week). */
  const displayScheduleMap = useMemo(() => {
    if (Object.keys(scheduleMap).length > 0) return scheduleMap
    const fallback: Record<string, string | null> = {}
    for (const d of DIAS_SEMANA) fallback[d.value] = null
    for (const t of treinos) {
      const day = (t as { day_of_week?: string }).day_of_week
      const label = (t as { label?: string }).label
      if (day && label) fallback[day] = label
    }
    return fallback
  }, [scheduleMap, treinos])

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const [
      { data: treinosData },
      { data: sessionsToday },
      { data: sessionsYesterday },
      { data: gamiData },
      { data: scheduleRows },
    ] = await Promise.all([
      supabase
        .from('workouts')
        .select('*, workout_exercises(id, division_label, name, sets, reps, rest_seconds, notes, order_index, alternative_name, alternative_notes), profiles!workouts_professional_id_fkey(full_name)')
        .eq('client_id', user.id)
        .eq('status', 'sent')
        .order('end_date', { ascending: false, nullsFirst: false }),
      supabase
        .from('workout_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today),
      supabase
        .from('workout_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', yesterday),
      supabase
        .from('user_gamification')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('client_workout_schedule')
        .select('day_of_week, workout_label')
        .eq('client_id', user.id)
        .order('day_of_week'),
    ])

    const treinosList = treinosData ?? []
    setTreinos(treinosList)
    const map: Record<string, string | null> = {}
    for (const row of scheduleRows ?? []) {
      map[(row as { day_of_week: string }).day_of_week] = (row as { workout_label: string | null }).workout_label ?? null
    }
    setScheduleMap(map)

    const sessionMap: Record<string, Session> = {}
    for (const s of sessionsToday ?? []) {
      sessionMap[s.workout_id] = s
    }
    setSessions(sessionMap)
    setGamification(gamiData ?? null)
    setLoading(false)

    const incompleteYesterday = (sessionsYesterday ?? []).filter((s: Session) => !s.is_complete)
    if (incompleteYesterday.length > 0) {
      const first = incompleteYesterday[0]
      const workout = treinosList.find((t: any) => t.id === first.workout_id)
      const workoutName = workout?.name ?? (workout?.label ? `Treino ${workout.label}` : 'Treino anterior')
      setYesterdaySessionToConfirm({ session: first, workoutName })
    }
  }, [today, yesterday, todayDayOfWeek])

  useEffect(() => { loadData() }, [loadData])

  async function toggleExercise(workoutId: string, exerciseId: string, totalExercises: number) {
    if (!userId || savingExercise) return
    setSavingExercise(exerciseId)

    const current = sessions[workoutId]
    const alreadyDone = current?.completed_exercise_ids?.includes(exerciseId) ?? false
    const newIds = alreadyDone
      ? (current?.completed_exercise_ids ?? []).filter((id: string) => id !== exerciseId)
      : [...(current?.completed_exercise_ids ?? []), exerciseId]

    const newCount = newIds.length
    const isComplete = newCount === totalExercises
    const xpEarned = newCount * XP_PER_EXERCISE + (isComplete ? XP_FULL_WORKOUT_BONUS : 0)

    // Upsert session
    const sessionData = {
      user_id: userId,
      workout_id: workoutId,
      date: today,
      completed_exercise_ids: newIds,
      total_exercises: totalExercises,
      completed_count: newCount,
      is_complete: isComplete,
      xp_earned: xpEarned,
      started_at: current?.id ? undefined : new Date().toISOString(),
      completed_at: isComplete ? new Date().toISOString() : null,
    }

    const { data: updatedSession } = await supabase
      .from('workout_sessions')
      .upsert(sessionData, { onConflict: 'user_id,workout_id,date' })
      .select()
      .single()

    if (updatedSession) {
      setSessions(prev => ({ ...prev, [workoutId]: updatedSession }))
    }

    // Update gamification
    if (isComplete && !current?.is_complete) {
      await updateGamification(userId, xpEarned, 1, undefined, totalExercises)
    }

    setSavingExercise(null)
  }

  async function updateGamification(
    uid: string,
    xpDelta: number,
    sessionsDelta: number,
    workoutDate?: string,
    exercisesDelta: number = 0
  ) {
    const existing = gamification
    const dateToSet = workoutDate ?? today
    const lastDate = existing?.last_workout_date
    const dayBefore = (() => {
      const d = new Date(dateToSet + 'T12:00:00')
      d.setDate(d.getDate() - 1)
      return getLocalDateString(d)
    })()

    const newStreak = lastDate === dayBefore || lastDate === dateToSet
      ? (existing?.streak_days ?? 0) + 1
      : 1

    const newTotalXP = (existing?.total_xp ?? 0) + xpDelta
    const newLevel = Math.floor(newTotalXP / XP_PER_LEVEL) + 1

    const gamiData = {
      user_id: uid,
      total_xp: newTotalXP,
      level: newLevel,
      streak_days: newStreak,
      longest_streak: Math.max(newStreak, existing?.longest_streak ?? 0),
      last_workout_date: dateToSet,
      total_sessions: (existing?.total_sessions ?? 0) + sessionsDelta,
      total_exercises_done: (existing?.total_exercises_done ?? 0) + exercisesDelta,
    }

    const { data } = await supabase
      .from('user_gamification')
      .upsert(gamiData, { onConflict: 'user_id' })
      .select()
      .single()

    if (data) setGamification(data)
  }

  async function markPreviousWorkoutDone() {
    if (!userId || !yesterdaySessionToConfirm) return
    setConfirmingPrevious(true)
    const { session, workoutName } = yesterdaySessionToConfirm
    const totalEx = session.total_exercises
    const xpEarned = totalEx * XP_PER_EXERCISE + XP_FULL_WORKOUT_BONUS

    await supabase
      .from('workout_sessions')
      .update({
        completed_count: totalEx,
        is_complete: true,
        completed_at: new Date().toISOString(),
        xp_earned: xpEarned,
      })
      .eq('id', session.id)

    await updateGamification(userId, xpEarned, 1, yesterday, totalEx)
    setYesterdaySessionToConfirm(null)
    setConfirmingPrevious(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  const levelInfo = gamification ? getLevelInfo(gamification.total_xp) : null
  const levelLabel = levelInfo ? getLevelLabel(levelInfo.level) : null

  const treinoDoDia =
    treinos.length === 0
      ? null
      : scheduleLabelToday
        ? treinos.find((t: any) => t.label === scheduleLabelToday) ?? null
        : treinos.find((t: any) => t.day_of_week === todayDayOfWeek) ?? null

  const hojeDescanso = treinos.length > 0 && treinoDoDia === null

  // Plano ativo = algum treino sem end_date ou com end_date >= hoje
  const planoAtivo = treinos.find((t: any) => !t.end_date || t.end_date >= today) ?? null
  // Plano expirado mais recente = todos têm end_date < hoje
  const planoExpirado = !planoAtivo && treinos.length > 0 ? treinos[0] : null

  return (
    <div className="space-y-8">
      <AlertDialog open={!!yesterdaySessionToConfirm} onOpenChange={(open) => !open && setYesterdaySessionToConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Treino anterior</AlertDialogTitle>
            <AlertDialogDescription>
              Você realizou o treino anterior ({yesterdaySessionToConfirm?.workoutName})?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={confirmingPrevious}>Não fiz</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                markPreviousWorkoutDone()
              }}
              disabled={confirmingPrevious}
            >
              {confirmingPrevious ? 'Salvando...' : 'Sim, fiz'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div>
        <h2 className="text-2xl font-bold text-foreground">Meus Treinos</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Marque os exercícios concluídos e acompanhe seu progresso.
        </p>
      </div>

      {/* Banner de status do plano */}
      {planoAtivo && planoAtivo.end_date && (
        <div className="flex items-start gap-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 rounded-xl px-4 py-3">
          <CheckCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-emerald-700 dark:text-emerald-300">
            <span className="font-semibold">Plano ativo</span> até{' '}
            {new Date(planoAtivo.end_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}.
          </div>
          <span title="Novo plano disponível ao término"><Lock className="w-4 h-4 text-emerald-600/60 dark:text-emerald-400/60 ml-auto flex-shrink-0 mt-0.5" /></span>
        </div>
      )}

      {planoExpirado && (
        <Card>
          <CardContent className="py-10 space-y-4">
            <div className="text-center">
              <RefreshCw className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="font-medium text-muted-foreground">Seu plano foi finalizado.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Solicite um novo plano ao seu personal.
              </p>
            </div>
            <SolicitarTreinoButton label="Solicitar novo plano de treino" />
          </CardContent>
        </Card>
      )}

      {!planoAtivo && !planoExpirado && treinos.length === 0 && (
        <Card>
          <CardContent className="py-10 space-y-4">
            <div className="text-center">
              <Dumbbell className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="font-medium text-muted-foreground">Nenhum plano de treino disponível ainda.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Solicite um plano ao seu personal.
              </p>
            </div>
            <SolicitarTreinoButton />
          </CardContent>
        </Card>
      )}

      {/* Seu planejamento: calendário / grade semanal e mensal */}
      {(treinos.length > 0 || Object.keys(scheduleMap).length > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Seu planejamento
            </CardTitle>
            <p className="text-sm text-muted-foreground font-normal">
              Visão do cronograma definido pelo seu personal. Marque como concluído apenas o treino de hoje.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Hoje: Treino X ou Descanso */}
            <div className="rounded-xl bg-primary/10 border border-primary/20 p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Hoje</p>
              <p className="text-lg font-bold text-foreground">
                {scheduleLabelToday ? (
                  <>Treino {scheduleLabelToday}</>
                ) : (
                  <span className="text-muted-foreground">Descanso</span>
                )}
              </p>
              {treinoDoDia && (
                <p className="text-sm text-muted-foreground mt-0.5 truncate">{treinoDoDia.name}</p>
              )}
            </div>

            {/* Abas Semana | Mês */}
            <div className="flex gap-2 border-b border-border pb-2">
              <button
                type="button"
                onClick={() => setPlanejamentoView('week')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  planejamentoView === 'week'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                Visão da semana
              </button>
              <button
                type="button"
                onClick={() => setPlanejamentoView('month')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  planejamentoView === 'month'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                Visão do mês
              </button>
            </div>

            {/* Grade semanal */}
            {planejamentoView === 'week' && (
              <div className="grid grid-cols-7 gap-2">
                {DIAS_SEMANA.map(({ value, label }) => {
                  const workoutLabel = displayScheduleMap[value] ?? null
                  const isToday = value === todayDayOfWeek
                  const DAY_NAMES: Record<string, string> = { mon: 'Segunda-feira', tue: 'Terça-feira', wed: 'Quarta-feira', thu: 'Quinta-feira', fri: 'Sexta-feira', sat: 'Sábado', sun: 'Domingo' }
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSelectedDay({ label: workoutLabel, dayName: DAY_NAMES[value] ?? label, isToday })}
                      className={`rounded-lg border p-3 text-center transition-all hover:shadow-sm active:scale-95 ${
                        isToday ? 'ring-2 ring-primary bg-primary/10 border-primary/30' : 'bg-muted/30 hover:bg-muted/60'
                      }`}
                    >
                      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
                      <p className={`text-sm font-bold mt-1 ${workoutLabel ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {workoutLabel ? `Treino ${workoutLabel}` : 'Descanso'}
                      </p>
                      {isToday && (
                        <span className="inline-block mt-1 text-xs font-medium text-primary">Hoje</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Grade mensal */}
            {planejamentoView === 'month' && (() => {
              const now = new Date()
              const year = now.getFullYear()
              const month = now.getMonth()
              const daysInMonth = getDaysInMonth(year, month + 1)
              const dates = Array.from({ length: daysInMonth }, (_, i) =>
                getLocalDateString(new Date(year, month, i + 1))
              )
              const firstDay = getLocalDayOfWeek(new Date(year, month, 1))
              const emptySlots = DIAS_SEMANA.findIndex((d) => d.value === firstDay)
              return (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">
                    {new Date(year, month, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                  </p>
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {DIAS_SEMANA.map(({ label }) => (
                      <div key={label} className="text-xs font-semibold text-muted-foreground py-1">
                        {label}
                      </div>
                    ))}
                    {Array.from({ length: emptySlots }, (_, i) => (
                      <div key={`empty-${i}`} className="p-2" />
                    ))}
                    {dates.map((dateStr) => {
                      const dayOfWeek = getLocalDayOfWeek(new Date(dateStr + 'T12:00:00'))
                      const workoutLabel = displayScheduleMap[dayOfWeek] ?? null
                      const isToday = dateStr === today
                      const d = new Date(dateStr + 'T12:00:00')
                      const dayName = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
                      return (
                        <button
                          key={dateStr}
                          type="button"
                          onClick={() => setSelectedDay({ label: workoutLabel, dayName, isToday })}
                          className={`rounded-md border p-2 min-h-[2.5rem] flex flex-col items-center justify-center transition-all hover:shadow-sm active:scale-95 ${
                            isToday ? 'ring-2 ring-primary bg-primary/10 border-primary/30' : 'bg-muted/20 hover:bg-muted/50'
                          }`}
                        >
                          <span className="text-xs font-medium text-foreground">{dateStr.split('-')[2]}</span>
                          <span className={`text-xs mt-0.5 ${workoutLabel ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                            {workoutLabel ?? '—'}
                          </span>
                          {isToday && <span className="text-[10px] text-primary font-medium">Hoje</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })()}
          </CardContent>
        </Card>
      )}

      {/* Painel de gamificação */}
      {gamification !== null && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Nível e XP */}
          <Card className="col-span-2">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${levelLabel?.bg}`}>
                    <Star className={`w-4 h-4 ${levelLabel?.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Nível {levelInfo?.level}</p>
                    <p className={`text-sm font-bold ${levelLabel?.color}`}>{levelLabel?.label}</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-muted-foreground">
                  {levelInfo?.xpInLevel} / {XP_PER_LEVEL} XP
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-primary to-emerald-400 transition-all duration-700"
                  style={{ width: `${levelInfo?.pct ?? 0}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">{gamification.total_xp} XP total</p>
            </CardContent>
          </Card>

          {/* Streak */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-xs text-muted-foreground">Sequência</span>
              </div>
              <p className="text-3xl font-bold text-foreground">{gamification.streak_days}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {gamification.streak_days === 1 ? 'dia consecutivo' : 'dias consecutivos'}
              </p>
              <p className="text-xs text-muted-foreground mt-1 opacity-70">
                Recorde: {gamification.longest_streak}d
              </p>
            </CardContent>
          </Card>

          {/* Total sessões */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-muted-foreground">Treinos</span>
              </div>
              <p className="text-3xl font-bold text-foreground">{gamification.total_sessions}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {gamification.total_sessions === 1 ? 'sessão completa' : 'sessões completas'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Modal: detalhes do treino do dia ── */}
      {selectedDay && (() => {
        const workout = selectedDay.label
          ? (treinos.find((t: any) => t.label === selectedDay.label) ?? null)
          : null
        const session = workout ? sessions[workout.id] : null
        const totalEx = workout?.workout_exercises?.length ?? 0
        const doneCount = session?.completed_count ?? 0
        const progressPct = totalEx > 0 ? Math.round((doneCount / totalEx) * 100) : 0
        const isComplete = session?.is_complete ?? false
        const sorted = [...(workout?.workout_exercises ?? [])].sort(
          (a: any, b: any) => a.order_index - b.order_index
        )
        return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            {/* Overlay */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setSelectedDay(null)}
            />

            {/* Painel */}
            <div className="relative bg-background rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] flex flex-col overflow-hidden">

              {/* Header */}
              <div className={`px-5 pt-5 pb-4 flex items-start justify-between gap-3 border-b border-border flex-shrink-0 ${workout ? 'bg-primary/5' : 'bg-muted/40'}`}>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider capitalize">
                    {selectedDay.dayName}
                  </p>
                  <p className="text-lg font-bold text-foreground mt-0.5">
                    {workout ? workout.name : 'Dia de descanso'}
                  </p>
                  {workout?.label && (
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-primary/10 text-primary font-bold text-sm">
                        {workout.label}
                      </span>
                      {selectedDay.isToday && (
                        <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          Treino de hoje
                        </span>
                      )}
                      {!selectedDay.isToday && (
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          Somente visualização
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setSelectedDay(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors flex-shrink-0"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Conteúdo scrollável */}
              <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

                {/* Descanso */}
                {!workout && (
                  <div className="text-center py-8 space-y-3">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                      <Moon className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                    <p className="font-semibold text-foreground">Dia de descanso</p>
                    <p className="text-sm text-muted-foreground">
                      Nenhum treino programado para este dia. Aproveite para recuperar!
                    </p>
                  </div>
                )}

                {/* Workout */}
                {workout && (
                  <>
                    {/* Progresso (somente hoje) */}
                    {selectedDay.isToday && totalEx > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Progresso de hoje</span>
                          <span className="font-semibold text-foreground">{doneCount}/{totalEx} exercícios ({progressPct}%)</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${isComplete ? 'bg-emerald-500' : 'bg-primary'}`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        {isComplete && (
                          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Treino concluído!
                          </p>
                        )}
                      </div>
                    )}

                    {/* Metodologia */}
                    {workout.methodology && (
                      <div className="bg-blue-50 dark:bg-blue-950/40 rounded-xl p-3">
                        <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide mb-1">Metodologia</p>
                        <p className="text-sm text-foreground">{workout.methodology}</p>
                      </div>
                    )}

                    {/* Exercícios */}
                    {sorted.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Exercícios ({sorted.length})
                        </p>
                        {sorted.map((ex: any, idx: number) => {
                          const done = session?.completed_exercise_ids?.includes(ex.id) ?? false
                          const saving = savingExercise === ex.id
                          const canToggle = selectedDay.isToday

                          return (
                            <div key={ex.id} className="space-y-1">
                              {/* Exercício principal */}
                              <div
                                onClick={() => canToggle && toggleExercise(workout.id, ex.id, totalEx)}
                                className={`border rounded-xl p-3.5 transition-all duration-200 ${
                                  canToggle ? 'cursor-pointer' : 'cursor-default'
                                } ${
                                  done && canToggle
                                    ? 'border-emerald-200 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/30'
                                    : 'border-border bg-card'
                                } ${saving ? 'opacity-60' : ''} ${
                                  canToggle ? 'hover:border-primary/40 hover:bg-muted/30' : ''
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <div className="flex-shrink-0 mt-0.5">
                                    {canToggle ? (
                                      done
                                        ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                        : <Circle className="w-5 h-5 text-muted-foreground/40" />
                                    ) : (
                                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted text-xs font-bold text-muted-foreground">
                                        {idx + 1}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                      <p className={`font-medium text-sm ${done && canToggle ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                        {ex.name}
                                      </p>
                                      <div className="flex items-center gap-2 flex-shrink-0">
                                        {ex.sets && ex.reps && (
                                          <span className="text-xs font-bold bg-muted px-2 py-0.5 rounded-md text-foreground">
                                            {ex.sets}×{ex.reps}
                                          </span>
                                        )}
                                        {ex.rest_seconds && (
                                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Timer className="w-3 h-3" />{ex.rest_seconds}s
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    {ex.notes && (
                                      <p className="text-xs text-muted-foreground mt-0.5">{ex.notes}</p>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Exercício alternativo */}
                              {ex.alternative_name && (
                                <div className="ml-4 pl-3 border-l-2 border-dashed border-violet-300 dark:border-violet-700">
                                  <div className="border border-violet-200 dark:border-violet-800 rounded-xl p-3 bg-violet-50/50 dark:bg-violet-950/20">
                                    <div className="flex items-start gap-2">
                                      <ChevronsUpDown className="w-3.5 h-3.5 text-violet-500 flex-shrink-0 mt-0.5" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 mb-0.5">
                                          Opção 2 (alternativa)
                                        </p>
                                        <p className="text-sm text-foreground font-medium">{ex.alternative_name}</p>
                                        {ex.alternative_notes && (
                                          <p className="text-xs text-muted-foreground mt-0.5">{ex.alternative_notes}</p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum exercício cadastrado para este treino.
                      </p>
                    )}

                    {/* Observações do treino */}
                    {workout.notes && (
                      <div className="bg-muted rounded-xl p-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Observações do personal</p>
                        <p className="text-sm text-foreground">{workout.notes}</p>
                      </div>
                    )}

                    {/* Aviso somente-leitura para dias não hoje */}
                    {!selectedDay.isToday && totalEx > 0 && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/60 rounded-xl p-3">
                        <Lock className="w-3.5 h-3.5 flex-shrink-0" />
                        Você só pode marcar exercícios como concluídos no dia de hoje.
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-border px-5 py-4 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedDay(null)}
                  className="w-full h-10 rounded-xl bg-muted hover:bg-muted/80 text-sm font-medium transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {!treinos.length ? null : hojeDescanso ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Dumbbell className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">Hoje é dia de descanso.</p>
            <p className="text-muted-foreground text-sm mt-1">Não há treino programado para hoje no seu cronograma.</p>
          </CardContent>
        </Card>
      ) : treinoDoDia ? (
        <div className="space-y-6">
          {(() => {
            const treino = treinoDoDia
            const session = sessions[treino.id]
            const totalEx = treino.workout_exercises?.length ?? 0
            const doneCount = session?.completed_count ?? 0
            const progressPct = totalEx > 0 ? Math.round((doneCount / totalEx) * 100) : 0
            const isComplete = session?.is_complete ?? false

            const sorted = [...(treino.workout_exercises ?? [])].sort(
              (a: any, b: any) => a.order_index - b.order_index
            )
            const byDivision = new Map<string, any[]>()
            for (const ex of sorted) {
              const divLabel = ex.division_label ?? 'Geral'
              if (!byDivision.has(divLabel)) byDivision.set(divLabel, [])
              byDivision.get(divLabel)!.push(ex)
            }

            return (
              <Card key={treino.id} className={isComplete ? 'border-emerald-200 dark:border-emerald-700' : 'border-primary/50 ring-1 ring-primary/20'}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 flex-wrap">
                        <CardTitle className="text-base sm:text-lg leading-snug">{treino.name}</CardTitle>
                        <Badge variant="secondary" className="text-xs shrink-0">Treino de hoje — marque ao concluir</Badge>
                        {isComplete ? (
                          <Badge className="bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border-0 text-xs gap-1 shrink-0">
                            <CheckCircle2 className="w-3 h-3" /> Concluído hoje!
                          </Badge>
                        ) : (
                          <Badge className="bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border-0 text-xs shrink-0">
                            Ativo
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        {treino.profiles?.full_name && (
                          <span className="text-xs text-muted-foreground">Por {treino.profiles.full_name}</span>
                        )}
                        {treino.sent_at && (
                          <span className="text-xs text-muted-foreground">Enviado em {formatDate(treino.sent_at)}</span>
                        )}
                      </div>
                    </div>
                    {/* Contador e XP */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-2xl font-bold text-foreground">
                        {doneCount}<span className="text-base font-normal text-muted-foreground">/{totalEx}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">exercícios</p>
                      {doneCount > 0 && (
                        <p className="text-xs font-semibold text-amber-500 flex items-center gap-0.5 justify-end mt-0.5">
                          <Zap className="w-3 h-3" />
                          {doneCount * XP_PER_EXERCISE + (isComplete ? XP_FULL_WORKOUT_BONUS : 0)} XP
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Barra de progresso */}
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Progresso de hoje</span>
                      <span className="font-semibold text-foreground">{progressPct}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-500 ${
                          isComplete
                            ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                            : 'bg-gradient-to-r from-blue-500 to-blue-400'
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {treino.methodology && (
                    <div className="bg-blue-50 dark:bg-blue-950/40 rounded-xl p-3">
                      <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide mb-1">Metodologia</p>
                      <p className="text-sm text-foreground">{treino.methodology}</p>
                    </div>
                  )}

                  {sorted.length > 0 && (
                    <div className="space-y-4">
                      {Array.from(byDivision.entries()).map(([division, exercises]) => (
                        <div key={division}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                              Divisão {division}
                            </span>
                            <div className="flex-1 h-px bg-border" />
                            <span className="text-xs text-muted-foreground">
                              {exercises.filter((ex: any) => session?.completed_exercise_ids?.includes(ex.id)).length}/{exercises.length}
                            </span>
                          </div>
                          <div className="space-y-2">
                            {exercises.map((ex: any) => {
                              const done = session?.completed_exercise_ids?.includes(ex.id) ?? false
                              const saving = savingExercise === ex.id
                              return (
                                <button
                                  key={ex.id}
                                  onClick={() => toggleExercise(treino.id, ex.id, totalEx)}
                                  disabled={!!saving}
                                  className={`w-full text-left border rounded-xl p-4 transition-all duration-200 ${
                                    done
                                      ? 'border-emerald-200 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/30'
                                      : 'border-border hover:border-primary/40 hover:bg-muted/40'
                                  } ${saving ? 'opacity-70 cursor-wait' : 'cursor-pointer'}`}
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 mt-0.5">
                                      {done ? (
                                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                      ) : (
                                        <Circle className="w-5 h-5 text-muted-foreground/40" />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between gap-2">
                                        <p className={`font-medium text-sm ${done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                          {ex.name}
                                        </p>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                          {ex.sets && ex.reps && (
                                            <Badge variant="secondary" className="text-xs">
                                              {ex.sets}×{ex.reps}
                                            </Badge>
                                          )}
                                          {ex.rest_seconds && (
                                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                              <Timer className="w-3 h-3" />
                                              {ex.rest_seconds}s
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      {ex.notes && (
                                        <p className="text-xs text-muted-foreground mt-1">{ex.notes}</p>
                                      )}
                                    </div>
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {isComplete && (
                    <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800 rounded-xl p-4 text-center">
                      <Trophy className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                        Treino concluído! +{XP_PER_EXERCISE * totalEx + XP_FULL_WORKOUT_BONUS} XP ganhos
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Parabéns pela dedicação!</p>
                    </div>
                  )}

                  {treino.notes && (
                    <div className="bg-muted rounded-xl p-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Observações</p>
                      <p className="text-sm text-foreground">{treino.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })()}
        </div>
      ) : null}
    </div>
  )
}
