import { createSupabaseServerClient } from '@/lib/supabase-server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Utensils, Dumbbell, History } from 'lucide-react'
import { formatDate, formatDistanceToNow } from '@/lib/date-utils'

export const metadata = { title: 'ECOFIT — Histórico' }

export default async function HistoricoPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: dietas }, { data: treinos }] = await Promise.all([
    supabase.from('diets')
      .select('id, name, objective, status, sent_at, created_at, profiles!diets_professional_id_fkey(full_name)')
      .eq('client_id', user!.id)
      .order('sent_at', { ascending: false }),
    supabase.from('workouts')
      .select('id, name, division, status, sent_at, created_at, profiles!workouts_professional_id_fkey(full_name)')
      .eq('client_id', user!.id)
      .order('sent_at', { ascending: false }),
  ])

  type HistItem = {
    id: string
    name: string
    type: 'diet' | 'workout'
    status: string
    sent_at: string | null
    professional: string | null
    detail?: string | null
  }

  const items: HistItem[] = [
    ...(dietas ?? []).map((d: any) => ({
      id: d.id,
      name: d.name,
      type: 'diet' as const,
      status: d.status,
      sent_at: d.sent_at,
      professional: d.profiles?.full_name ?? null,
      detail: d.objective,
    })),
    ...(treinos ?? []).map((t: any) => ({
      id: t.id,
      name: t.name,
      type: 'workout' as const,
      status: t.status,
      sent_at: t.sent_at,
      professional: t.profiles?.full_name ?? null,
      detail: t.division ? `Divisão: ${t.division}` : null,
    })),
  ].sort((a, b) => {
    const da = a.sent_at ? new Date(a.sent_at).getTime() : 0
    const db = b.sent_at ? new Date(b.sent_at).getTime() : 0
    return db - da
  })

  const STATUS_LABEL: Record<string, string> = { draft: 'Rascunho', review: 'Em revisão', sent: 'Enviado' }
  const STATUS_VARIANT: Record<string, 'secondary' | 'outline' | 'default'> = {
    draft: 'secondary', review: 'outline', sent: 'default',
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Histórico</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Todos os planos vinculados à sua conta.
        </p>
      </div>

      {!items.length ? (
        <Card>
          <CardContent className="py-16 text-center">
            <History className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">Nenhum plano no histórico.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => {
            const Icon = item.type === 'diet' ? Utensils : Dumbbell
            const iconBg = item.type === 'diet' ? 'bg-emerald-50 dark:bg-emerald-950/50' : 'bg-blue-50 dark:bg-blue-950/50'
            const iconColor = item.type === 'diet' ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'

            return (
              <Card key={`${item.type}-${item.id}`} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={iconColor} size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground text-sm truncate">{item.name}</p>
                        <Badge variant={STATUS_VARIANT[item.status]} className="text-xs flex-shrink-0">
                          {STATUS_LABEL[item.status]}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.type === 'diet' ? 'Dieta' : 'Treino'}
                        {item.detail ? ` · ${item.detail}` : ''}
                        {item.professional ? ` · ${item.professional}` : ''}
                        {item.sent_at ? ` · ${formatDistanceToNow(item.sent_at)}` : ''}
                      </p>
                    </div>
                    {item.sent_at && (
                      <span className="text-xs text-muted-foreground flex-shrink-0 hidden sm:block">
                        {formatDate(item.sent_at)}
                      </span>
                    )}
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
