import { createSupabaseServerClient } from '@/lib/supabase-server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Utensils, Clock } from 'lucide-react'
import { formatDate } from '@/lib/date-utils'

export const metadata = { title: 'ECOFIT — Minhas Dietas' }

export default async function ClienteDietasPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: dietas } = await supabase
    .from('diets')
    .select('*, diet_meals(id, name, time_of_day, foods, notes, order_index), profiles!diets_professional_id_fkey(full_name)')
    .eq('client_id', user!.id)
    .eq('status', 'sent')
    .order('sent_at', { ascending: false })

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Minhas Dietas</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Planos alimentares enviados pelo seu profissional.
        </p>
      </div>

      {!dietas?.length ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Utensils className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">Nenhuma dieta disponível ainda.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {dietas.map((dieta: any) => (
            <Card key={dieta.id}>
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{dieta.name}</CardTitle>
                    {dieta.objective && (
                      <p className="text-sm text-muted-foreground mt-1">Objetivo: {dieta.objective}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      {dieta.profiles?.full_name && (
                        <span className="text-xs text-muted-foreground">Por {dieta.profiles.full_name}</span>
                      )}
                      {dieta.sent_at && (
                        <span className="text-xs text-muted-foreground">Enviado em {formatDate(dieta.sent_at)}</span>
                      )}
                    </div>
                  </div>
                  <Badge className="bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border-0 flex-shrink-0">Ativo</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {dieta.methodology && (
                  <div className="bg-emerald-50 dark:bg-emerald-950/40 rounded-xl p-4">
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide mb-1">Metodologia</p>
                    <p className="text-sm text-foreground">{dieta.methodology}</p>
                  </div>
                )}

                {/* Refeições */}
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
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Observações</p>
                    <p className="text-sm text-slate-600">{dieta.notes}</p>
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
