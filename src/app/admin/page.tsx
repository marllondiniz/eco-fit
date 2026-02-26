import { createSupabaseServerClient } from '@/lib/supabase-server'
import { Card, CardContent } from '@/components/ui/card'
import { Users, UserCheck, Utensils, Dumbbell } from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'LB.FIT — Admin' }

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient()

  const [
    { count: totalUsuarios },
    { count: totalProfissionais },
    { count: totalDietas },
    { count: totalTreinos },
    { count: convitesPendentes },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'personal'),
    supabase.from('diets').select('*', { count: 'exact', head: true }).eq('status', 'sent'),
    supabase.from('workouts').select('*', { count: 'exact', head: true }).eq('status', 'sent'),
    supabase.from('invitations').select('*', { count: 'exact', head: true }).is('used_at', null),
  ])

  const stats = [
    { label: 'Clientes', value: totalUsuarios ?? 0, icon: Users, href: '/admin/usuarios', color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Profissionais', value: totalProfissionais ?? 0, icon: UserCheck, href: '/admin/profissionais', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Dietas enviadas', value: totalDietas ?? 0, icon: Utensils, href: '/admin/usuarios', color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Treinos enviados', value: totalTreinos ?? 0, icon: Dumbbell, href: '/admin/usuarios', color: 'text-purple-600', bg: 'bg-purple-50' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Painel Admin</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Visão geral da plataforma LB.FIT.
          {(convitesPendentes ?? 0) > 0 && (
            <span className="ml-2 text-amber-600 dark:text-amber-400 font-medium">
              {convitesPendentes} {convitesPendentes === 1 ? 'convite pendente' : 'convites pendentes'}
            </span>
          )}
        </p>
      </div>

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
                      <Icon className={`${stat.color} dark:opacity-90`} size={18} />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
