import { createSupabaseServerClient } from '@/lib/supabase-server'
import { Card, CardContent } from '@/components/ui/card'
import { Users } from 'lucide-react'
import { ClienteCardComMeta } from '@/components/ClienteCardComMeta'

export const metadata = { title: 'LB.FIT — Clientes' }

export default async function ClientesPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Buscar clientes únicos que têm dietas ou treinos deste profissional
  const { data: clientesDietas } = await supabase
    .from('diets')
    .select('client_id, profiles!diets_client_id_fkey(id, full_name, email, created_at)')
    .eq('professional_id', user!.id)
    .not('client_id', 'is', null)

  const { data: clientesTreinos } = await supabase
    .from('workouts')
    .select('client_id, profiles!workouts_client_id_fkey(id, full_name, email, created_at)')
    .eq('professional_id', user!.id)
    .not('client_id', 'is', null)

  // Deduplicar por client_id
  const clienteMap = new Map<string, any>()
  for (const item of [...(clientesDietas ?? []), ...(clientesTreinos ?? [])]) {
    if (item.profiles && !clienteMap.has(item.client_id)) {
      clienteMap.set(item.client_id, item.profiles)
    }
  }
  const clientes = Array.from(clienteMap.values())

  // Contar planos por cliente
  async function countPlans(clientId: string) {
    const [{ count: d }, { count: t }] = await Promise.all([
      supabase.from('diets').select('*', { count: 'exact', head: true })
        .eq('professional_id', user!.id).eq('client_id', clientId),
      supabase.from('workouts').select('*', { count: 'exact', head: true })
        .eq('professional_id', user!.id).eq('client_id', clientId),
    ])
    return { dietas: d ?? 0, treinos: t ?? 0 }
  }

  const clientIds = clientes.map((c) => c.id)
  const { data: gamificationByClient } = await supabase
    .from('user_gamification')
    .select('user_id, weekly_target_sessions')
    .in('user_id', clientIds)

  const metaByClient = new Map<string, number>()
  for (const row of gamificationByClient ?? []) {
    metaByClient.set(row.user_id, row.weekly_target_sessions ?? 3)
  }

  const clientesComContagem = await Promise.all(
    clientes.map(async (c) => ({
      ...c,
      counts: await countPlans(c.id),
      weeklyTarget: metaByClient.get(c.id) ?? null,
    }))
  )

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Clientes</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {clientes.length} {clientes.length === 1 ? 'cliente vinculado' : 'clientes vinculados'}
        </p>
      </div>

      {!clientes.length ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">Nenhum cliente vinculado ainda.</p>
            <p className="text-muted-foreground text-sm mt-1">
              Crie uma dieta ou treino e associe a um cliente para ele aparecer aqui.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clientesComContagem.map((cliente) => (
            <ClienteCardComMeta
              key={cliente.id}
              cliente={cliente}
              counts={cliente.counts}
              weeklyTarget={cliente.weeklyTarget}
            />
          ))}
        </div>
      )}
    </div>
  )
}
