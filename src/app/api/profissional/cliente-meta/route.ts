import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function PATCH(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const profile = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const role = profile.data?.role
  if (role !== 'professional' && role !== 'admin') {
    return NextResponse.json({ error: 'Apenas profissionais podem definir meta.' }, { status: 403 })
  }

  const body = await req.json()
  const { clientId, weeklyTarget } = body
  if (!clientId || typeof weeklyTarget !== 'number' || weeklyTarget < 2 || weeklyTarget > 7) {
    return NextResponse.json(
      { error: 'Envie clientId e weeklyTarget (número entre 2 e 7).' },
      { status: 400 }
    )
  }

  const { data: existing } = await supabase
    .from('user_gamification')
    .select('user_id')
    .eq('user_id', clientId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('user_gamification')
      .update({ weekly_target_sessions: weeklyTarget })
      .eq('user_id', clientId)
    if (error) {
      return NextResponse.json({ error: 'Erro ao salvar meta. Tente novamente.' }, { status: 500 })
    }
  } else {
    const { error } = await supabase.from('user_gamification').insert({
      user_id: clientId,
      weekly_target_sessions: weeklyTarget,
    })
    if (error) {
      return NextResponse.json({ error: 'Erro ao salvar meta. Tente novamente.' }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
