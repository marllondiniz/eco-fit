'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Dumbbell, Pencil, Trash2, Eye, Bell, UserCheck, InboxIcon, ChevronDown, ChevronUp, User, Calendar } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/date-utils'

interface Plan {
  key: string
  client_id: string
  clientName: string
  division: string | null
  start_date: string | null
  end_date: string | null
  isActive: boolean
  workouts: any[]
}

interface PlanRequest {
  id: string
  client_id: string
  professional_id: string | null
  type: string
  status: string
  created_at: string
  profiles: { full_name: string | null; email: string | null } | null
}

export default function TreinosPage() {
  const [treinos, setTreinos]   = useState<any[]>([])
  const [requests, setRequests] = useState<PlanRequest[]>([])
  const [loading, setLoading]   = useState(true)
  const [excluindoId, setExcluindoId] = useState<string | null>(null)
  const [confirmId, setConfirmId]     = useState<string | null>(null)
  const [expanded, setExpanded]       = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [{ data: treinosData }, { data: requestsData }] = await Promise.all([
      supabase
        .from('workouts')
        .select('*, profiles!workouts_client_id_fkey(full_name, email)')
        .eq('professional_id', user.id)
        .order('updated_at', { ascending: false }),
      // Inclui solicitações vinculadas ao profissional OU sem profissional (abertas)
      // O filtro de tipo garante que só aparecem solicitações de treino ou ambos
      supabase
        .from('plan_requests')
        .select('id, client_id, professional_id, type, status, created_at, profiles!plan_requests_client_id_fkey(full_name, email)')
        .or(`professional_id.eq.${user.id},professional_id.is.null`)
        .eq('status', 'pending')
        .in('type', ['workout', 'both'])
        .order('created_at', { ascending: false }),
    ])
    setTreinos(treinosData ?? [])
    setRequests((requestsData ?? []) as unknown as PlanRequest[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleExcluir(id: string) {
    setExcluindoId(id)
    await supabase.from('workouts').delete().eq('id', id)
    setTreinos(prev => prev.filter(t => t.id !== id))
    setExcluindoId(null)
    setConfirmId(null)
  }

  async function ignorarRequest(id: string) {
    await supabase.from('plan_requests').update({ status: 'cancelled' }).eq('id', id)
    setRequests(prev => prev.filter(r => r.id !== id))
  }

  function togglePlan(key: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  // Agrupar treinos por (client_id, start_date, end_date)
  const plans = useMemo<Plan[]>(() => {
    const today = new Date().toISOString().slice(0, 10)
    const map = new Map<string, Plan>()
    for (const t of treinos) {
      const key = `${t.client_id ?? 'none'}-${t.start_date ?? 'nodate'}-${t.end_date ?? 'noend'}`
      if (!map.has(key)) {
        const isActive = t.status === 'sent' && (!t.end_date || t.end_date >= today)
        map.set(key, {
          key,
          client_id:   t.client_id,
          clientName:  t.profiles?.full_name ?? t.profiles?.email ?? 'Cliente',
          division:    t.division ?? null,
          start_date:  t.start_date ?? null,
          end_date:    t.end_date ?? null,
          isActive,
          workouts:    [],
        })
      }
      map.get(key)!.workouts.push(t)
    }
    return Array.from(map.values()).sort((a, b) => {
      if (!a.start_date && !b.start_date) return 0
      if (!a.start_date) return 1
      if (!b.start_date) return -1
      return b.start_date.localeCompare(a.start_date)
    })
  }, [treinos])

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Treinos</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Crie planos a partir das solicitações dos clientes abaixo.
        </p>
      </div>

      {/* Estado vazio: nenhuma solicitação */}
      {!loading && requests.length === 0 && treinos.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <InboxIcon className="w-10 h-10 text-muted-foreground/40" />
          <div>
            <p className="font-medium text-muted-foreground">Nenhuma solicitação pendente no momento.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Quando um cliente finalizar a anamnese ou solicitar um novo plano, aparecerá aqui.
            </p>
          </div>
        </div>
      )}

      {/* Solicitações pendentes de plano */}
      {requests.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-500" />
            <h3 className="font-semibold text-foreground text-sm">
              Aguardando plano
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 text-xs font-bold">
                {requests.length}
              </span>
            </h3>
          </div>
          {requests.map(req => {
            const clientName = req.profiles?.full_name ?? req.profiles?.email ?? 'Cliente'
            return (
              <Card key={req.id} className="border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center flex-shrink-0">
                        <UserCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground text-sm">{clientName}</p>
                        <p className="text-xs text-muted-foreground">
                          Solicitou plano de {req.type === 'diet' ? 'dieta' : req.type === 'both' ? 'treino e dieta' : 'treino'} · {formatDate(req.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Link href={`/profissional/treinos/plano?clientId=${req.client_id}&requestId=${req.id}`}>
                        <Button size="sm" className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs">
                          <Calendar className="w-3.5 h-3.5" />
                          Criar plano
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => ignorarRequest(req.id)}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Ignorar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}


      {/* ── Planos criados (agrupados por cliente) ── */}
      {loading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map(i => (
            <Card key={i}><CardContent className="p-5 h-16 bg-muted/30 animate-pulse rounded-xl" /></Card>
          ))}
        </div>
      ) : plans.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Planos criados</h3>
          {plans.map(plan => {
            const isOpen = expanded.has(plan.key)
            return (
              <Card key={plan.key} className={`overflow-hidden ${plan.isActive ? 'border-emerald-200 dark:border-emerald-800' : ''}`}>
                {/* Header do plano */}
                <button
                  type="button"
                  onClick={() => togglePlan(plan.key)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground text-sm">{plan.clientName}</p>
                        {plan.isActive ? (
                          <Badge className="bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border-0 text-xs">Ativo</Badge>
                        ) : (
                          <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-0 text-xs">Finalizado</Badge>
                        )}
                        {plan.workouts.map(w => w.label).filter(Boolean).sort().map(l => (
                          <span key={l} className="inline-flex items-center justify-center w-5 h-5 rounded text-xs font-bold bg-primary/10 text-primary">{l}</span>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {plan.division && <span>{plan.division} · </span>}
                        {plan.start_date && <span>{formatDate(plan.start_date)}</span>}
                        {plan.end_date && <span> → {formatDate(plan.end_date)}</span>}
                        {!plan.start_date && <span>{plan.workouts.length} treino(s)</span>}
                      </p>
                    </div>
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                </button>

                {/* Workouts expandidos */}
                {isOpen && (
                  <div className="border-t border-border divide-y divide-border">
                    {plan.workouts.sort((a, b) => (a.label ?? '').localeCompare(b.label ?? '')).map(treino => (
                      <div key={treino.id} className="flex items-center justify-between gap-3 px-5 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {treino.label && (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary font-bold text-sm flex-shrink-0">
                              {treino.label}
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{treino.name}</p>
                            {treino.methodology && (
                              <p className="text-xs text-muted-foreground truncate">{treino.methodology}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Link href={`/profissional/treinos/${treino.id}/editar`}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-primary">
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                          <Link href={`/profissional/treinos/${treino.id}`}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-primary">
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                            onClick={() => setConfirmId(treino.id)}
                            disabled={excluindoId === treino.id}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      ) : null}

      <AlertDialog open={!!confirmId} onOpenChange={open => !open && setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir treino?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. Todos os exercícios deste treino serão apagados permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmId && handleExcluir(confirmId)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
