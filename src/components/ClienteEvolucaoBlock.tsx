'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getLocalDateString, getLocalWeekStart, getLocalMonthStart } from '@/lib/date-utils'
import { formatDate } from '@/lib/date-utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
} from 'lucide-react'
import Link from 'next/link'

interface ClienteEvolucaoBlockProps {
  userId: string
  treinos: any[]
  totalDietas: number
  totalTreinos: number
}

export function ClienteEvolucaoBlock({
  userId,
  treinos,
  totalDietas,
  totalTreinos,
}: ClienteEvolucaoBlockProps) {
  const [todaySession, setTodaySession] = useState<any[]>([])
  const [sessionsThisWeek, setSessionsThisWeek] = useState<any[]>([])
  const [sessionsThisMonth, setSessionsThisMonth] = useState<any[]>([])
  const [gamification, setGamification] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const today = getLocalDateString()
      const weekStart = getLocalWeekStart()
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
      setSessionsThisWeek(weekData ?? [])
      setSessionsThisMonth(monthData ?? [])
      setGamification(gamiData ?? null)
      setLoading(false)
    }
    load()
  }, [userId])

  const weeklyComplete = sessionsThisWeek.filter(s => s.is_complete).length
  const monthComplete = sessionsThisMonth.filter(s => s.is_complete).length
  const now = new Date()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const monthAdherence = Math.round((monthComplete / daysInMonth) * 100)

  const todayDone = todaySession.reduce((acc, s) => acc + (s.completed_count ?? 0), 0)
  const todayTotal = todaySession.reduce((acc, s) => acc + (s.total_exercises ?? 0), 0)
  const todayPct = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0
  const hasActivityToday = todaySession.length > 0

  const streak = gamification?.streak_days ?? 0
  const totalXP = gamification?.total_xp ?? 0
  const level = gamification?.level ?? 1

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-950/30 dark:to-blue-950/30 p-5 flex items-center justify-center min-h-[180px]">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <>
      {/* Bloco de progresso motivador — dados com data local */}
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

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/70 dark:bg-card/60 rounded-xl p-3 col-span-2 sm:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-medium">Treino de hoje</span>
                {hasActivityToday ? (
                  <span className="text-xs font-bold text-foreground">{todayPct}%</span>
                ) : (
                  <span className="text-xs text-muted-foreground">Não iniciado</span>
                )}
              </div>
              <div className="w-full bg-muted rounded-full h-2 mb-1">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    todayPct === 100
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                      : 'bg-gradient-to-r from-blue-500 to-blue-400'
                  }`}
                  style={{ width: `${todayPct}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {hasActivityToday
                  ? `${todayDone} de ${todayTotal} exercícios`
                  : 'Vamos começar?'}
              </p>
            </div>

            <div className="bg-white/70 dark:bg-card/60 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Dumbbell className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-xs text-muted-foreground">Esta semana</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{weeklyComplete}</p>
              <p className="text-xs text-muted-foreground">
                {weeklyComplete === 1 ? 'treino feito' : 'treinos feitos'}
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

          <div className="flex items-center gap-4 pt-1 flex-wrap">
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

      {/* Treinos recentes — usa todaySession com data local */}
      {totalTreinos > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Meus Treinos</CardTitle>
              <Link
                href="/cliente/treinos"
                className="text-xs text-primary hover:opacity-90 font-medium flex items-center gap-1"
              >
                Ver todos <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="divide-y divide-border">
              {treinos.map((treino: any) => {
                const todaySess = todaySession.find(s => s.workout_id === treino.id)
                const exTotal = treino.workout_exercises?.length ?? 0
                const exDone = todaySess?.completed_count ?? 0
                const pct = exTotal > 0 ? Math.round((exDone / exTotal) * 100) : 0

                return (
                  <li key={treino.id} className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{treino.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {treino.profiles?.full_name && `Por ${treino.profiles.full_name} · `}
                          {treino.sent_at && formatDate(treino.sent_at)}
                        </p>
                      </div>
                      <Badge className="ml-3 flex-shrink-0 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border-0 text-xs">
                        {todaySess?.is_complete ? (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Feito hoje
                          </span>
                        ) : (
                          'Ativo'
                        )}
                      </Badge>
                    </div>
                    {exTotal > 0 && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">
                            Hoje: {exDone}/{exTotal} exercícios
                          </span>
                          <span className="text-xs font-medium text-foreground">{pct}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all duration-500 ${
                              pct === 100 ? 'bg-emerald-500' : 'bg-blue-400'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </>
  )
}
