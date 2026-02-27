import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req: NextRequest) {
  try {
    const { email, password, fullName, token, role, professionalType } = await req.json()

    if (!email || !password || !token) {
      return NextResponse.json({ error: 'Dados obrigatórios ausentes.' }, { status: 400 })
    }

    // Cria o usuário com e-mail já confirmado (pula etapa de verificação)
    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName ?? '' },
    })

    if (createError) {
      console.error('[create-account] createUser error:', createError)
      // Usuário já existe → tenta só atualizar a senha e confirmar
      if (createError.message?.includes('already been registered') || createError.code === 'email_exists') {
        return NextResponse.json({ error: 'Este e-mail já possui uma conta.' }, { status: 409 })
      }
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    const userId = createData.user.id

    // Atualiza o perfil com role e tipo profissional
    await supabaseAdmin
      .from('profiles')
      .update({
        full_name: fullName ?? '',
        role: role ?? 'user',
        professional_type: professionalType ?? null,
      })
      .eq('id', userId)

    // Marca o convite como utilizado
    await supabaseAdmin
      .from('invitations')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token)

    return NextResponse.json({ ok: true, userId })
  } catch (err) {
    console.error('[create-account] unexpected error:', err)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
