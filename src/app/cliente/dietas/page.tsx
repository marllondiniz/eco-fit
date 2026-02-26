import { createSupabaseServerClient } from '@/lib/supabase-server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Utensils, Clock, Clock3 } from 'lucide-react'
import { formatDate } from '@/lib/date-utils'
import { SolicitarDietaButton } from '@/components/SolicitarDietaButton'

export const metadata = { title: 'ECOFIT — Minhas Dietas' }

export default async function ClienteDietasPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const today = new Date().toISOString().slice(0, 10)

  const [{ data: dietas }, { data: pendingRequest }] = await Promise.all([
    supabase
      .from('diets')
      .select('*, diet_meals(id, name, time_of_day, foods, notes, order_index), profiles!diets_professional_id_fkey(full_name)')
      .eq('client_id', user!.id)
      .eq('status', 'sent')
      .order('sent_at', { ascending: false }),
    supabase
      .from('plan_requests')
      .select('id')
      .eq('client_id', user!.id)
      .in('status', ['pending', 'in_progress'])
      .in('type', ['diet', 'both'])
      .limit(1)
      .maybeSingle(),
  ])

  const hasActiveDiet   = (dietas?.length ?? 0) > 0
  const hasPendingRequest = !!pendingRequest

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Minhas Dietas</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Planos alimentares enviados pelo seu profissional.
        </p>
      </div>

      {/* ── Sem dieta ativa: solicitar ou aguardar ── */}
      {!hasActiveDiet && (
        <Card>
          <CardContent className="py-10 space-y-4">
            <div className="text-center">
              <Utensils className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="font-medium text-muted-foreground">Nenhuma dieta disponível ainda.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Solicite um plano alimentar ao seu nutricionista.
              </p>
            </div>

            {hasPendingRequest ? (
              <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 rounded-xl px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
                <Clock3 className="w-4 h-4 flex-shrink-0" />
                Você já possui uma solicitação em andamento. Aguarde seu nutricionista criar o plano.
              </div>
            ) : (
              <SolicitarDietaButton />
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Lista de dietas ativas ── */}
      {hasActiveDiet && (
        <div className="space-y-6">
          {dietas!.map((dieta: any) => (
            <Card key={dieta.id}>
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{dieta.name}</CardTitle>
                    {dieta.objective && (
                      <p className="text-sm text-muted-foreground mt-1">Objetivo: {dieta.objective}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {dieta.profiles?.full_name && (
                        <span className="text-xs text-muted-foreground">Por {dieta.profiles.full_name}</span>
                      )}
                      {dieta.sent_at && (
                        <span className="text-xs text-muted-foreground">Enviado em {formatDate(dieta.sent_at)}</span>
                      )}
                      {dieta.end_date && (
                        <span className="text-xs text-muted-foreground">
                          Válido até {new Date(dieta.end_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge className="bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border-0 flex-shrink-0">
                    Ativo
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {dieta.methodology && (
                  <div className="bg-emerald-50 dark:bg-emerald-950/40 rounded-xl p-4">
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide mb-1">
                      Metodologia
                    </p>
                    <p className="text-sm text-foreground">{dieta.methodology}</p>
                  </div>
                )}

                {dieta.diet_meals?.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-foreground">
                      Refeições ({dieta.diet_meals.length})
                    </p>
                    {[...dieta.diet_meals]
                      .sort((a: any, b: any) => a.order_index - b.order_index)
                      .map((refeicao: any) => (
                        <div key={refeicao.id} className="border border-border rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <p className="font-medium text-foreground text-sm">{refeicao.name}</p>
                            {refeicao.time_of_day && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                {refeicao.time_of_day}
                              </span>
                            )}
                          </div>
                          {refeicao.foods?.length > 0 && (
                            <div className="space-y-1.5">
                              {refeicao.foods.map((food: any, fi: number) => (
                                <div key={fi} className="flex items-center justify-between text-sm">
                                  <span className="text-foreground">{food.name}</span>
                                  <span className="text-muted-foreground text-xs">
                                    {food.quantity} {food.unit}
                                    {food.calories ? ` · ${food.calories} kcal` : ''}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                          {refeicao.notes && (
                            <p className="text-xs text-muted-foreground mt-2 border-t border-border pt-2">
                              {refeicao.notes}
                            </p>
                          )}
                        </div>
                      ))}
                  </div>
                )}

                {dieta.notes && (
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      Observações
                    </p>
                    <p className="text-sm text-foreground">{dieta.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
