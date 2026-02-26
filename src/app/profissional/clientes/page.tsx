import { createSupabaseServerClient } from '@/lib/supabase-server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Users } from 'lucide-react'
import { formatDate } from '@/lib/date-utils'

export const metadata = { title: 'ECOFIT — Clientes' }

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

  const clientesComContagem = await Promise.all(
    clientes.map(async (c) => ({
      ...c,
      counts: await countPlans(c.id),
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
          {clientesComContagem.map((cliente) => {
            const initials = cliente.full_name
              ? cliente.full_name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
              : cliente.email?.[0]?.toUpperCase() ?? 'C'

            return (
              <Card key={cliente.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-10 h-10 flex-shrink-0">
                      <AvatarFallback className="bg-blue-100 text-blue-700 text-sm font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground truncate">
                        {cliente.full_name ?? 'Sem nome'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{cliente.email}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Desde {formatDate(cliente.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Badge variant="secondary" className="text-xs gap-1">
                      {cliente.counts.dietas} {cliente.counts.dietas === 1 ? 'dieta' : 'dietas'}
                    </Badge>
                    <Badge variant="secondary" className="text-xs gap-1">
                      {cliente.counts.treinos} {cliente.counts.treinos === 1 ? 'treino' : 'treinos'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
