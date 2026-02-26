'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import {
  getLocalDateString,
  getLocalWeekStart,
  getLocalMonthStart,
  getLocalDayOfWeek,
  formatDate,
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
  CalendarDays,
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
      ])

      setTodaySession(todayData ?? [])
      setWeek(weekData ?? [])
      setMonth(monthData ?? [])
      setGamification(gamiData ?? null)
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
      {(gamification || hasActivityToday) && (
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
                  {streak} {streak === 1 ? 'dia seguido' : 'dias seguidos'}
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
                  {gamification.total_sessions === 1 ? 'sessão' : 'sessões'} completas
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Dietas ativas ─────────────────────────────────────────────── */}
      {dietas.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Utensils className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-semibold text-foreground">Minha Dieta</span>
              </div>
              <Link
                href="/cliente/dietas"
                className="text-xs text-primary hover:opacity-90 font-medium flex items-center gap-1"
              >
                Ver dieta <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <ul className="divide-y divide-border">
              {dietas.map((dieta: any) => (
                <li key={dieta.id} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{dieta.name}</p>
                    {dieta.profiles?.full_name && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Por {dieta.profiles.full_name}
                        {dieta.sent_at ? ` · ${formatDate(dieta.sent_at)}` : ''}
                      </p>
                    )}
                  </div>
                  <Badge className="ml-3 flex-shrink-0 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border-0 text-xs">
                    Ativo
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* ── Estado zero: sem plano ────────────────────────────────────── */}
      {!hasActivePlan && dietas.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <CalendarDays className="w-10 h-10 text-muted-foreground/40" />
          <div>
            <p className="text-muted-foreground font-medium">Nenhum plano disponível ainda.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Seus planos aparecerão aqui quando o profissional enviá-los.
            </p>
          </div>
        </div>
      )}

    </div>
  )
}
