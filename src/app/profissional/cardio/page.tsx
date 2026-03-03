'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Activity,
  Bell,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Send,
  Pencil,
  Calendar,
  CheckCircle2,
  Circle,
  X,
  Loader2,
  Trash2,
} from 'lucide-react'
import { formatDate, getLocalDateString } from '@/lib/date-utils'

interface PlanRequest {
  id: string
  client_id: string
  type: string
  profiles: { id?: string; full_name: string | null; email: string | null } | null
}

interface CardioPlan {
  id: string
  client_id: string
  prescription: string
  status: string
  sent_at: string | null
  start_date: string | null
  end_date: string | null
  profiles: { full_name: string | null } | null
}

export default function CardioPage() {
  const [plans, setPlans] = useState<CardioPlan[]>([])
  const [requests, setRequests] = useState<PlanRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClient, setSelectedClient] = useState<{
    id: string
    name: string
  } | null>(null)
  const [prescription, setPrescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [editPlanId, setEditPlanId] = useState<string | null>(null)
  const [historyClient, setHistoryClient] = useState<{ id: string; name: string } | null>(null)
  const [historySessions, setHistorySessions] = useState<any[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [dateError, setDateError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [creatingForRequestId, setCreatingForRequestId] = useState<string | null>(null)
  const [confirmExcluirId, setConfirmExcluirId] = useState<string | null>(null)
  const [excluindoId, setExcluindoId] = useState<string | null>(null)

  const today = getLocalDateString()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [
      { data: plansData },
      { data: requestsData },
    ] = await Promise.all([
      supabase
        .from('cardio_plans')
        .select('*, profiles!cardio_plans_client_id_fkey(full_name)')
        .eq('professional_id', user.id)
        .order('updated_at', { ascending: false }),
      supabase
        .from('plan_requests')
        .select('id, client_id, type, profiles!plan_requests_client_id_fkey(id, full_name, email)')
        .or(`professional_id.eq.${user.id},professional_id.is.null`)
        .eq('status', 'pending')
        .in('type', ['cardio', 'both'])
        .order('created_at', { ascending: false }),
    ])

    setPlans((plansData ?? []) as CardioPlan[])
    setRequests((requestsData ?? []) as unknown as PlanRequest[])
    setUserId(user.id)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function loadHistory(clientId: string) {
    const uid = userId ?? (await supabase.auth.getUser()).data.user?.id
    if (!uid) return
    const { data: plans } = await supabase
      .from('cardio_plans')
      .select('id')
      .eq('client_id', clientId)
      .eq('professional_id', uid)
    const planIds = (plans ?? []).map((p: any) => p.id)
    if (planIds.length === 0) {
      setHistorySessions([])
      return
    }
    const { data } = await supabase
      .from('cardio_sessions')
      .select('*, cardio_plans!inner(prescription)')
      .in('cardio_plan_id', planIds)
      .order('date', { ascending: false })
      .limit(50)
    setHistorySessions(data ?? [])
  }

  useEffect(() => {
    if (historyClient) loadHistory(historyClient.id)
  }, [historyClient?.id])

  function getDateLimits() {
    const now = new Date()
    const minDate = getLocalDateString(now)
    const maxYear = now.getFullYear() + 2
    const maxDate = `${maxYear}-12-31`
    return { minDate, maxDate }
  }

  async function handleSave() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSaveError('Você precisa estar logado para enviar.')
      return
    }
    if (!prescription.trim()) {
      setSaveError('Preencha a prescrição.')
      return
    }

    // Validar datas: fim >= início quando ambas preenchidas
    if (startDate && endDate) {
      const start = new Date(startDate).getTime()
      const end = new Date(endDate).getTime()
      if (end < start) {
        setDateError('A data de fim deve ser igual ou posterior à data de início.')
        setSaveError(null)
        return
      }
    }
    setDateError(null)
    setSaveError(null)

    setSaving(true)
    try {
      const clientId = selectedClient?.id
        ?? (editPlanId ? plans.find(p => p.id === editPlanId)?.client_id : null)
        ?? (creatingForRequestId ? requests.find(r => r.id === creatingForRequestId)?.client_id : null)
        ?? null

      if (!clientId) {
        setSaveError('Cliente não identificado.')
        setSaving(false)
        return
      }

      const payload = {
        professional_id: user.id,
        client_id: clientId,
        prescription: prescription.trim(),
        status: 'sent' as const,
        sent_at: new Date().toISOString(),
        start_date: startDate || null,
        end_date: endDate || null,
        duration_weeks: startDate && endDate
          ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (7 * 24 * 60 * 60 * 1000))
          : null,
      }

      if (editPlanId) {
        const { error } = await supabase
          .from('cardio_plans')
          .update(payload)
          .eq('id', editPlanId)
        if (error) {
          setSaveError(error.message ?? 'Erro ao salvar. Tente novamente.')
        } else {
          closeForm()
          load()
        }
      } else {
        const { error } = await supabase.from('cardio_plans').insert(payload)
        if (error) {
          setSaveError(error.message ?? 'Erro ao enviar. Tente novamente.')
        } else {
          if (creatingForRequestId) {
            await supabase
              .from('plan_requests')
              .update({ status: 'completed', professional_id: user.id })
              .eq('id', creatingForRequestId)
          }
          await supabase
            .from('plan_requests')
            .update({ status: 'completed', professional_id: user.id })
            .eq('client_id', clientId)
            .eq('type', 'cardio')
            .in('status', ['pending', 'in_progress'])
          closeForm()
          load()
        }
      }
    } finally {
      setSaving(false)
    }
  }

  function getDefaultEndDate(): string {
    const d = new Date()
    d.setDate(d.getDate() + 12 * 7) // 12 semanas
    return getLocalDateString(d)
  }

  async function fetchWorkoutDatesForClient(clientId: string): Promise<{ start_date: string; end_date: string } | null> {
    const { data } = await supabase
      .from('workouts')
      .select('start_date, end_date')
      .eq('client_id', clientId)
      .eq('status', 'sent')
      .or(`end_date.is.null,end_date.gte.${today}`)
      .order('end_date', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle()
    if (data?.start_date && data?.end_date) return { start_date: data.start_date, end_date: data.end_date }
    if (data?.start_date) return { start_date: data.start_date, end_date: getDefaultEndDate() }
    return null
  }

  function startCreate(clientId: string, clientName: string, requestId?: string) {
    setEditPlanId(null)
    setCreatingForRequestId(requestId ?? null)
    setSelectedClient({ id: clientId, name: clientName })
    setPrescription('')
    setStartDate(today)
    setEndDate(getDefaultEndDate())
    setSaveError(null)
    fetchWorkoutDatesForClient(clientId).then(dates => {
      if (dates) {
        setStartDate(dates.start_date)
        setEndDate(dates.end_date)
      }
    })
  }

  function closeForm() {
    setEditPlanId(null)
    setSelectedClient(null)
    setCreatingForRequestId(null)
    setPrescription('')
    setStartDate('')
    setEndDate('')
    setDateError(null)
    setSaveError(null)
  }

  function startEdit(plan: CardioPlan) {
    setSelectedClient(null)
    setEditPlanId(plan.id)
    setPrescription(plan.prescription)
    setStartDate(plan.start_date ?? '')
    setEndDate(plan.end_date ?? '')
    setDateError(null)
  }

  async function handleExcluir(id: string) {
    setExcluindoId(id)
    const { error } = await supabase.from('cardio_plans').delete().eq('id', id)
    setConfirmExcluirId(null)
    setExcluindoId(null)
    if (!error) {
      if (editPlanId === id) closeForm()
      load()
    }
  }

  const isFormOpen = !!selectedClient || !!editPlanId
  const currentClientName = selectedClient?.name ?? (editPlanId ? plans.find(p => p.id === editPlanId)?.profiles?.full_name ?? 'Cliente' : '')

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Activity className="w-7 h-7 text-primary" />
          Cardio
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Prescrição simples em texto livre. A solicitação chega junto com o treino.
        </p>
      </div>

      {/* Solicitações pendentes (treino = treino + cardio) */}
      {requests.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-500" />
            <h3 className="font-semibold text-foreground text-sm">
              Aguardando cardio
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 text-xs font-bold">
                {requests.length}
              </span>
            </h3>
          </div>
          {requests.map(req => {
            const name = req.profiles?.full_name ?? req.profiles?.email ?? 'Cliente'
            return (
              <Card key={req.id} className="border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center">
                      <UserCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{name}</p>
                      <p className="text-xs text-muted-foreground">
                        Solicitou plano de cardio
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startCreate(req.client_id, name, req.id)}
                      className="gap-1.5"
                    >
                      <Activity className="w-3.5 h-3.5" /> Cardio
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Formulário criar/editar */}
      {isFormOpen && (
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              {editPlanId ? 'Editar prescrição' : 'Nova prescrição'} — {currentClientName}
              <Button
                variant="ghost"
                size="sm"
                onClick={closeForm}
              >
                <X className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Prescrição (texto livre)</Label>
              <Textarea
                placeholder='Ex: "30 min bike Z2", "HIIT 10 tiros 30s", "Caminhada leve 40 min pós-treino"'
                value={prescription}
                onChange={e => setPrescription(e.target.value)}
                className="mt-1.5 min-h-[100px]"
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Início</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={e => {
                    setDateError(null)
                    setStartDate(e.target.value)
                    if (endDate && e.target.value && new Date(e.target.value) > new Date(endDate)) {
                      setEndDate('')
                    }
                  }}
                  min={today}
                  max={getDateLimits().maxDate}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Fim</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={e => {
                    setDateError(null)
                    setEndDate(e.target.value)
                  }}
                  min={startDate || today}
                  max={getDateLimits().maxDate}
                  className="mt-1.5"
                />
              </div>
            </div>
            {dateError && (
              <p className="text-sm text-red-600 dark:text-red-400">{dateError}</p>
            )}
            {saveError && (
              <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                {saveError}
              </p>
            )}
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving || !prescription.trim()}
              className="w-full gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enviando…
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {editPlanId ? 'Salvar alterações' : 'Enviar prescrição'}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Planos cardio criados */}
      {plans.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Prescrições enviadas
          </h3>
          {plans.map(plan => {
            const isActive = plan.status === 'sent' && (!plan.end_date || plan.end_date >= today)
            const isExpanded = expandedId === plan.id
            return (
              <Card key={plan.id} className={isActive ? 'border-emerald-200 dark:border-emerald-800' : ''}>
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : plan.id)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                      <Activity className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground text-sm truncate">
                          {plan.profiles?.full_name ?? 'Cliente'}
                        </p>
                        {isActive && (
                          <Badge className="bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border-0 text-xs">
                            Ativo
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {plan.prescription || '—'}
                      </p>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {isExpanded && (
                  <div className="border-t border-border px-5 py-3 space-y-3">
                    <div className="rounded-lg bg-muted/50 p-3 text-sm whitespace-pre-wrap">
                      {plan.prescription || 'Sem descrição.'}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEdit(plan)}
                        className="gap-1.5"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setHistoryClient({ id: plan.client_id, name: plan.profiles?.full_name ?? 'Cliente' })
                          loadHistory(plan.client_id)
                        }}
                        className="gap-1.5"
                      >
                        <Calendar className="w-3.5 h-3.5" /> Ver histórico
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmExcluirId(plan.id)}
                        className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Excluir
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal histórico */}
      {historyClient && (
        <Card className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-50 md:max-w-lg md:max-h-[80vh] overflow-hidden flex flex-col">
          <CardHeader className="pb-2 flex-shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Histórico — {historyClient.name}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setHistoryClient(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            {historySessions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum registro.</p>
            ) : (
              <div className="space-y-2">
                {historySessions.map((s: any) => {
                  const d = new Date(s.date + 'T12:00:00')
                  const presc = s.cardio_plans?.prescription ?? '—'
                  return (
                    <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl border border-border">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        s.is_complete ? 'bg-emerald-100 dark:bg-emerald-900/60' : 'bg-muted'
                      }`}>
                        {s.is_complete
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          : <Circle className="w-4 h-4 text-muted-foreground" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{presc}</p>
                        <p className="text-xs text-muted-foreground">
                          {d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                      <Badge variant={s.is_complete ? 'default' : 'secondary'}>
                        {s.is_complete ? 'Concluído' : 'Não realizado'}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!confirmExcluirId} onOpenChange={open => !open && setConfirmExcluirId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir prescrição de cardio?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O plano e o histórico de sessões deste cliente serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!excluindoId}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmExcluirId && handleExcluir(confirmExcluirId)}
              disabled={!!excluindoId}
              className="bg-red-600 hover:bg-red-700"
            >
              {excluindoId ? 'Excluindo…' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
