'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Utensils, Pencil, Trash2, Eye, Bell, UserCheck, InboxIcon } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow, formatDate } from '@/lib/date-utils'

const STATUS_LABEL: Record<string, string> = { draft: 'Rascunho', review: 'Em revisão', sent: 'Enviado' }
const STATUS_VARIANT: Record<string, 'secondary' | 'outline' | 'default'> = {
  draft: 'secondary', review: 'outline', sent: 'default',
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

export default function DietasPage() {
  const [dietas, setDietas] = useState<any[]>([])
  const [requests, setRequests] = useState<PlanRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [excluindoId, setExcluindoId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [{ data: dietasData }, { data: requestsData }] = await Promise.all([
      supabase
        .from('diets')
        .select('*, profiles!diets_client_id_fkey(full_name, email)')
        .eq('professional_id', user.id)
        .order('updated_at', { ascending: false }),
      // Solicitações vinculadas ao profissional OU sem profissional (abertas)
      // Filtro de tipo: apenas dieta ou ambos
      supabase
        .from('plan_requests')
        .select('id, client_id, professional_id, type, status, created_at, profiles!plan_requests_client_id_fkey(full_name, email)')
        .or(`professional_id.eq.${user.id},professional_id.is.null`)
        .eq('status', 'pending')
        .in('type', ['diet', 'both'])
        .order('created_at', { ascending: false }),
    ])
    setDietas(dietasData ?? [])
    setRequests((requestsData ?? []) as unknown as PlanRequest[])
    setLoading(false)
  }, [])

  async function ignorarRequest(id: string) {
    await supabase.from('plan_requests').update({ status: 'cancelled' }).eq('id', id)
    setRequests(prev => prev.filter(r => r.id !== id))
  }

  useEffect(() => { load() }, [load])

  async function handleExcluir(id: string) {
    setExcluindoId(id)
    await supabase.from('diets').delete().eq('id', id)
    setDietas(prev => prev.filter(d => d.id !== id))
    setExcluindoId(null)
    setConfirmId(null)
  }


  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Dietas</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Crie planos a partir das solicitações dos clientes abaixo.
        </p>
      </div>

      {/* Estado vazio: nenhuma solicitação */}
      {!loading && requests.length === 0 && dietas.length === 0 && (
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

      {/* Solicitações pendentes de dieta */}
      {requests.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-500" />
            <h3 className="font-semibold text-foreground text-sm">
              Aguardando dieta
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
                          Solicitou plano de {req.type === 'both' ? 'treino e dieta' : 'dieta'} · {formatDate(req.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Link href={`/profissional/dietas/nova?clientId=${req.client_id}&requestId=${req.id}`}>
                        <Button size="sm" className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs">
                          <Utensils className="w-3.5 h-3.5" />
                          Criar dieta
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

      {loading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map(i => (
            <Card key={i}><CardContent className="p-5 h-16 bg-muted/30 animate-pulse rounded-xl" /></Card>
          ))}
        </div>
      ) : dietas.length > 0 ? (
        <div className="grid gap-3">
          {dietas.map((dieta) => (
            <Card key={dieta.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      <p className="font-semibold text-foreground truncate">{dieta.name}</p>
                      <Badge variant={STATUS_VARIANT[dieta.status]} className="text-xs flex-shrink-0">
                        {STATUS_LABEL[dieta.status]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      {dieta.objective && (
                        <span className="text-xs text-muted-foreground">{dieta.objective}</span>
                      )}
                      {dieta.profiles && (
                        <span className="text-xs text-muted-foreground">
                          Cliente: {dieta.profiles.full_name ?? dieta.profiles.email}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">{formatDistanceToNow(dieta.updated_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Link href={`/profissional/dietas/${dieta.id}/editar`}>
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8 px-2 sm:px-3">
                        <Pencil className="w-3 h-3" />
                        <span className="hidden sm:inline">Editar</span>
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                      onClick={() => setConfirmId(dieta.id)}
                      disabled={excluindoId === dieta.id}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                    <Link href={`/profissional/dietas/${dieta.id}`}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-primary">
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      <AlertDialog open={!!confirmId} onOpenChange={open => !open && setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir dieta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. Todas as refeições e alimentos desta dieta serão apagados permanentemente.
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
