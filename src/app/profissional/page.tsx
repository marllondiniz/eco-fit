import { createSupabaseServerClient } from '@/lib/supabase-server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Utensils, Dumbbell, ClipboardCheck } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from '@/lib/date-utils'

export const metadata = { title: 'LB.FIT — Visão Geral' }

export default async function ProfissionalPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { count: totalClientes },
    { count: rascunhos },
    { count: emRevisao },
    { data: recenteDietas },
    { data: recenteTreinos },
  ] = await Promise.all([
    supabase.from('diets').select('client_id', { count: 'exact', head: true })
      .eq('professional_id', user!.id).not('client_id', 'is', null),
    supabase.from('diets').select('*', { count: 'exact', head: true })
      .eq('professional_id', user!.id).eq('status', 'draft'),
    supabase.from('diets').select('*', { count: 'exact', head: true })
      .eq('professional_id', user!.id).eq('status', 'review'),
    supabase.from('diets').select('id, name, status, updated_at, profiles!diets_client_id_fkey(full_name)')
      .eq('professional_id', user!.id).order('updated_at', { ascending: false }).limit(4),
    supabase.from('workouts').select('id, name, status, updated_at, profiles!workouts_client_id_fkey(full_name)')
      .eq('professional_id', user!.id).order('updated_at', { ascending: false }).limit(4),
  ])

  const stats = [
    { label: 'Clientes', value: totalClientes ?? 0, icon: Users, href: '/profissional/clientes', color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Rascunhos', value: rascunhos ?? 0, icon: Utensils, href: '/profissional/dietas', color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Em revisão', value: emRevisao ?? 0, icon: ClipboardCheck, href: '/profissional/supervisao', color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Treinos', value: recenteTreinos?.length ?? 0, icon: Dumbbell, href: '/profissional/treinos', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ]

  const statusLabel: Record<string, string> = { draft: 'Rascunho', review: 'Em revisão', sent: 'Enviado' }
  const statusVariant: Record<string, 'secondary' | 'outline' | 'default'> = {
    draft: 'secondary', review: 'outline', sent: 'default',
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Visão Geral</h2>
        <p className="text-muted-foreground mt-1 text-sm">Acompanhe seus clientes e planos em andamento.</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Link key={stat.label} href={stat.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
                    <div className={`w-9 h-9 rounded-lg ${stat.bg} dark:bg-muted flex items-center justify-center`}>
                      <Icon className={`w-4.5 h-4.5 ${stat.color} dark:opacity-90`} size={18} />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Recent plans */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Diets */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Dietas recentes</CardTitle>
              <Link href="/profissional/dietas" className="text-xs text-primary hover:opacity-90 font-medium">
                Ver todas
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {!recenteDietas?.length ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma dieta criada ainda.</p>
            ) : (
              <ul className="divide-y divide-border">
                {recenteDietas.map((dieta: any) => (
                  <li key={dieta.id} className="flex items-center justify-between py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{dieta.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {dieta.profiles?.full_name ?? 'Sem cliente'} · {formatDistanceToNow(dieta.updated_at)}
                      </p>
                    </div>
                    <Badge variant={statusVariant[dieta.status]} className="ml-3 flex-shrink-0 text-xs">
                      {statusLabel[dieta.status]}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent Workouts */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Treinos recentes</CardTitle>
              <Link href="/profissional/treinos" className="text-xs text-primary hover:opacity-90 font-medium">
                Ver todos
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {!recenteTreinos?.length ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhum treino criado ainda.</p>
            ) : (
              <ul className="divide-y divide-border">
                {recenteTreinos.map((treino: any) => (
                  <li key={treino.id} className="flex items-center justify-between py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{treino.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {treino.profiles?.full_name ?? 'Sem cliente'} · {formatDistanceToNow(treino.updated_at)}
                      </p>
                    </div>
                    <Badge variant={statusVariant[treino.status]} className="ml-3 flex-shrink-0 text-xs">
                      {statusLabel[treino.status]}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Ações rápidas</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Link
              href="/profissional/dietas/nova"
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-emerald-300 hover:bg-emerald-50 dark:hover:border-emerald-600 dark:hover:bg-emerald-900/50 transition-colors text-center group"
            >
              <Utensils className="w-5 h-5 text-emerald-600 dark:text-emerald-400 group-hover:dark:text-emerald-300" />
              <span className="text-sm font-medium text-foreground">Nova Dieta</span>
            </Link>
            <Link
              href="/profissional/treinos/novo"
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-emerald-300 hover:bg-emerald-50 dark:hover:border-emerald-600 dark:hover:bg-emerald-900/50 transition-colors text-center group"
            >
              <Dumbbell className="w-5 h-5 text-emerald-600 dark:text-emerald-400 group-hover:dark:text-emerald-300" />
              <span className="text-sm font-medium text-foreground">Novo Treino</span>
            </Link>
            <Link
              href="/profissional/supervisao"
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-emerald-300 hover:bg-emerald-50 dark:hover:border-emerald-600 dark:hover:bg-emerald-900/50 transition-colors text-center group"
            >
              <ClipboardCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 group-hover:dark:text-emerald-300" />
              <span className="text-sm font-medium text-foreground">Supervisão</span>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
