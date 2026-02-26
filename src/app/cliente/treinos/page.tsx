'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dumbbell, Timer, CheckCircle2, Circle, Flame, Star, Trophy, Zap } from 'lucide-react'
import { formatDate } from '@/lib/date-utils'

// XP constants
const XP_PER_EXERCISE = 10
const XP_FULL_WORKOUT_BONUS = 50
const XP_PER_LEVEL = 500

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

export default function ClienteTreinosPage() {
  const [treinos, setTreinos] = useState<any[]>([])
  const [sessions, setSessions] = useState<Record<string, Session>>({})
  const [gamification, setGamification] = useState<Gamification | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingExercise, setSavingExercise] = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const [{ data: treinosData }, { data: sessionsData }, { data: gamiData }] = await Promise.all([
      supabase
        .from('workouts')
        .select('*, workout_exercises(id, division_label, name, sets, reps, rest_seconds, notes, order_index), profiles!workouts_professional_id_fkey(full_name)')
        .eq('client_id', user.id)
        .eq('status', 'sent')
        .order('sent_at', { ascending: false }),
      supabase
        .from('workout_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today),
      supabase
        .from('user_gamification')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle(),
    ])

    setTreinos(treinosData ?? [])

    const sessionMap: Record<string, Session> = {}
    for (const s of sessionsData ?? []) {
      sessionMap[s.workout_id] = s
    }
    setSessions(sessionMap)
    setGamification(gamiData ?? null)
    setLoading(false)
  }, [today])

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
      await updateGamification(userId, xpEarned, 1)
    }

    setSavingExercise(null)
  }

  async function updateGamification(uid: string, xpDelta: number, sessionsDelta: number) {
    const existing = gamification
    const lastDate = existing?.last_workout_date
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    const newStreak = lastDate === yesterdayStr || lastDate === today
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
      last_workout_date: today,
      total_sessions: (existing?.total_sessions ?? 0) + sessionsDelta,
      total_exercises_done: (existing?.total_exercises_done ?? 0) + (gamification ? 0 : 0),
    }

    const { data } = await supabase
      .from('user_gamification')
      .upsert(gamiData, { onConflict: 'user_id' })
      .select()
      .single()

    if (data) setGamification(data)
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

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Meus Treinos</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Marque os exercícios concluídos e acompanhe seu progresso.
        </p>
      </div>

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

      {!treinos.length ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Dumbbell className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">Nenhum treino disponível ainda.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {treinos.map((treino: any) => {
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
              const label = ex.division_label ?? 'Geral'
              if (!byDivision.has(label)) byDivision.set(label, [])
              byDivision.get(label)!.push(ex)
            }

            return (
              <Card key={treino.id} className={isComplete ? 'border-emerald-200 dark:border-emerald-700' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 flex-wrap">
                        <CardTitle className="text-base sm:text-lg leading-snug">{treino.name}</CardTitle>
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
          })}
        </div>
      )}
    </div>
  )
}
