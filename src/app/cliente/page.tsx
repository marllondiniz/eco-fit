import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getProfile } from '@/lib/supabase-server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ClienteGreeting } from '@/components/ClienteGreeting'
import { Utensils, Dumbbell, ArrowRight, Flame, Trophy, TrendingUp, Target, Zap, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/date-utils'

export const metadata = { title: 'ECOFIT — Início' }

function getFirstName(fullName: string | null) {
  if (!fullName) return 'Atleta'
  return fullName.trim().split(' ')[0]
}

export default async function ClientePage() {
  const supabase = await createSupabaseServerClient()
  const [{ data: { user } }, profile] = await Promise.all([
    supabase.auth.getUser(),
    getProfile(),
  ])

  const today = new Date().toISOString().split('T')[0]

  // Início da semana (segunda-feira)
  const now = new Date()
  const dayOfWeek = now.getDay() // 0 = domingo
  const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMonday)
  const weekStart = monday.toISOString().split('T')[0]

  // Início do mês
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const [
    { data: dietas },
    { data: treinos },
    { data: gamification },
    { data: sessionsThisWeek },
    { data: sessionsThisMonth },
    { data: todaySession },
  ] = await Promise.all([
    supabase.from('diets')
      .select('*, profiles!diets_professional_id_fkey(full_name)')
      .eq('client_id', user!.id)
      .eq('status', 'sent')
      .order('sent_at', { ascending: false })
      .limit(3),
    supabase.from('workouts')
      .select('id, name, sent_at, profiles!workouts_professional_id_fkey(full_name), workout_exercises(id)')
      .eq('client_id', user!.id)
      .eq('status', 'sent')
      .order('sent_at', { ascending: false })
      .limit(3),
    supabase.from('user_gamification')
      .select('*')
      .eq('user_id', user!.id)
      .maybeSingle(),
    supabase.from('workout_sessions')
      .select('id, date, is_complete, workout_id')
      .eq('user_id', user!.id)
      .gte('date', weekStart)
      .lte('date', today),
    supabase.from('workout_sessions')
      .select('id, date, is_complete, completed_count, total_exercises')
      .eq('user_id', user!.id)
      .gte('date', monthStart)
      .lte('date', today),
    supabase.from('workout_sessions')
      .select('workout_id, completed_count, total_exercises, is_complete')
      .eq('user_id', user!.id)
      .eq('date', today),
  ])

  const totalDietas = dietas?.length ?? 0
  const totalTreinos = treinos?.length ?? 0

  // Cálculos de progresso
  const weeklyComplete = (sessionsThisWeek ?? []).filter(s => s.is_complete).length
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const monthComplete = (sessionsThisMonth ?? []).filter(s => s.is_complete).length
  const monthAdherence = Math.round((monthComplete / daysInMonth) * 100)

  // Progresso de hoje (sessão mais recente)
  const todayDone = (todaySession ?? []).reduce((acc, s) => acc + (s.completed_count ?? 0), 0)
  const todayTotal = (todaySession ?? []).reduce((acc, s) => acc + (s.total_exercises ?? 0), 0)
  const todayPct = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0
  const hasActivityToday = (todaySession ?? []).length > 0

  const streak = gamification?.streak_days ?? 0
  const totalXP = gamification?.total_xp ?? 0
  const level = gamification?.level ?? 1

  const firstName = getFirstName(profile?.full_name ?? null)

  return (
    <div className="space-y-8">
      {/* Saudação: horário do navegador do usuário (evita "Bom dia" à noite em produção) */}
      <ClienteGreeting
        firstName={firstName}
        streak={streak}
        hasActivityToday={hasActivityToday}
      />

      {/* Bloco de progresso motivador */}
      {(gamification || hasActivityToday) && (
        <div className="bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-950/30 dark:to-blue-950/30 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Sua Evolução
            </h3>
            <Link
              href="/cliente/progresso"
              className="text-xs text-primary font-medium flex items-center gap-1 hover:opacity-80"
            >
              Ver detalhes <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Progresso hoje */}
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

            {/* Treinos na semana */}
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

            {/* Consistência no mês */}
            <div className="bg-white/70 dark:bg-card/60 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Target className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-xs text-muted-foreground">No mês</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{monthAdherence}%</p>
              <p className="text-xs text-muted-foreground">de adesão</p>
            </div>
          </div>

          {/* Indicadores extras */}
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
                <span className="text-xs font-semibold text-foreground">{totalXP} XP · Nível {level}</span>
              </div>
            )}
            {gamification?.total_sessions > 0 && (
              <div className="flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-semibold text-foreground">
                  {gamification.total_sessions} {gamification.total_sessions === 1 ? 'sessão' : 'sessões'} completas
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats de planos */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">Dietas ativas</span>
              <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center">
                <Utensils className="text-emerald-600 dark:text-emerald-400" size={18} />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground">{totalDietas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">Treinos ativos</span>
              <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center">
                <Dumbbell className="text-blue-600 dark:text-blue-400" size={18} />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground">{totalTreinos}</p>
          </CardContent>
        </Card>
      </div>

      {/* Dietas recentes */}
      {totalDietas > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Minhas Dietas</CardTitle>
              <Link href="/cliente/dietas" className="text-xs text-primary hover:opacity-90 font-medium flex items-center gap-1">
                Ver todas <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="divide-y divide-border">
              {dietas?.map((dieta: any) => (
                <li key={dieta.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{dieta.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {dieta.profiles?.full_name && `Por ${dieta.profiles.full_name} · `}
                      {dieta.sent_at && formatDate(dieta.sent_at)}
                    </p>
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

      {/* Treinos recentes */}
      {totalTreinos > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Meus Treinos</CardTitle>
              <Link href="/cliente/treinos" className="text-xs text-primary hover:opacity-90 font-medium flex items-center gap-1">
                Ver todos <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="divide-y divide-border">
              {treinos?.map((treino: any) => {
                const todaySess = (todaySession ?? []).find(s => s.workout_id === treino.id)
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
                        {todaySess?.is_complete
                          ? <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Feito hoje</span>
                          : 'Ativo'}
                      </Badge>
                    </div>
                    {exTotal > 0 && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">Hoje: {exDone}/{exTotal} exercícios</span>
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

      {totalDietas === 0 && totalTreinos === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground font-medium">Nenhum plano disponível ainda.</p>
            <p className="text-muted-foreground text-sm mt-1">
              Seus planos aparecerão aqui quando o profissional enviá-los.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
