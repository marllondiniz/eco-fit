import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getProfile } from '@/lib/supabase-server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ClienteGreeting } from '@/components/ClienteGreeting'
import { ClienteEvolucaoBlock } from '@/components/ClienteEvolucaoBlock'
import { Utensils, Dumbbell, ArrowRight } from 'lucide-react'
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

  const [
    { data: dietas },
    { data: treinos },
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
  ])

  const totalDietas = dietas?.length ?? 0
  const totalTreinos = treinos?.length ?? 0
  const firstName = getFirstName(profile?.full_name ?? null)

  return (
    <div className="space-y-8">
      {/* Saudação: horário do navegador do usuário (evita "Bom dia" à noite em produção) */}
      <ClienteGreeting firstName={firstName} />

      {/* Evolução e treinos recentes — dados com data local (evita "Treino de hoje" não contabilizado) */}
      <ClienteEvolucaoBlock
        userId={user!.id}
        treinos={treinos ?? []}
        totalDietas={totalDietas}
        totalTreinos={totalTreinos}
      />

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
