// Templates de e-mail HTML para LB.FIT
// Identidade visual: verde #16a34a, fundo escuro, tipografia limpa

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://lbfit.app'

function baseHtml(title: string, preview: string, body: string): string {
  const logoUrl = `${BASE_URL}/logo-branco.png`

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <meta name="description" content="${preview}" />
</head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0f0f0f;padding:48px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:36px;">
              <a href="${BASE_URL}" style="text-decoration:none;display:inline-block;">
                <img src="${logoUrl}" alt="LB.FIT" width="120" height="auto"
                     style="display:block;border:0;height:auto;max-width:120px;" />
              </a>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#1a1a1a;border-radius:16px;border:1px solid #2a2a2a;overflow:hidden;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:28px;">
              <p style="color:#444444;font-size:12px;margin:0;line-height:1.7;font-family:Arial,sans-serif;">
                © ${new Date().getFullYear()} LB.FIT · Todos os direitos reservados<br/>
                <span style="color:#3a3a3a;">Você recebeu este e-mail por ser parte da plataforma LB.FIT.</span>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ─── Template: Convite ────────────────────────────────────────────────────────

export function emailConvite({
  role,
  inviteUrl,
  expiresHours = 168,
}: {
  nomeConvidado?: string | null
  nomeConvidante?: string
  role: 'user' | 'personal'
  inviteUrl: string
  expiresHours?: number
}) {
  const roleLabel = role === 'personal' ? 'profissional' : 'cliente'

  const body = `
    <div style="padding:40px 36px;">
      <p style="color:#16a34a;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 18px;font-family:Arial,sans-serif;">
        Convite LB.FIT
      </p>
      <h1 style="color:#ffffff;font-size:26px;font-weight:800;margin:0 0 14px;line-height:1.3;font-family:Arial,sans-serif;">
        Você foi convidado para o LB.FIT
      </h1>
      <p style="color:#aaaaaa;font-size:15px;line-height:1.75;margin:0 0 32px;font-family:Arial,sans-serif;">
        Olá! Você recebeu um convite para ingressar como <strong style="color:#16a34a;">${roleLabel}</strong> na plataforma <strong style="color:#ffffff;">LB.FIT</strong> — sua plataforma de acompanhamento de treino e nutrição.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
        <tr>
          <td align="center">
            <a href="${inviteUrl}"
               style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:16px 40px;border-radius:12px;font-family:Arial,sans-serif;letter-spacing:0.2px;">
              Aceitar convite e criar conta
            </a>
          </td>
        </tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
        <tr><td style="border-top:1px solid #2a2a2a;"></td></tr>
      </table>

      <p style="color:#555555;font-size:12px;margin:0;text-align:center;line-height:1.6;font-family:Arial,sans-serif;">
        Este convite expira em <strong style="color:#666;">${expiresHours} horas</strong>.<br/>
        Se você não esperava este e-mail, pode ignorá-lo com segurança.
      </p>
    </div>
  `

  return {
    subject: 'Você foi convidado para o LB.FIT',
    html: baseHtml('Convite — LB.FIT', 'Aceite seu convite para acessar o LB.FIT', body),
  }
}

// ─── Template: Confirmação de e-mail ─────────────────────────────────────────

export function emailConfirmacao({
  nome,
  confirmUrl,
}: {
  nome: string | null
  confirmUrl: string
}) {
  const saudacao = nome ? `Olá, ${nome}!` : 'Olá!'

  const body = `
    <div style="padding:40px 36px;">
      <p style="color:#16a34a;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin:0 0 16px;">Confirme seu e-mail</p>
      <h1 style="color:#ffffff;font-size:24px;font-weight:800;margin:0 0 12px;line-height:1.3;">
        Bem-vindo(a) ao LB.FIT!
      </h1>
      <p style="color:#aaa;font-size:15px;line-height:1.7;margin:0 0 28px;">
        ${saudacao} Sua conta foi criada com sucesso. Para ativar o acesso, confirme seu endereço de e-mail clicando no botão abaixo.
      </p>

      <a href="${confirmUrl}" style="display:block;background:#16a34a;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:15px 24px;border-radius:12px;text-align:center;margin-bottom:24px;">
        Confirmar meu e-mail
      </a>

      <p style="color:#555;font-size:12px;margin:0;text-align:center;">
        Se você não criou uma conta no LB.FIT, ignore este e-mail.
      </p>
    </div>
  `

  return {
    subject: 'Confirme seu e-mail — LB.FIT',
    html: baseHtml('Confirme seu e-mail — LB.FIT', 'Confirme seu endereço de e-mail para acessar o LB.FIT', body),
  }
}

// ─── Template: Redefinição de senha ──────────────────────────────────────────

export function emailResetSenha({
  nome,
  resetUrl,
}: {
  nome: string | null
  resetUrl: string
}) {
  const saudacao = nome ? `Olá, ${nome}!` : 'Olá!'

  const body = `
    <div style="padding:40px 36px;">
      <p style="color:#f59e0b;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin:0 0 16px;">Redefinição de senha</p>
      <h1 style="color:#ffffff;font-size:24px;font-weight:800;margin:0 0 12px;line-height:1.3;">
        Redefina sua senha
      </h1>
      <p style="color:#aaa;font-size:15px;line-height:1.7;margin:0 0 28px;">
        ${saudacao} Recebemos uma solicitação para redefinir a senha da sua conta LB.FIT. Clique no botão abaixo para criar uma nova senha.
      </p>

      <a href="${resetUrl}" style="display:block;background:#16a34a;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:15px 24px;border-radius:12px;text-align:center;margin-bottom:24px;">
        Redefinir minha senha
      </a>

      <div style="background:#1f1500;border:1px solid #3a2800;border-radius:10px;padding:16px 20px;margin-bottom:20px;">
        <p style="color:#f59e0b;font-size:12px;margin:0;">
          ⚠️ Este link expira em <strong>1 hora</strong>. Se você não solicitou a redefinição, sua senha permanece a mesma — não é necessária nenhuma ação.
        </p>
      </div>

      <p style="color:#555;font-size:12px;margin:0;text-align:center;">
        Por segurança, nunca compartilhe este link com ninguém.
      </p>
    </div>
  `

  return {
    subject: 'Redefinição de senha — LB.FIT',
    html: baseHtml('Redefinição de senha — LB.FIT', 'Redefina sua senha no LB.FIT', body),
  }
}
