'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Utensils, Clock, ChevronsUpDown, Pill, CheckCircle2, Circle, Flame, Star, Trophy, CheckCheck } from 'lucide-react'
import { formatDate, getLocalDateString } from '@/lib/date-utils'
import { SolicitarDietaButton } from '@/components/SolicitarDietaButton'

const XP_PER_MEAL = 10
const XP_FULL_DAY_BONUS = 50
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

interface DietSession {
  id: string
  diet_id: string
  completed_meal_ids: string[]
  total_meals: number
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
  total_diet_sessions: number
  diet_streak_days: number
  longest_diet_streak: number
  last_diet_date: string | null
  total_exercises_done?: number
  last_workout_date?: string | null
}

export default function ClienteDietasPage() {
  const [dietas, setDietas] = useState<any[]>([])
  const [sessionToday, setSessionToday] = useState<DietSession | null>(null)
  const [gamification, setGamification] = useState<Gamification | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingMeal, setSavingMeal] = useState<string | null>(null)
  const [pendingRequest, setPendingRequest] = useState<boolean>(false)

  const today = getLocalDateString()

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const [
      { data: dietasData },
      { data: sessionData },
      { data: gamiData },
      { data: requestData },
    ] = await Promise.all([
      supabase
        .from('diets')
        .select('*, diet_meals(id, name, time_of_day, foods, notes, order_index), profiles!diets_professional_id_fkey(full_name)')
        .eq('client_id', user.id)
        .eq('status', 'sent')
        .order('sent_at', { ascending: false }),
      supabase
        .from('diet_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle(),
      supabase
        .from('user_gamification')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('plan_requests')
        .select('id')
        .eq('client_id', user.id)
        .in('status', ['pending', 'in_progress'])
        .in('type', ['diet', 'both'])
        .limit(1)
        .maybeSingle(),
    ])

    setDietas((dietasData as any[]) ?? [])
    setSessionToday((sessionData as DietSession) ?? null)
    setGamification((gamiData as Gamification) ?? null)
    setPendingRequest(!!requestData)
    setLoading(false)
  }, [today])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') loadData() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [loadData])

  useEffect(() => {
    document.title = 'LB.FIT — Minhas Dietas'
    return () => { document.title = 'LB.FIT' }
  }, [])

  async function toggleMeal(dietaId: string, mealId: string) {
    if (!userId) return
    const dieta = dietas.find((d: any) => d.id === dietaId)
    if (!dieta?.diet_meals?.length) return

    const sortedMeals = [...(dieta.diet_meals ?? [])].sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0))
    const totalMeals = sortedMeals.length
    const current = sessionToday?.diet_id === dietaId ? sessionToday : null
    const completedIds = new Set(current?.completed_meal_ids ?? [])
    if (completedIds.has(mealId)) {
      completedIds.delete(mealId)
    } else {
      completedIds.add(mealId)
    }
    const newCount = completedIds.size
    const isComplete = newCount === totalMeals
    const xpEarned = newCount * XP_PER_MEAL + (isComplete ? XP_FULL_DAY_BONUS : 0)

    setSavingMeal(mealId)

    const sessionData = {
      user_id: userId,
      diet_id: dietaId,
      date: today,
      completed_meal_ids: Array.from(completedIds),
      total_meals: totalMeals,
      completed_count: newCount,
      is_complete: isComplete,
      xp_earned: xpEarned,
      started_at: current?.id ? undefined : new Date().toISOString(),
      completed_at: isComplete ? new Date().toISOString() : null,
    }

    const { data: updated } = await supabase
      .from('diet_sessions')
      .upsert(sessionData, { onConflict: 'user_id,diet_id,date' })
      .select()
      .single()

    if (updated) setSessionToday(updated)

    if (isComplete && !current?.is_complete) {
      const xpDelta = totalMeals * XP_PER_MEAL + XP_FULL_DAY_BONUS
      await updateDietGamification(xpDelta)
    }

    setSavingMeal(null)
  }

  async function updateDietGamification(xpDelta: number) {
    if (!userId) return
    const existing = gamification
    const lastDate = existing?.last_diet_date
    const yesterday = (() => {
      const d = new Date(today + 'T12:00:00')
      d.setDate(d.getDate() - 1)
      return getLocalDateString(d)
    })()
    const newStreak = lastDate === yesterday || lastDate === today
      ? (existing?.diet_streak_days ?? 0) + 1
      : 1
    const newTotalXP = (existing?.total_xp ?? 0) + xpDelta
    const newLevel = Math.floor(newTotalXP / XP_PER_LEVEL) + 1

    const gamiData = {
      user_id: userId,
      total_xp: newTotalXP,
      level: newLevel,
      total_diet_sessions: (existing?.total_diet_sessions ?? 0) + 1,
      last_diet_date: today,
      diet_streak_days: newStreak,
      longest_diet_streak: Math.max(newStreak, existing?.longest_diet_streak ?? 0),
      total_sessions: existing?.total_sessions ?? 0,
      streak_days: existing?.streak_days ?? 0,
      longest_streak: existing?.longest_streak ?? 0,
      total_exercises_done: existing?.total_exercises_done ?? 0,
      last_workout_date: existing?.last_workout_date ?? null,
    }

    const { data } = await supabase
      .from('user_gamification')
      .upsert(gamiData, { onConflict: 'user_id' })
      .select()
      .single()

    if (data) setGamification(data as Gamification)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  const hasActiveDiet = dietas.length > 0
  const dietaAtiva = dietas.find((d: any) => !d.end_date || d.end_date >= today) ?? dietas[0]
  const levelInfo = gamification ? getLevelInfo(gamification.total_xp) : null
  const levelLabel = levelInfo ? getLevelLabel(levelInfo.level) : null

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Minhas Dietas</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Marque as refeições cumpridas e acompanhe seu progresso.
        </p>
      </div>

      {!hasActiveDiet && (
        <Card>
          <CardContent className="py-10 space-y-4">
            <div className="text-center">
              <Utensils className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="font-medium text-muted-foreground">Nenhuma dieta disponível ainda.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Solicite um plano alimentar ao seu nutricionista.
              </p>
            </div>
            {!pendingRequest && (
              <SolicitarDietaButton />
            )}
            {pendingRequest && (
              <div className="flex justify-center">
                <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700">
                  Solicitação em andamento
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {hasActiveDiet && dietaAtiva?.end_date && (
        <div className="flex items-start gap-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 rounded-xl px-4 py-3">
          <CheckCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-emerald-700 dark:text-emerald-300">
            <span className="font-semibold">Plano ativo</span> até{' '}
            {new Date(dietaAtiva.end_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}.
          </div>
        </div>
      )}

      {/* Painel de gamificação — dieta */}
      {hasActiveDiet && gamification !== null && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                  className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700"
                  style={{ width: `${levelInfo?.pct ?? 0}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">{gamification.total_xp} XP total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-xs text-muted-foreground">Sequência dieta</span>
              </div>
              <p className="text-3xl font-bold text-foreground">{gamification.diet_streak_days ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {(gamification.diet_streak_days ?? 0) === 1 ? 'dia consecutivo' : 'dias consecutivos'}
              </p>
              <p className="text-xs text-muted-foreground mt-1 opacity-70">
                Recorde: {gamification.longest_diet_streak ?? 0}d
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-muted-foreground">Dias completos</span>
              </div>
              <p className="text-3xl font-bold text-foreground">{gamification.total_diet_sessions ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {(gamification.total_diet_sessions ?? 0) === 1 ? 'dia cumprido' : 'dias cumpridos'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Plano alimentar — uma única visão com check por refeição */}
      {hasActiveDiet && (
        <div className="space-y-6">
          {dietas!.map((dieta: any) => {
            const sess = sessionToday?.diet_id === dieta.id ? sessionToday : null
            const meals = [...(dieta.diet_meals ?? [])].sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0))
            const totalM = meals.length
            const doneM = (sess?.completed_meal_ids ?? []).length
            const pct = totalM > 0 ? Math.round((doneM / totalM) * 100) : 0

            return (
              <Card key={dieta.id}>
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">{dieta.name}</CardTitle>
                      {dieta.objective && (
                        <p className="text-sm text-muted-foreground mt-1">Objetivo: {dieta.objective}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {dieta.profiles?.full_name && (
                          <span className="text-xs text-muted-foreground">Por {dieta.profiles.full_name}</span>
                        )}
                        {dieta.sent_at && (
                          <span className="text-xs text-muted-foreground">Enviado em {formatDate(dieta.sent_at)}</span>
                        )}
                        {dieta.end_date && (
                          <span className="text-xs text-muted-foreground">
                            Válido até {new Date(dieta.end_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge className="bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border-0 flex-shrink-0">
                      Ativo
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {dieta.methodology && (
                    <div className="bg-emerald-50 dark:bg-emerald-950/40 rounded-xl p-4">
                      <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide mb-1">Metodologia</p>
                      <p className="text-sm text-foreground">{dieta.methodology}</p>
                    </div>
                  )}

                  {meals.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground">Refeições ({meals.length})</p>
                        <p className="text-xs text-muted-foreground">Progresso: {doneM}/{totalM} ({pct}%)</p>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5 mb-2">
                        <div
                          className={`h-1.5 rounded-full transition-all ${sess?.is_complete ? 'bg-emerald-500' : 'bg-primary'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      {sess?.is_complete && (
                        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Todas as refeições de hoje concluídas!
                        </p>
                      )}

                      {meals.map((refeicao: any) => {
                        const isDone = (sess?.completed_meal_ids ?? []).includes(refeicao.id)
                        const isLoading = savingMeal === refeicao.id
                        return (
                          <div
                            key={refeicao.id}
                            onClick={() => !isLoading && toggleMeal(dieta.id, refeicao.id)}
                            className={`border rounded-xl p-4 transition-all cursor-pointer ${
                              isDone ? 'border-emerald-200 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/30' : 'border-border bg-card hover:border-primary/40 hover:bg-muted/30'
                            } ${isLoading ? 'opacity-60' : ''}`}
                          >
                            <div className="flex items-start gap-3 mb-3">
                              <div className="flex-shrink-0 mt-0.5">
                                {isDone ? (
                                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                ) : (
                                  <Circle className="w-5 h-5 text-muted-foreground/40" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`font-medium text-sm ${isDone ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                  {refeicao.name}
                                </p>
                                {refeicao.time_of_day && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                    <Clock className="w-3 h-3" />
                                    {refeicao.time_of_day}
                                  </span>
                                )}
                              </div>
                            </div>
                            {refeicao.foods?.length > 0 && (
                              <div className="ml-8 space-y-1.5">
                                {refeicao.foods.map((food: any, fi: number) => (
                                  <div key={fi} className="space-y-0.5">
                                    <div className="flex items-center justify-between text-sm">
                                      <span className="text-foreground">{food.name}</span>
                                      <span className="text-muted-foreground text-xs">
                                        {food.quantity} {food.unit}
                                        {food.calories ? ` · ${food.calories} kcal` : ''}
                                      </span>
                                    </div>
                                    {food.substitutions?.length > 0 && (
                                      <div className="ml-4 pl-3 border-l-2 border-dashed border-emerald-300 dark:border-emerald-700">
                                        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-0.5">Substituições (TACO)</p>
                                        {food.substitutions.map((sub: { name: string; quantity: string; unit: string }, si: number) => (
                                          <p key={si} className="text-xs text-foreground">{sub.name} — {sub.quantity} {sub.unit}</p>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                            {refeicao.notes && (
                              <p className="text-xs text-muted-foreground mt-2 ml-8 border-t border-border pt-2">{refeicao.notes}</p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {dieta.supplements?.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Pill className="w-4 h-4" /> Prescrição de Suplementação
                      </p>
                      <div className="border border-border rounded-xl p-4 space-y-3">
                        {dieta.supplements.map((sup: any, si: number) => (
                          <div key={si} className="pb-3 last:pb-0 border-b border-border last:border-0">
                            <p className="font-medium text-foreground text-sm">{sup.name}</p>
                            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground mt-1">
                              {sup.dose && <span>Dose: {sup.dose}</span>}
                              {sup.schedule && <span>Horário: {sup.schedule}</span>}
                            </div>
                            {sup.notes && <p className="text-xs text-muted-foreground mt-1.5">{sup.notes}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {dieta.notes && (
                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Observações</p>
                      <p className="text-sm text-foreground">{dieta.notes}</p>
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
