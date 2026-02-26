'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { ClipboardCheck, Utensils, Dumbbell, Send, Trash2, User } from 'lucide-react'
import { formatDistanceToNow } from '@/lib/date-utils'
import type { Diet, Workout, Profile } from '@/types/database'

type PlanItem = (Diet | Workout) & {
  _type: 'diet' | 'workout'
  profiles?: Profile | null
}

export default function SupervisaoPage() {
  const [planos, setPlanos] = useState<PlanItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selecionado, setSelecionado] = useState<PlanItem | null>(null)
  const [clienteEmail, setClienteEmail] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: dietas }, { data: treinos }] = await Promise.all([
      supabase.from('diets')
        .select('*, profiles!diets_client_id_fkey(full_name, email)')
        .eq('professional_id', user.id)
        .eq('status', 'review')
        .order('updated_at', { ascending: false }),
      supabase.from('workouts')
        .select('*, profiles!workouts_client_id_fkey(full_name, email)')
        .eq('professional_id', user.id)
        .eq('status', 'review')
        .order('updated_at', { ascending: false }),
    ])

    const items: PlanItem[] = [
      ...(dietas ?? []).map(d => ({ ...d, _type: 'diet' as const })),
      ...(treinos ?? []).map(t => ({ ...t, _type: 'workout' as const })),
    ].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())

    setPlanos(items)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleEnviar() {
    if (!selecionado) return

    setErro(null)

    let clienteId = selecionado.client_id

    // Se o email foi preenchido, buscar ou associar cliente
    if (clienteEmail.trim() && !clienteId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', clienteEmail.trim().toLowerCase())
        .single()

      if (!profile) {
        setErro('Nenhum usuário encontrado com esse e-mail.')
        return
      }
      clienteId = profile.id
    }

    setEnviando(true)

    const table = selecionado._type === 'diet' ? 'diets' : 'workouts'
    const { error } = await supabase
      .from(table)
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        client_id: clienteId,
      })
      .eq('id', selecionado.id)

    setEnviando(false)

    if (error) {
      setErro('Erro ao enviar o plano.')
      return
    }

    setSelecionado(null)
    setClienteEmail('')
    await load()
  }

  async function handleVoltarRascunho(plano: PlanItem) {
    const table = plano._type === 'diet' ? 'diets' : 'workouts'
    await supabase.from(table).update({ status: 'draft' }).eq('id', plano.id)
    await load()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Supervisão</h2>
        <p className="text-muted-foreground dark:text-foreground/85 mt-1 text-sm">
          Revise e confirme o envio de planos para seus clientes.
        </p>
      </div>

      {!planos.length ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ClipboardCheck className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground dark:text-foreground/85 font-medium">Nenhum plano aguardando revisão.</p>
            <p className="text-muted-foreground dark:text-foreground/75 text-sm mt-1">
              Quando você enviar um rascunho para revisão, ele aparece aqui.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {planos.map((plano) => {
            const isDiet = plano._type === 'diet'
            const Icon = isDiet ? Utensils : Dumbbell

            return (
              <Card key={`${plano._type}-${plano.id}`} className="border border-orange-200 dark:border-orange-800 bg-orange-50/30 dark:bg-orange-950/40">
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-orange-100 dark:bg-orange-900/60 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Icon className="w-4.5 h-4.5 text-orange-600 dark:text-orange-400" size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-foreground truncate">{plano.name}</p>
                          <Badge variant="outline" className="text-xs text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-600 dark:bg-orange-900/50 flex-shrink-0">
                            Em revisão
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground dark:text-foreground/80 mt-1">
                          {isDiet ? 'Dieta' : 'Treino'} · {formatDistanceToNow(plano.updated_at)}
                          {(plano as any).profiles && (
                            <> · Cliente: {(plano as any).profiles?.full_name ?? (plano as any).profiles?.email}</>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0 self-end sm:self-start">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleVoltarRascunho(plano)}
                        className="text-xs text-muted-foreground dark:text-foreground/80 hover:text-foreground hover:bg-muted dark:hover:bg-muted/80"
                      >
                        Voltar ao rascunho
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => { setSelecionado(plano); setClienteEmail(''); setErro(null) }}
                        className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Enviar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal de confirmação de envio */}
      <Dialog open={!!selecionado} onOpenChange={(open) => !open && setSelecionado(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar envio</DialogTitle>
          </DialogHeader>
          {selecionado && (
            <div className="space-y-4 py-2">
              <div className="bg-slate-50 dark:bg-muted rounded-xl p-4">
                <p className="text-sm font-medium text-foreground">{selecionado.name}</p>
                <p className="text-xs text-muted-foreground dark:text-foreground/80 mt-0.5">
                  {selecionado._type === 'diet' ? 'Plano de dieta' : 'Plano de treino'}
                </p>
              </div>

              {!(selecionado as any).client_id ? (
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    E-mail do cliente *
                  </Label>
                  <Input
                    value={clienteEmail}
                    onChange={e => setClienteEmail(e.target.value)}
                    placeholder="cliente@email.com"
                    type="email"
                  />
                  <p className="text-xs text-muted-foreground dark:text-foreground/80">
                    O cliente deve já ter uma conta na plataforma.
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground dark:text-foreground/90">
                  <User className="w-4 h-4 text-muted-foreground dark:text-foreground/80" />
                  Enviando para:{' '}
                  <strong className="text-foreground">{(selecionado as any).profiles?.full_name ?? (selecionado as any).profiles?.email}</strong>
                </div>
              )}

              {erro && (
                <p className="text-sm text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/50 border border-red-100 dark:border-red-800 rounded-lg px-3 py-2">
                  {erro}
                </p>
              )}

              <p className="text-xs text-muted-foreground dark:text-foreground/80">
                Após o envio, o cliente terá acesso ao plano. Esta ação ficará registrada.
              </p>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSelecionado(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleEnviar}
              disabled={enviando || (!(selecionado as any)?.client_id && !clienteEmail.trim())}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Send className="w-4 h-4" />
              {enviando ? 'Enviando...' : 'Confirmar envio'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
