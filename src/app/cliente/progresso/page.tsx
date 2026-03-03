'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getLocalDateString, getLocalWeekStart } from '@/lib/date-utils'
import {
  Flame, Trophy, Target, TrendingUp, Calendar,
  Dumbbell, Zap, Award, ShieldCheck, Utensils,
  Swords, Star, CheckCircle2, ChevronLeft, ChevronRight,
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
  if (level <= 2) return { label: 'Iniciante',    color: 'text-slate-500',                    bar: 'bg-slate-400' }
  if (level <= 5) return { label: 'Intermediário', color: 'text-blue-600 dark:text-blue-400',  bar: 'bg-blue-500' }
  if (level <= 10) return { label: 'Avançado',    color: 'text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500' }
  if (level <= 20) return { label: 'Expert',      color: 'text-purple-600 dark:text-purple-400',   bar: 'bg-purple-500' }
  return                  { label: 'Elite',        color: 'text-amber-500',                    bar: 'bg-amber-500' }
}

const DAYS_PT  = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const MONTHS_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function getLastNDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (n - 1 - i))
    return getLocalDateString(d)
  })
}

function getMonthDays(year: number, month: number): string[] {
  const days: string[] = []
  const d = new Date(year, month, 1)
  while (d.getMonth() === month) {
    days.push(getLocalDateString(d))
    d.setDate(d.getDate() + 1)
  }
  return days
}

export default function ProgressoPage() {
  const [sessions,     setSessions]     = useState<any[]>([])
  const [dietSessions, setDietSessions] = useState<any[]>([])
  const [gamification, setGamification] = useState<any>(null)
  const [workouts,     setWorkouts]     = useState<any[]>([])
  const [diets,        setDiets]        = useState<any[]>([])
  const [loading,      setLoading]      = useState(true)
  const [activeTab,    setActiveTab]    = useState<'treino' | 'dieta'>('treino')
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [
        { data: sessionsData },
        { data: dietSessionsData },
        { data: gamiData },
        { data: workoutsData },
        { data: dietsData },
      ] = await Promise.all([
        supabase.from('workout_sessions').select('*').eq('user_id', user.id).order('date', { ascending: false }),
        supabase.from('diet_sessions').select('*').eq('user_id', user.id).order('date', { ascending: false }),
        supabase.from('user_gamification').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('workouts').select('id, name').eq('client_id', user.id).eq('status', 'sent'),
        supabase.from('diets').select('id, name').eq('client_id', user.id).eq('status', 'sent'),
      ])

      setSessions(sessionsData ?? [])
      setDietSessions(dietSessionsData ?? [])
      setGamification(gamiData ?? null)
      setWorkouts(workoutsData ?? [])
      setDiets(dietsData ?? [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-28 rounded-2xl bg-muted" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-20 rounded-2xl bg-muted" />
          <div className="h-20 rounded-2xl bg-muted" />
        </div>
        <div className="h-48 rounded-2xl bg-muted" />
      </div>
    )
  }

  // ── Computações ──────────────────────────────────────────────────────────────
  const g = gamification ?? {
    total_xp: 0, streak_days: 0, total_sessions: 0, weekly_target_sessions: 0,
    longest_streak: 0, total_diet_sessions: 0, diet_streak_days: 0, longest_diet_streak: 0,
  }

  const today      = getLocalDateString()
  const weekStart  = getLocalWeekStart()
  const levelInfo  = getLevelInfo(g.total_xp ?? 0)
  const levelCfg   = getLevelConfig(levelInfo.level)
  const sessionsThisWeek = sessions.filter(s => s.date >= weekStart && s.date <= today && s.is_complete).length
  const weeklyTarget = g.weekly_target_sessions ?? 0
  const weeklyPct  = weeklyTarget > 0 ? Math.min(100, Math.round((sessionsThisWeek / weeklyTarget) * 100)) : 0
  const hasAnyData = !!gamification || dietSessions.length > 0

  // Mapas por data
  const sessionByDate     = new Map<string, any[]>()
  const dietSessionByDate = new Map<string, any[]>()
  for (const s of sessions)     { if (!sessionByDate.has(s.date)) sessionByDate.set(s.date, []); sessionByDate.get(s.date)!.push(s) }
  for (const s of dietSessions) { if (!dietSessionByDate.has(s.date)) dietSessionByDate.set(s.date, []); dietSessionByDate.get(s.date)!.push(s) }

  // Últimos 7 dias
  const last7 = getLastNDays(7)

  // Calendário mensal
  const now = new Date()
  const prevMonth = selectedMonth.month === 0
    ? { year: selectedMonth.year - 1, month: 11 }
    : { year: selectedMonth.year, month: selectedMonth.month - 1 }
  const nextMonth = selectedMonth.month === 11
    ? { year: selectedMonth.year + 1, month: 0 }
    : { year: selectedMonth.year, month: selectedMonth.month + 1 }
  const canGoNext = new Date(nextMonth.year, nextMonth.month) <= new Date(now.getFullYear(), now.getMonth())

  const monthDays = getMonthDays(selectedMonth.year, selectedMonth.month)
  const monthSessionsForTab = (activeTab === 'treino' ? sessions : dietSessions).filter(s =>
    s.date.startsWith(`${selectedMonth.year}-${String(selectedMonth.month + 1).padStart(2, '0')}`)
  )
  const monthCompleteDays = new Set(monthSessionsForTab.filter(s => s.is_complete).map(s => s.date)).size
  const monthActiveDays   = new Set(monthSessionsForTab.map(s => s.date)).size
  const monthAdherence    = monthDays.length > 0 ? Math.round((monthActiveDays / monthDays.length) * 100) : 0

  // Badges
  const badges: { Icon: LucideIcon; color: string; bg: string; label: string; desc: string }[] = []
  if (g.total_sessions >= 1)           badges.push({ Icon: Target,     color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/50', label: 'Primeiro Treino',  desc: '1 treino completo' })
  if (g.total_sessions >= 7)           badges.push({ Icon: Flame,      color: 'text-orange-500',                       bg: 'bg-orange-100 dark:bg-orange-900/50',   label: 'Uma Semana',      desc: '7 treinos completos' })
  if (g.total_sessions >= 30)          badges.push({ Icon: Swords,     color: 'text-blue-500 dark:text-blue-400',      bg: 'bg-blue-100 dark:bg-blue-900/50',       label: 'Um Mês',          desc: '30 treinos completos' })
  if (g.streak_days >= 3)              badges.push({ Icon: Zap,        color: 'text-amber-500',                        bg: 'bg-amber-100 dark:bg-amber-900/50',     label: 'Em Chamas',       desc: '3 dias seguidos' })
  if (g.streak_days >= 7)              badges.push({ Icon: ShieldCheck, color: 'text-purple-500 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/50',   label: 'Semana Perfeita', desc: '7 dias seguidos' })
  if (g.total_xp >= 1000)             badges.push({ Icon: Trophy,     color: 'text-amber-500',                        bg: 'bg-amber-100 dark:bg-amber-900/50',     label: 'Mil XP',          desc: '1000 XP' })
  if (levelInfo.level >= 5)           badges.push({ Icon: Star,       color: 'text-yellow-500',                       bg: 'bg-yellow-100 dark:bg-yellow-900/50',   label: 'Nível 5',         desc: 'Alcançou nível 5' })
  if ((g.total_diet_sessions ?? 0) >= 7) badges.push({ Icon: Utensils, color: 'text-teal-500 dark:text-teal-400',    bg: 'bg-teal-100 dark:bg-teal-900/50',       label: '7 Dias Dieta',    desc: '7 dias completos' })
  if ((g.diet_streak_days ?? 0) >= 7)  badges.push({ Icon: CheckCircle2, color: 'text-teal-500 dark:text-teal-400',  bg: 'bg-teal-100 dark:bg-teal-900/50',       label: 'Semana Dieta',    desc: '7 dias seguidos dieta' })

  const hasDietData = dietSessions.length > 0

  return (
    <div className="space-y-5 pb-4">

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-xl font-bold text-foreground">Meu Progresso</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Evolução, consistência e conquistas</p>
      </div>

      {!hasAnyData ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <TrendingUp className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-medium text-muted-foreground">Nenhum dado ainda</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Complete seus primeiros treinos e dietas para ver o progresso aqui.</p>
        </div>
      ) : (
        <>
          {/* ── XP & Nível ──────────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Nível {levelInfo.level}</p>
                <p className={`text-lg font-bold ${levelCfg.color}`}>{levelCfg.label}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-foreground">{g.total_xp.toLocaleString('pt-BR')}</p>
                <p className="text-xs text-muted-foreground">XP total</p>
              </div>
            </div>
            <div className="space-y-1">
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div className={`h-2 rounded-full transition-all duration-700 ${levelCfg.bar}`} style={{ width: `${levelInfo.pct}%` }} />
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>{levelInfo.xpInLevel} XP neste nível</span>
                <span>{XP_PER_LEVEL - levelInfo.xpInLevel} XP para o nível {levelInfo.level + 1}</span>
              </div>
            </div>
          </div>

          {/* ── Stats rápidos ───────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            {/* Streak treino */}
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-xs text-muted-foreground font-medium">Sequência treino</span>
              </div>
              <p className="text-3xl font-bold text-foreground">{g.streak_days}</p>
              <p className="text-xs text-muted-foreground">{g.streak_days === 1 ? 'dia' : 'dias'} seguidos</p>
              <p className="text-xs text-muted-foreground mt-1.5">Recorde: <span className="font-semibold text-foreground">{g.longest_streak}d</span></p>
            </div>

            {/* Total treinos */}
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-muted-foreground font-medium">Treinos totais</span>
              </div>
              <p className="text-3xl font-bold text-foreground">{g.total_sessions}</p>
              <p className="text-xs text-muted-foreground">{g.total_sessions === 1 ? 'sessão completa' : 'sessões completas'}</p>
              {weeklyTarget > 0 && (
                <div className="mt-2 pt-2 border-t border-border">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Meta da semana</span>
                    <span className="font-semibold text-foreground">{sessionsThisWeek}/{weeklyTarget}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${weeklyPct}%` }} />
                  </div>
                </div>
              )}
            </div>

            {/* Stats dieta — mostra somente se tem dados */}
            {hasDietData && (
              <>
                <div className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Utensils className="w-4 h-4 text-teal-500" />
                    <span className="text-xs text-muted-foreground font-medium">Sequência dieta</span>
                  </div>
                  <p className="text-3xl font-bold text-foreground">{g.diet_streak_days ?? 0}</p>
                  <p className="text-xs text-muted-foreground">{(g.diet_streak_days ?? 0) === 1 ? 'dia' : 'dias'} seguidos</p>
                  <p className="text-xs text-muted-foreground mt-1.5">Recorde: <span className="font-semibold text-foreground">{g.longest_diet_streak ?? 0}d</span></p>
                </div>

                <div className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-500" />
                    <span className="text-xs text-muted-foreground font-medium">Dias de dieta</span>
                  </div>
                  <p className="text-3xl font-bold text-foreground">{g.total_diet_sessions ?? 0}</p>
                  <p className="text-xs text-muted-foreground">{(g.total_diet_sessions ?? 0) === 1 ? 'dia cumprido' : 'dias cumpridos'}</p>
                </div>
              </>
            )}
          </div>

          {/* ── Últimos 7 dias ─────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Últimos 7 dias
              </p>
              {hasDietData && (
                <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                  <button
                    onClick={() => setActiveTab('treino')}
                    className={`text-xs px-3 py-1 rounded-md font-medium transition-all ${activeTab === 'treino' ? 'bg-card shadow text-foreground' : 'text-muted-foreground'}`}
                  >
                    Treino
                  </button>
                  <button
                    onClick={() => setActiveTab('dieta')}
                    className={`text-xs px-3 py-1 rounded-md font-medium transition-all ${activeTab === 'dieta' ? 'bg-card shadow text-foreground' : 'text-muted-foreground'}`}
                  >
                    Dieta
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-end gap-2" style={{ height: 72 }}>
              {last7.map((date) => {
                const isToday = date === today
                const daySessions = activeTab === 'treino'
                  ? (sessionByDate.get(date) ?? [])
                  : (dietSessionByDate.get(date) ?? [])
                const isComplete  = daySessions.some(s => s.is_complete)
                const hasActivity = daySessions.length > 0
                const d = new Date(date + 'T12:00:00')

                const barColor = activeTab === 'treino'
                  ? (isComplete ? 'bg-emerald-500' : hasActivity ? 'bg-primary/60' : 'bg-muted')
                  : (isComplete ? 'bg-teal-500'    : hasActivity ? 'bg-teal-400/60' : 'bg-muted')

                const barH = isComplete ? '100%' : hasActivity ? '55%' : '8%'

                return (
                  <div key={date} className="flex-1 flex flex-col items-center gap-1.5">
                    <div className="w-full flex items-end rounded-t-sm overflow-hidden" style={{ height: 52 }}>
                      <div className={`w-full rounded-t-md transition-all duration-300 ${barColor}`} style={{ height: barH }} />
                    </div>
                    <span className={`text-[11px] font-medium ${isToday ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                      {DAYS_PT[d.getDay()]}
                    </span>
                  </div>
                )
              })}
            </div>

            <div className="flex items-center gap-4 mt-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-sm inline-block ${activeTab === 'treino' ? 'bg-emerald-500' : 'bg-teal-500'}`} />
                Completo
              </span>
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-sm inline-block ${activeTab === 'treino' ? 'bg-primary/60' : 'bg-teal-400/60'}`} />
                Iniciado
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm bg-muted inline-block" />
                Sem atividade
              </span>
            </div>
          </div>

          {/* ── Calendário mensal ──────────────────────────────────────────── */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            {/* Cabeçalho */}
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Consistência
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedMonth(prevMonth)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                </button>
                <span className="text-xs font-semibold text-foreground min-w-[110px] text-center">
                  {MONTHS_PT[selectedMonth.month]} {selectedMonth.year}
                </span>
                {canGoNext ? (
                  <button
                    onClick={() => setSelectedMonth(nextMonth)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                ) : (
                  <div className="w-7 h-7" />
                )}
              </div>
            </div>

            {/* Resumo do mês */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-muted rounded-xl py-2.5">
                <p className="text-xl font-bold text-foreground">{monthActiveDays}</p>
                <p className="text-[10px] text-muted-foreground">dias ativos</p>
              </div>
              <div className="bg-muted rounded-xl py-2.5">
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{monthCompleteDays}</p>
                <p className="text-[10px] text-muted-foreground">completos</p>
              </div>
              <div className="bg-muted rounded-xl py-2.5">
                <p className={`text-xl font-bold ${monthAdherence >= 70 ? 'text-emerald-600 dark:text-emerald-400' : monthAdherence >= 40 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                  {monthAdherence}%
                </p>
                <p className="text-[10px] text-muted-foreground">adesão</p>
              </div>
            </div>

            {/* Grade */}
            <div>
              <div className="grid grid-cols-7 mb-1.5">
                {DAYS_PT.map(d => (
                  <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-0.5">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: new Date(monthDays[0] + 'T12:00:00').getDay() }, (_, i) => (
                  <div key={`e-${i}`} />
                ))}
                {monthDays.map(date => {
                  const isToday   = date === today
                  const isFuture  = date > today
                  const daySess   = activeTab === 'treino' ? (sessionByDate.get(date) ?? []) : (dietSessionByDate.get(date) ?? [])
                  const isComplete  = daySess.some(s => s.is_complete)
                  const hasActivity = daySess.length > 0
                  const dayNum    = parseInt(date.split('-')[2])

                  const dayClass = isFuture
                    ? 'text-muted-foreground/25'
                    : isComplete
                      ? activeTab === 'treino'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-teal-500 text-white'
                      : hasActivity
                        ? 'bg-primary/20 text-primary font-semibold'
                        : isToday
                          ? 'ring-1 ring-primary text-foreground font-bold'
                          : 'text-muted-foreground'

                  return (
                    <div
                      key={date}
                      className={`aspect-square rounded-lg flex items-center justify-center text-[11px] font-medium transition-all ${dayClass}`}
                    >
                      {dayNum}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Legenda da aba ativa */}
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-sm inline-block ${activeTab === 'treino' ? 'bg-emerald-500' : 'bg-teal-500'}`} />
                Completo
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm bg-primary/20 inline-block" />
                Em progresso
              </span>
            </div>

            {hasDietData && (
              <div className="flex items-center justify-center gap-1 bg-muted rounded-xl p-1">
                <button
                  onClick={() => setActiveTab('treino')}
                  className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition-all ${activeTab === 'treino' ? 'bg-card shadow text-foreground' : 'text-muted-foreground'}`}
                >
                  Treino
                </button>
                <button
                  onClick={() => setActiveTab('dieta')}
                  className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition-all ${activeTab === 'dieta' ? 'bg-card shadow text-foreground' : 'text-muted-foreground'}`}
                >
                  Dieta
                </button>
              </div>
            )}
          </div>

          {/* ── Conquistas ──────────────────────────────────────────────────── */}
          {badges.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                Conquistas
              </p>
              <div className="grid grid-cols-2 gap-2">
                {badges.map((badge, i) => {
                  const Icon = badge.Icon
                  return (
                    <div key={i} className={`flex items-center gap-2.5 p-3 rounded-xl ${badge.bg}`}>
                      <Icon className={`w-5 h-5 flex-shrink-0 ${badge.color}`} />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{badge.label}</p>
                        <p className="text-[10px] text-muted-foreground">{badge.desc}</p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Próximas conquistas */}
              {(g.total_sessions < 30 || g.streak_days < 7) && (
                <div className="space-y-2.5 pt-2 border-t border-border">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">A desbloquear</p>
                  {g.total_sessions < 7 && (
                    <NextBadge Icon={Flame} label="Uma Semana" current={g.total_sessions} goal={7} color="text-orange-500" bg="bg-orange-100 dark:bg-orange-900/40" />
                  )}
                  {g.total_sessions >= 7 && g.total_sessions < 30 && (
                    <NextBadge Icon={Swords} label="Um Mês" current={g.total_sessions} goal={30} color="text-blue-500" bg="bg-blue-100 dark:bg-blue-900/40" />
                  )}
                  {g.streak_days < 7 && (
                    <NextBadge Icon={ShieldCheck} label="Semana Perfeita" current={g.streak_days} goal={7} color="text-purple-500" bg="bg-purple-100 dark:bg-purple-900/40" />
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Histórico recente ───────────────────────────────────────────── */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                {activeTab === 'treino'
                  ? <><Dumbbell className="w-4 h-4 text-primary" /> Histórico de treinos</>
                  : <><Utensils className="w-4 h-4 text-teal-500" /> Histórico de dieta</>
                }
              </p>
              {hasDietData && (
                <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                  <button onClick={() => setActiveTab('treino')} className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition-all ${activeTab === 'treino' ? 'bg-card shadow text-foreground' : 'text-muted-foreground'}`}>Treino</button>
                  <button onClick={() => setActiveTab('dieta')}  className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition-all ${activeTab === 'dieta'  ? 'bg-card shadow text-foreground' : 'text-muted-foreground'}`}>Dieta</button>
                </div>
              )}
            </div>

            {activeTab === 'treino' ? (
              sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhuma sessão registrada ainda.</p>
              ) : (
                <div className="space-y-2">
                  {sessions.slice(0, 12).map(session => {
                    const workout = workouts.find(w => w.id === session.workout_id)
                    const d   = new Date(session.date + 'T12:00:00')
                    const pct = session.total_exercises > 0
                      ? Math.min(100, Math.round((session.completed_count / session.total_exercises) * 100))
                      : 0
                    return (
                      <div key={session.id} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${session.is_complete ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-muted'}`}>
                          {session.is_complete
                            ? <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            : <Dumbbell className="w-3.5 h-3.5 text-muted-foreground" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{workout?.name ?? 'Treino'}</p>
                          <p className="text-xs text-muted-foreground">
                            {d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })} · {session.completed_count}/{session.total_exercises} exerc.
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={`text-sm font-bold ${pct === 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>{pct}%</p>
                          {(session.xp_earned ?? 0) > 0 && (
                            <p className="text-[10px] text-amber-500 flex items-center gap-0.5 justify-end">
                              <Zap className="w-2.5 h-2.5" />{session.xp_earned}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            ) : (
              dietSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhuma sessão de dieta registrada.</p>
              ) : (
                <div className="space-y-2">
                  {dietSessions.slice(0, 12).map((session: any) => {
                    const dieta = diets.find((d: any) => d.id === session.diet_id)
                    const d   = new Date(session.date + 'T12:00:00')
                    const pct = session.total_meals > 0
                      ? Math.min(100, Math.round((session.completed_count / session.total_meals) * 100))
                      : 0
                    return (
                      <div key={session.id} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${session.is_complete ? 'bg-teal-100 dark:bg-teal-900/50' : 'bg-muted'}`}>
                          {session.is_complete
                            ? <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                            : <Utensils className="w-3.5 h-3.5 text-muted-foreground" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{dieta?.name ?? 'Dieta'}</p>
                          <p className="text-xs text-muted-foreground">
                            {d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })} · {session.completed_count}/{session.total_meals} refeições
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={`text-sm font-bold ${pct === 100 ? 'text-teal-600 dark:text-teal-400' : 'text-foreground'}`}>{pct}%</p>
                          {(session.xp_earned ?? 0) > 0 && (
                            <p className="text-[10px] text-amber-500 flex items-center gap-0.5 justify-end">
                              <Zap className="w-2.5 h-2.5" />{session.xp_earned}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── Sub-componente: badge bloqueado ───────────────────────────────────────────
function NextBadge({
  Icon, label, current, goal, color, bg,
}: {
  Icon: LucideIcon; label: string; current: number; goal: number; color: string; bg: string
}) {
  const pct = Math.min(100, Math.round((current / goal) * 100))
  return (
    <div className="flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 opacity-50 ${bg}`}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-muted-foreground font-medium">{label}</span>
          <span className="text-muted-foreground">{current}/{goal}</span>
        </div>
        <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
          <div className="h-1.5 rounded-full bg-primary/50 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  )
}
