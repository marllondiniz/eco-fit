'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import {
  getLocalDateString,
  getLocalWeekStart,
  getLocalMonthStart,
  getLocalDayOfWeek,
} from '@/lib/date-utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Utensils,
  Dumbbell,
  ArrowRight,
  Flame,
  Trophy,
  TrendingUp,
  Target,
  Zap,
  CheckCircle2,
  MoonStar,
  Activity,
} from 'lucide-react'
import Link from 'next/link'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ClienteEvolucaoBlockProps {
  userId: string
  treinos: any[]
  dietas?: any[]
  scheduleMap: Record<string, string | null>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DIAS_LABEL: Record<string, string> = {
  mon: 'segunda', tue: 'terça', wed: 'quarta',
  thu: 'quinta', fri: 'sexta', sat: 'sábado', sun: 'domingo',
}
const DIAS_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

function getProximoTreino(
  scheduleMap: Record<string, string | null>,
  todayDow: string,
): { dow: string; label: string } | null {
  const startIdx = DIAS_ORDER.indexOf(todayDow)
  for (let i = 1; i <= 7; i++) {
    const dow = DIAS_ORDER[(startIdx + i) % 7]
    const label = scheduleMap[dow]
    if (label) return { dow, label }
  }
  return null
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function ClienteEvolucaoBlock({
  userId,
  treinos,
  dietas = [],
  scheduleMap,
}: ClienteEvolucaoBlockProps) {
  const [todaySession, setTodaySession]     = useState<any[]>([])
  const [sessionsThisWeek, setWeek]         = useState<any[]>([])
  const [sessionsThisMonth, setMonth]       = useState<any[]>([])
  const [gamification, setGamification]    = useState<any>(null)
  const [loading, setLoading]               = useState(true)

  // Resolver treino do dia no cliente (timezone certa)
  const todayDow   = getLocalDayOfWeek()
  const todayLabel = scheduleMap[todayDow] ?? null

  const treinoDoDia = useMemo(() => {
    if (!todayLabel) return null
    return treinos.find((t: any) => t.label === todayLabel) ?? null
  }, [todayLabel, treinos])

  const hasSchedule    = Object.keys(scheduleMap).length > 0
  const hasActivePlan  = treinos.length > 0
  const hojeDescanso   = hasActivePlan && !treinoDoDia
  const proximoTreino  = hojeDescanso ? getProximoTreino(scheduleMap, todayDow) : null

  const [todayDietSession, setTodayDietSession] = useState<any>(null)
  const [cardioPlan, setCardioPlan] = useState<any>(null)
  const [cardioSessionToday, setCardioSessionToday] = useState<any>(null)

  useEffect(() => {
    async function load() {
      const today      = getLocalDateString()
      const weekStart  = getLocalWeekStart()
      const monthStart = getLocalMonthStart()

      const [
        { data: todayData },
        { data: weekData },
        { data: monthData },
        { data: gamiData },
        { data: dietTodayData },
        { data: cardioPlanData },
        { data: cardioTodayData },
      ] = await Promise.all([
        supabase
          .from('workout_sessions')
          .select('workout_id, completed_count, total_exercises, is_complete')
          .eq('user_id', userId)
          .eq('date', today),
        supabase
          .from('workout_sessions')
          .select('id, date, is_complete')
          .eq('user_id', userId)
          .gte('date', weekStart)
          .lte('date', today),
        supabase
          .from('workout_sessions')
          .select('id, date, is_complete, completed_count, total_exercises')
          .eq('user_id', userId)
          .gte('date', monthStart)
          .lte('date', today),
        supabase.from('user_gamification').select('*').eq('user_id', userId).maybeSingle(),
        supabase
          .from('diet_sessions')
          .select('*')
          .eq('user_id', userId)
          .eq('date', today)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('cardio_plans')
          .select('id, prescription')
          .eq('client_id', userId)
          .eq('status', 'sent')
          .or(`end_date.is.null,end_date.gte.${today}`)
          .order('sent_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('cardio_sessions')
          .select('*')
          .eq('user_id', userId)
          .eq('date', today),
      ])

      const plan = cardioPlanData ?? null
      const sessionsToday = (cardioTodayData ?? []) as any[]
      const sessionForPlan = plan
        ? sessionsToday.find((s: any) => s.cardio_plan_id === plan.id) ?? null
        : null

      setTodaySession(todayData ?? [])
      setWeek(weekData ?? [])
      setMonth(monthData ?? [])
      setGamification(gamiData ?? null)
      setTodayDietSession(dietTodayData ?? null)
      setCardioPlan(plan)
      setCardioSessionToday(sessionForPlan)
      setLoading(false)
    }
    load()
  }, [userId])

  // Métricas
  const today            = getLocalDateString()
  const weeklyComplete   = sessionsThisWeek.filter(s => s.is_complete).length
  const weeklyTarget     = gamification?.weekly_target_sessions ?? 0
  const weeklyPct        = weeklyTarget > 0 ? Math.min(100, Math.round((weeklyComplete / weeklyTarget) * 100)) : 0
  const monthComplete    = sessionsThisMonth.filter(s => s.is_complete).length
  const daysInMonth      = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
  const monthAdherence   = Math.round((monthComplete / daysInMonth) * 100)
  const streak           = gamification?.streak_days ?? 0
  const totalXP          = gamification?.total_xp ?? 0
  const level            = gamification?.level ?? 1
  const hasActivityToday = todaySession.length > 0
  const dietStreak       = gamification?.diet_streak_days ?? 0
  const totalDietDays    = gamification?.total_diet_sessions ?? 0
  const dietHojeDone     = todayDietSession?.is_complete ?? false
  const dietMealsDone    = todayDietSession?.completed_count ?? 0
  const dietMealsTotal   = todayDietSession?.total_meals ?? 0
  const dietPctHoje      = dietMealsTotal > 0 ? Math.round((dietMealsDone / dietMealsTotal) * 100) : 0

  // Progresso do treino de hoje
  const todaySessForTreino = treinoDoDia
    ? todaySession.find(s => s.workout_id === treinoDoDia.id)
    : null
  const totalEx   = treinoDoDia?.workout_exercises?.length ?? 0
  const doneEx    = todaySessForTreino?.completed_count ?? 0
  const pctHoje   = totalEx > 0 ? Math.round((doneEx / totalEx) * 100) : 0
  const doneHoje  = todaySessForTreino?.is_complete ?? false

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border bg-muted/30 animate-pulse h-40" />
        <div className="rounded-xl border bg-muted/30 animate-pulse h-28" />
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* ── Treino de hoje ────────────────────────────────────────────── */}
      {!hasActivePlan ? (
        <Card>
          <CardContent className="py-12 text-center space-y-2">
            <Dumbbell className="w-10 h-10 text-muted-foreground/40 mx-auto" />
            <p className="text-muted-foreground font-medium">Nenhum plano ativo ainda.</p>
            <p className="text-sm text-muted-foreground">Seu profissional enviará um plano em breve.</p>
            <Link
              href="/cliente/treinos"
              className="inline-flex items-center gap-1.5 text-sm text-primary font-medium mt-1 hover:opacity-80"
            >
              Ver meus treinos <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardContent>
        </Card>
      ) : hojeDescanso ? (
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
              <MoonStar className="w-6 h-6 text-slate-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Hoje</p>
              <p className="text-lg font-bold text-foreground">Dia de descanso</p>
              {proximoTreino && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  Próximo treino: <span className="font-medium text-foreground">Treino {proximoTreino.label}</span>
                  {' '}({DIAS_LABEL[proximoTreino.dow]})
                </p>
              )}
            </div>
            <Link
              href="/cliente/treinos"
              className="text-xs text-primary font-medium hover:opacity-80 flex items-center gap-1 flex-shrink-0"
            >
              Ver plano <ArrowRight className="w-3 h-3" />
            </Link>
          </CardContent>
        </Card>
      ) : treinoDoDia ? (
        <Card className={doneHoje
          ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20'
          : 'border-primary/20 bg-primary/5'
        }>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 ${
                  doneHoje
                    ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400'
                    : 'bg-primary/15 text-primary'
                }`}>
                  {doneHoje ? <CheckCircle2 className="w-6 h-6" /> : treinoDoDia.label}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Treino de hoje
                  </p>
                  <p className="text-base font-bold text-foreground truncate">{treinoDoDia.name}</p>
                </div>
              </div>
              {doneHoje ? (
                <Badge className="bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border-0 flex-shrink-0">
                  Concluído ✓
                </Badge>
              ) : (
                <span className="text-sm font-bold text-primary flex-shrink-0">{pctHoje}%</span>
              )}
            </div>

            {/* Barra de progresso */}
            {totalEx > 0 && (
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                  <span>{doneEx} de {totalEx} exercícios</span>
                  {!doneHoje && <span>Faltam {totalEx - doneEx}</span>}
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      doneHoje
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                        : 'bg-gradient-to-r from-primary to-primary/70'
                    }`}
                    style={{ width: `${pctHoje}%` }}
                  />
                </div>
              </div>
            )}

            <Link
              href="/cliente/treinos"
              className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 ${
                doneHoje
                  ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                  : 'bg-primary text-primary-foreground'
              }`}
            >
              {doneHoje ? 'Ver treino completo' : 'Ir para o treino de hoje'}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {/* ── Métricas de evolução ──────────────────────────────────────── */}
      {(gamification || hasActivityToday || totalDietDays > 0 || dietStreak > 0) && (
        <div className="bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-950/30 dark:to-blue-950/30 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Sua Evolução
            </h3>
            <Link
              href="/cliente/progresso"
              className="text-xs font-medium text-primary hover:opacity-90 flex items-center gap-1"
            >
              Ver detalhes <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/70 dark:bg-card/60 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Dumbbell className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-xs text-muted-foreground">Esta semana</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {weeklyTarget > 0 ? `${weeklyComplete}/${weeklyTarget}` : weeklyComplete}
              </p>
              <p className="text-xs text-muted-foreground">
                {weeklyTarget > 0 ? `${weeklyPct}% da meta` : weeklyComplete === 1 ? 'treino' : 'treinos'}
              </p>
            </div>

            <div className="bg-white/70 dark:bg-card/60 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Target className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-xs text-muted-foreground">No mês</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{monthAdherence}%</p>
              <p className="text-xs text-muted-foreground">de adesão</p>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            {streak > 0 && (
              <div className="flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-xs font-semibold text-foreground">
                  {streak} {streak === 1 ? 'dia seguido' : 'dias seguidos'} treino
                </span>
              </div>
            )}
            {dietStreak > 0 && (
              <div className="flex items-center gap-1.5">
                <Utensils className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-semibold text-foreground">
                  {dietStreak} {dietStreak === 1 ? 'dia seguido' : 'dias seguidos'} dieta
                </span>
              </div>
            )}
            {totalXP > 0 && (
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-semibold text-foreground">
                  {totalXP} XP · Nível {level}
                </span>
              </div>
            )}
            {gamification?.total_sessions > 0 && (
              <div className="flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-semibold text-foreground">
                  {gamification.total_sessions}{' '}
                  {gamification.total_sessions === 1 ? 'sessão' : 'sessões'} treino
                </span>
              </div>
            )}
            {totalDietDays > 0 && (
              <div className="flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-semibold text-foreground">
                  {totalDietDays} {totalDietDays === 1 ? 'dia' : 'dias'} dieta cumpridos
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Cardio hoje (mesmo layout do Treino de hoje) ─────────────────── */}
      {cardioPlan && (
        <Card className={cardioSessionToday?.is_complete
          ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20'
          : 'border-primary/20 bg-primary/5'
        }>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${
                  cardioSessionToday?.is_complete
                    ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400'
                    : 'bg-primary/15 text-primary'
                }`}>
                  {cardioSessionToday?.is_complete ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <Activity className="w-6 h-6" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Cardio de hoje
                  </p>
                  <p className="text-base font-bold text-foreground line-clamp-2">
                    {cardioPlan.prescription || 'Sem descrição.'}
                  </p>
                </div>
              </div>
              {cardioSessionToday?.is_complete ? (
                <Badge className="bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border-0 flex-shrink-0">
                  Concluído ✓
                </Badge>
              ) : (
                <span className="text-sm font-bold text-primary flex-shrink-0">0%</span>
              )}
            </div>

            {/* Barra de progresso (igual ao treino: 0 de 1 / 1 de 1) */}
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                <span>
                  {cardioSessionToday?.is_complete ? '1 de 1 atividade' : '0 de 1 atividade'}
                </span>
                {!cardioSessionToday?.is_complete && <span>Falta 1</span>}
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    cardioSessionToday?.is_complete
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                      : 'bg-gradient-to-r from-primary to-primary/70'
                  }`}
                  style={{ width: cardioSessionToday?.is_complete ? '100%' : '0%' }}
                />
              </div>
            </div>

            <Link
              href="/cliente/cardio"
              className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 ${
                cardioSessionToday?.is_complete
                  ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                  : 'bg-primary text-primary-foreground'
              }`}
            >
              {cardioSessionToday?.is_complete ? 'Ver cardio completo' : 'Ir para o cardio de hoje'}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </CardContent>
        </Card>
      )}

      {/* ── Dieta de hoje (mesmo layout do Treino e Cardio) ───────────────── */}
      {dietas.length > 0 && (
        <Card className={dietHojeDone
          ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20'
          : 'border-primary/20 bg-primary/5'
        }>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${
                  dietHojeDone
                    ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400'
                    : 'bg-primary/15 text-primary'
                }`}>
                  {dietHojeDone ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <Utensils className="w-6 h-6" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Dieta de hoje
                  </p>
                  <p className="text-base font-bold text-foreground truncate">
                    {dietas[0]?.name ?? 'Minha Dieta'}
                  </p>
                </div>
              </div>
              {dietHojeDone ? (
                <Badge className="bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border-0 flex-shrink-0">
                  Concluído ✓
                </Badge>
              ) : (
                <span className="text-sm font-bold text-primary flex-shrink-0">
                  {dietMealsTotal > 0 ? `${dietPctHoje}%` : '0%'}
                </span>
              )}
            </div>

            {/* Barra de progresso (igual ao treino/cardio) */}
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                <span>
                  {dietMealsTotal > 0
                    ? `${dietMealsDone} de ${dietMealsTotal} refeições`
                    : '0 de 0 refeições'}
                </span>
                {!dietHojeDone && dietMealsTotal > 0 && (
                  <span>Faltam {dietMealsTotal - dietMealsDone}</span>
                )}
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    dietHojeDone
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                      : 'bg-gradient-to-r from-primary to-primary/70'
                  }`}
                  style={{ width: `${dietMealsTotal > 0 ? (dietHojeDone ? 100 : dietPctHoje) : 0}%` }}
                />
              </div>
            </div>

            <Link
              href="/cliente/dietas"
              className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 ${
                dietHojeDone
                  ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                  : 'bg-primary text-primary-foreground'
              }`}
            >
              {dietHojeDone ? 'Ver dieta completa' : 'Ir para a dieta de hoje'}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </CardContent>
        </Card>
      )}

    </div>
  )
}
