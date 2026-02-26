import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { emailConvite } from '@/lib/email-templates'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://lb.fit'

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const FROM   = process.env.FROM_EMAIL ?? 'LB.FIT <no-reply@lb.fit>'
  try {
    const { invitationId, invitedByName } = await req.json()

    if (!invitationId) {
      return NextResponse.json({ error: 'invitationId obrigatório.' }, { status: 400 })
    }

    // Busca o convite no banco
    const { data: invitation, error: invErr } = await supabaseAdmin
      .from('invitations')
      .select('email, token, role, expires_at')
      .eq('id', invitationId)
      .single()

    if (invErr || !invitation) {
      return NextResponse.json({ error: 'Convite não encontrado.' }, { status: 404 })
    }

    const inviteUrl = `${APP_URL}/criar-conta?token=${invitation.token}`
    const expiresAt = new Date(invitation.expires_at)
    const hoursUntilExpiry = Math.round((expiresAt.getTime() - Date.now()) / 3_600_000)

    const template = emailConvite({
      nomeConvidado:  null,
      nomeConvidante: invitedByName ?? 'LB.FIT',
      role:           invitation.role,
      inviteUrl,
      expiresHours:   Math.max(hoursUntilExpiry, 1),
    })

    const { error: sendErr } = await resend.emails.send({
      from:    FROM,
      to:      invitation.email,
      subject: template.subject,
      html:    template.html,
    })

    if (sendErr) {
      console.error('[invite] Resend error:', sendErr)
      return NextResponse.json({ error: 'Erro ao enviar e-mail.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[invite] Unexpected error:', err)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
