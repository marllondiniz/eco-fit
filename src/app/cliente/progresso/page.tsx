'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Flame, Trophy, Star, Target, TrendingUp, Calendar,
  Dumbbell, Zap, Award, BarChart2, Swords, ShieldCheck,
  Layers, Crown, Medal, BadgeCheck
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const XP_PER_LEVEL = 500

function getLevelInfo(xp: number) {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1
  const xpInLevel = xp % XP_PER_LEVEL
  const pct = Math.round((xpInLevel / XP_PER_LEVEL) * 100)
  return { level, xpInLevel, pct }
}

function getLevelConfig(level: number) {
  if (level <= 2) return { label: 'Iniciante', color: 'text-slate-600', bg: 'bg-slate-100 dark:bg-slate-800', bar: 'from-slate-400 to-slate-500' }
  if (level <= 5) return { label: 'Intermediário', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/60', bar: 'from-blue-400 to-blue-500' }
  if (level <= 10) return { label: 'Avançado', color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/60', bar: 'from-emerald-400 to-emerald-500' }
  if (level <= 20) return { label: 'Expert', color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/60', bar: 'from-purple-400 to-purple-500' }
  return { label: 'Elite', color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/60', bar: 'from-amber-400 to-amber-500' }
}

const DAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function getLastNDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (n - 1 - i))
    return d.toISOString().split('T')[0]
  })
}

function getMonthDays(year: number, month: number): string[] {
  const days: string[] = []
  const d = new Date(year, month, 1)
  while (d.getMonth() === month) {
    days.push(d.toISOString().split('T')[0])
    d.setDate(d.getDate() + 1)
  }
  return days
}

export default function ProgressoPage() {
  const [sessions, setSessions] = useState<any[]>([])
  const [gamification, setGamification] = useState<any>(null)
  const [workouts, setWorkouts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: sessionsData }, { data: gamiData }, { data: workoutsData }] = await Promise.all([
        supabase
          .from('workout_sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false }),
        supabase
          .from('user_gamification')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('workouts')
          .select('id, name')
          .eq('client_id', user.id)
          .eq('status', 'sent'),
      ])

      setSessions(sessionsData ?? [])
      setGamification(gamiData ?? null)
      setWorkouts(workoutsData ?? [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  // ---- Computações ----
  const levelInfo = gamification ? getLevelInfo(gamification.total_xp) : null
  const levelCfg = levelInfo ? getLevelConfig(levelInfo.level) : null

  // Mapa de datas com sessões
  const sessionByDate = new Map<string, any[]>()
  for (const s of sessions) {
    if (!sessionByDate.has(s.date)) sessionByDate.set(s.date, [])
    sessionByDate.get(s.date)!.push(s)
  }

  // Últimos 7 dias para o gráfico de frequência
  const last7 = getLastNDays(7)

  // Mês selecionado
  const monthDays = getMonthDays(selectedMonth.year, selectedMonth.month)
  const monthSessions = sessions.filter(s => s.date.startsWith(
    `${selectedMonth.year}-${String(selectedMonth.month + 1).padStart(2, '0')}`
  ))
  const monthCompleteDays = new Set(
    monthSessions.filter(s => s.is_complete).map(s => s.date)
  ).size
  const monthActiveDays = new Set(monthSessions.map(s => s.date)).size
  const monthAdherence = monthDays.length > 0 ? Math.round((monthActiveDays / monthDays.length) * 100) : 0

  // Semanas do mês (para frequência semanal)
  const weeklyFrequency: { label: string; days: number }[] = []
  let weekStart = 0
  while (weekStart < monthDays.length) {
    const weekDays = monthDays.slice(weekStart, weekStart + 7)
    const activeDays = weekDays.filter(d => sessionByDate.has(d)).length
    const startDate = new Date(weekDays[0])
    weeklyFrequency.push({
      label: `${startDate.getDate()}/${startDate.getMonth() + 1}`,
      days: activeDays,
    })
    weekStart += 7
  }

  // Histórico recente
  const recentHistory = sessions.slice(0, 10)

  // Melhor série de dias consecutivos nos dados
  const now = new Date()
  const prevMonth = now.getMonth() === 0
    ? { year: selectedMonth.year - 1, month: 11 }
    : { year: selectedMonth.year, month: selectedMonth.month - 1 }
  const nextMonth = now.getMonth() === 11
    ? { year: selectedMonth.year + 1, month: 0 }
    : { year: selectedMonth.year, month: selectedMonth.month + 1 }
  const canGoNext = new Date(nextMonth.year, nextMonth.month) <= new Date(now.getFullYear(), now.getMonth())

  // Badges/conquistas
  const badges: { Icon: LucideIcon; color: string; bg: string; label: string; desc: string }[] = []
  if (gamification?.total_sessions >= 1) badges.push({ Icon: Target, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/60', label: 'Primeiro Treino', desc: 'Completou seu primeiro treino' })
  if (gamification?.total_sessions >= 7) badges.push({ Icon: Flame, color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/60', label: 'Uma Semana', desc: '7 treinos completos' })
  if (gamification?.total_sessions >= 30) badges.push({ Icon: Swords, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/60', label: 'Um Mês', desc: '30 treinos completos' })
  if (gamification?.streak_days >= 3) badges.push({ Icon: Zap, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/60', label: 'Triplicado', desc: '3 dias seguidos' })
  if (gamification?.streak_days >= 7) badges.push({ Icon: ShieldCheck, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/60', label: 'Semana Perfeita', desc: '7 dias seguidos' })
  if (gamification?.total_xp >= 1000) badges.push({ Icon: Trophy, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/60', label: 'Mil XP', desc: '1000 XP conquistados' })
  if (levelInfo && levelInfo.level >= 5) badges.push({ Icon: Crown, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/60', label: 'Nível 5', desc: 'Alcançou o nível 5' })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Meu Progresso</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Acompanhe sua evolução, consistência e conquistas.
        </p>
      </div>

      {!gamification ? (
        <Card>
          <CardContent className="py-16 text-center">
            <BarChart2 className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">Nenhum dado ainda.</p>
            <p className="text-xs text-muted-foreground mt-1">Complete seus primeiros treinos para ver seu progresso aqui.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Cards de resumo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="col-span-2">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${levelCfg?.bg}`}>
                      <Star className={`w-5 h-5 ${levelCfg?.color}`} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Nível {levelInfo?.level}</p>
                      <p className={`text-sm font-bold ${levelCfg?.color}`}>{levelCfg?.label}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-foreground">{gamification.total_xp}</p>
                    <p className="text-xs text-muted-foreground">XP total</p>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full bg-gradient-to-r ${levelCfg?.bar} transition-all duration-700`}
                    style={{ width: `${levelInfo?.pct}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
                  <span>{levelInfo?.xpInLevel} XP</span>
                  <span>{XP_PER_LEVEL} XP para nível {(levelInfo?.level ?? 0) + 1}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <span className="text-xs text-muted-foreground">Sequência atual</span>
                </div>
                <p className="text-3xl font-bold text-foreground">{gamification.streak_days}</p>
                <p className="text-xs text-muted-foreground">{gamification.streak_days === 1 ? 'dia' : 'dias'} consecutivos</p>
                <div className="mt-2 pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">Recorde: <span className="font-semibold text-foreground">{gamification.longest_streak}d</span></p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <span className="text-xs text-muted-foreground">Sessões totais</span>
                </div>
                <p className="text-3xl font-bold text-foreground">{gamification.total_sessions}</p>
                <p className="text-xs text-muted-foreground">{gamification.total_sessions === 1 ? 'treino completo' : 'treinos completos'}</p>
              </CardContent>
            </Card>
          </div>

          {/* Frequência últimos 7 dias */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Frequência — Últimos 7 dias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-20">
                {last7.map((date) => {
                  const daySessions = sessionByDate.get(date) ?? []
                  const hasActivity = daySessions.length > 0
                  const isComplete = daySessions.some(s => s.is_complete)
                  const d = new Date(date + 'T12:00:00')
                  const isToday = date === new Date().toISOString().split('T')[0]
                  return (
                    <div key={date} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex items-end justify-center" style={{ height: 56 }}>
                        <div
                          className={`w-full rounded-t-md transition-all duration-300 ${
                            isComplete ? 'bg-emerald-500' : hasActivity ? 'bg-blue-400' : 'bg-muted'
                          }`}
                          style={{ height: isComplete ? '100%' : hasActivity ? '60%' : '8%' }}
                        />
                      </div>
                      <span className={`text-xs font-medium ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                        {DAYS_PT[d.getDay()]}
                      </span>
                    </div>
                  )
                })}
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Treino completo</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-400 inline-block" /> Treino iniciado</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-muted inline-block" /> Sem atividade</span>
              </div>
            </CardContent>
          </Card>

          {/* Calendário mensal */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Consistência Mensal
                </CardTitle>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedMonth(prevMonth)}
                    className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-muted transition-colors"
                  >
                    ‹ {MONTHS_PT[prevMonth.month]}
                  </button>
                  <span className="text-sm font-semibold text-foreground">
                    {MONTHS_PT[selectedMonth.month]} {selectedMonth.year}
                  </span>
                  {canGoNext && (
                    <button
                      onClick={() => setSelectedMonth(nextMonth)}
                      className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-muted transition-colors"
                    >
                      {MONTHS_PT[nextMonth.month]} ›
                    </button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Resumo do mês */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{monthActiveDays}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">dias ativos</p>
                </div>
                <div className="bg-muted rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-600">{monthCompleteDays}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">treinos completos</p>
                </div>
                <div className="bg-muted rounded-xl p-3 text-center">
                  <p className={`text-2xl font-bold ${monthAdherence >= 70 ? 'text-emerald-600' : monthAdherence >= 40 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                    {monthAdherence}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">adesão</p>
                </div>
              </div>

              {/* Grade do calendário */}
              <div>
                <div className="grid grid-cols-7 mb-1">
                  {DAYS_PT.map(d => (
                    <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-1">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {/* dias em branco antes do primeiro dia do mês */}
                  {Array.from({ length: new Date(monthDays[0] + 'T12:00:00').getDay() }, (_, i) => (
                    <div key={`empty-${i}`} />
                  ))}
                  {monthDays.map(date => {
                    const daySessions = sessionByDate.get(date) ?? []
                    const isComplete = daySessions.some(s => s.is_complete)
                    const hasActivity = daySessions.length > 0
                    const isToday = date === new Date().toISOString().split('T')[0]
                    const isFuture = date > new Date().toISOString().split('T')[0]
                    const dayNum = parseInt(date.split('-')[2])
                    return (
                      <div
                        key={date}
                        title={isComplete ? 'Treino completo' : hasActivity ? 'Iniciado' : isFuture ? '' : 'Sem treino'}
                        className={`aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-all ${
                          isFuture
                            ? 'text-muted-foreground/30'
                            : isComplete
                            ? 'bg-emerald-500 text-white'
                            : hasActivity
                            ? 'bg-blue-400/70 text-white'
                            : isToday
                            ? 'ring-2 ring-primary text-foreground'
                            : 'text-muted-foreground'
                        } ${isToday && !isComplete && !hasActivity ? 'font-bold' : ''}`}
                      >
                        {dayNum}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Frequência por semana */}
              {weeklyFrequency.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Dias ativos por semana</p>
                  <div className="space-y-2">
                    {weeklyFrequency.map((week, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-14 shrink-0">Sem. {i + 1}</span>
                        <div className="flex-1 bg-muted rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-primary to-emerald-400 transition-all duration-500"
                            style={{ width: `${Math.round((week.days / 7) * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-foreground w-12 text-right">{week.days}/7 dias</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Conquistas */}
          {badges.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  Conquistas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {badges.map((badge, i) => {
                    const Icon = badge.Icon
                    return (
                      <div key={i} className="flex items-center gap-3 p-3 bg-muted rounded-xl">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${badge.bg}`}>
                          <Icon className={`w-4 h-4 ${badge.color}`} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{badge.label}</p>
                          <p className="text-xs text-muted-foreground">{badge.desc}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
                {/* Conquistas bloqueadas (próximas) */}
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Próximas conquistas</p>
                  <div className="space-y-2">
                    {gamification.total_sessions < 7 && (
                      <div className="flex items-center gap-3 opacity-50">
                        <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center flex-shrink-0">
                          <Flame className="w-4 h-4 text-orange-500" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-foreground">Uma Semana — {7 - gamification.total_sessions} treinos restantes</p>
                          <div className="w-full bg-border rounded-full h-1.5 mt-1">
                            <div className="h-1.5 rounded-full bg-primary/40" style={{ width: `${(gamification.total_sessions / 7) * 100}%` }} />
                          </div>
                        </div>
                      </div>
                    )}
                    {gamification.streak_days < 7 && (
                      <div className="flex items-center gap-3 opacity-50">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center flex-shrink-0">
                          <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-foreground">Semana Perfeita — {7 - gamification.streak_days} dias seguidos restantes</p>
                          <div className="w-full bg-border rounded-full h-1.5 mt-1">
                            <div className="h-1.5 rounded-full bg-primary/40" style={{ width: `${(gamification.streak_days / 7) * 100}%` }} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Histórico */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-primary" />
                Histórico Recente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhuma sessão registrada ainda.</p>
              ) : (
                <div className="space-y-2">
                  {recentHistory.map(session => {
                    const workout = workouts.find(w => w.id === session.workout_id)
                    const d = new Date(session.date + 'T12:00:00')
                    const pct = session.total_exercises > 0
                      ? Math.round((session.completed_count / session.total_exercises) * 100)
                      : 0
                    return (
                      <div key={session.id} className="flex items-center gap-3 p-3 rounded-xl border border-border">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          session.is_complete
                            ? 'bg-emerald-100 dark:bg-emerald-900/60'
                            : 'bg-muted'
                        }`}>
                          {session.is_complete
                            ? <Trophy className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            : <Target className="w-4 h-4 text-muted-foreground" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {workout?.name ?? 'Treino'}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">
                              {d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}
                            </span>
                            <span className="text-xs text-muted-foreground">·</span>
                            <span className="text-xs text-muted-foreground">
                              {session.completed_count}/{session.total_exercises} exercícios
                            </span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={`text-sm font-bold ${pct === 100 ? 'text-emerald-600' : 'text-foreground'}`}>{pct}%</p>
                          {session.xp_earned > 0 && (
                            <p className="text-xs text-amber-500 flex items-center gap-0.5 justify-end">
                              <Zap className="w-3 h-3" />{session.xp_earned}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
