import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { emailResetSenha } from '@/lib/email-templates'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://lb.fit'

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const FROM    = process.env.FROM_EMAIL ?? 'LB.FIT <no-reply@lb.fit>'
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json({ error: 'E-mail obrigatório.' }, { status: 400 })
    }

    // Usa o admin client para gerar o link de reset (sem expor service role no front)
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type:       'recovery',
      email:      email.trim().toLowerCase(),
      options: {
        redirectTo: `${APP_URL}/redefinir-senha`,
      },
    })

    if (linkErr || !linkData?.properties?.action_link) {
      // Não revelamos se o e-mail existe ou não (segurança)
      return NextResponse.json({ ok: true })
    }

    // Busca o nome do usuário
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', linkData.user.id)
      .maybeSingle()

    const template = emailResetSenha({
      nome:     profile?.full_name ?? null,
      resetUrl: linkData.properties.action_link,
    })

    await resend.emails.send({
      from:    FROM,
      to:      email.trim().toLowerCase(),
      subject: template.subject,
      html:    template.html,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[reset-password] Unexpected error:', err)
    return NextResponse.json({ ok: true }) // sempre retorna ok para não vazar info
  }
}
