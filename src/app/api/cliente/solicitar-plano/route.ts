import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const profileRow = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileRow.data?.role !== 'user') {
    return NextResponse.json({ error: 'Apenas clientes podem solicitar planos.' }, { status: 403 })
  }

  // Ler tipo do body (workout | diet | both) — padrão: 'both'
  let requestType: 'workout' | 'diet' | 'both' = 'both'
  try {
    const body = await req.json()
    if (body?.type && ['workout', 'diet', 'both'].includes(body.type)) {
      requestType = body.type
    }
  } catch {
    // body vazio ou inválido: usa padrão 'both'
  }

  const today = new Date().toISOString().slice(0, 10)

  // Verificar plano ativo de treino (se solicitando treino ou ambos)
  if (requestType === 'workout' || requestType === 'both') {
    const { data: activePlan } = await supabase
      .from('workouts')
      .select('id')
      .eq('client_id', user.id)
      .eq('status', 'sent')
      .or(`end_date.is.null,end_date.gte.${today}`)
      .limit(1)
      .maybeSingle()

    if (activePlan) {
      return NextResponse.json(
        { error: 'Você já tem um plano de treino ativo. Aguarde o término para solicitar um novo.' },
        { status: 400 }
      )
    }
  }

  // Verificar plano ativo de dieta (se solicitando dieta ou ambos)
  if (requestType === 'diet' || requestType === 'both') {
    const { data: activeDiet } = await supabase
      .from('diets')
      .select('id')
      .eq('client_id', user.id)
      .eq('status', 'sent')
      .or(`end_date.is.null,end_date.gte.${today}`)
      .limit(1)
      .maybeSingle()

    if (activeDiet) {
      return NextResponse.json(
        { error: 'Você já tem um plano de dieta ativo. Aguarde o término para solicitar um novo.' },
        { status: 400 }
      )
    }
  }

  // Verificar se já existe solicitação pendente do mesmo tipo
  const typeFilter =
    requestType === 'both'
      ? ['workout', 'diet', 'both']
      : [requestType, 'both']

  const { data: existing } = await supabase
    .from('plan_requests')
    .select('id, type')
    .eq('client_id', user.id)
    .in('status', ['pending', 'in_progress'])
    .in('type', typeFilter)
    .limit(1)
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { error: 'Você já tem uma solicitação em andamento para este tipo de plano.' },
      { status: 400 }
    )
  }

  // Descobrir profissional vinculado:
  // 1º) pelo convite que trouxe o cliente (invited_by)
  // 2º) pelo último plano (treino ou dieta) recebido
  let professionalId: string | null = null

  // Buscar no convite — mais confiável para clientes novos
  const { data: invite } = await supabase
    .from('invitations')
    .select('invited_by')
    .eq('email', user.email!)
    .not('used_at', 'is', null)
    .order('used_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (invite?.invited_by) {
    professionalId = invite.invited_by
  } else {
    // Fallback: último treino ou dieta enviado
    const [{ data: lastWorkout }, { data: lastDiet }] = await Promise.all([
      supabase
        .from('workouts')
        .select('professional_id')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('diets')
        .select('professional_id')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])
    professionalId = lastWorkout?.professional_id ?? lastDiet?.professional_id ?? null
  }

  const { data: request, error } = await supabase
    .from('plan_requests')
    .insert({
      client_id: user.id,
      professional_id: professionalId,
      type: requestType,
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    console.error('[solicitar-plano] erro ao inserir:', error)
    return NextResponse.json({ error: 'Erro ao criar solicitação.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, request })
}
