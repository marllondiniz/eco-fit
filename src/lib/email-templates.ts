// Templates de e-mail HTML para LB.FIT
// Identidade visual: verde #16a34a, fundo escuro, tipografia limpa

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://lb.fit'

function baseHtml(title: string, preview: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <meta name="description" content="${preview}" />
</head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;min-height:100vh;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <div style="display:inline-flex;align-items:center;gap:10px;">
                <div style="width:40px;height:40px;background:#16a34a;border-radius:10px;display:flex;align-items:center;justify-content:center;">
                  <span style="color:#fff;font-weight:800;font-size:18px;font-family:sans-serif;line-height:1;display:block;text-align:center;padding-top:10px;">L</span>
                </div>
                <span style="color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">LB<span style="color:#16a34a;">.FIT</span></span>
              </div>
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
              <p style="color:#555;font-size:12px;margin:0;line-height:1.6;">
                © ${new Date().getFullYear()} LB.FIT · Todos os direitos reservados<br/>
                <span style="color:#444;">Você recebeu este e-mail por ser parte da plataforma LB.FIT.</span>
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
  nomeConvidado,
  nomeConvidante,
  role,
  inviteUrl,
  expiresHours = 48,
}: {
  nomeConvidado: string | null
  nomeConvidante: string
  role: 'user' | 'personal'
  inviteUrl: string
  expiresHours?: number
}) {
  const roleLabel = role === 'personal' ? 'profissional' : 'cliente'
  const saudacao = nomeConvidado ? `Olá, ${nomeConvidado}!` : 'Olá!'

  const body = `
    <div style="padding:40px 36px;">
      <p style="color:#16a34a;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin:0 0 16px;">Convite LB.FIT</p>
      <h1 style="color:#ffffff;font-size:24px;font-weight:800;margin:0 0 12px;line-height:1.3;">
        Você foi convidado para o LB.FIT
      </h1>
      <p style="color:#aaa;font-size:15px;line-height:1.7;margin:0 0 28px;">
        ${saudacao} <strong style="color:#fff;">${nomeConvidante}</strong> convidou você para ingressar como <strong style="color:#16a34a;">${roleLabel}</strong> na plataforma LB.FIT — sua plataforma de acompanhamento de treino e nutrição.
      </p>

      <div style="background:#111;border:1px solid #2a2a2a;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
        <p style="color:#555;font-size:12px;margin:0 0 6px;text-transform:uppercase;letter-spacing:1px;">Link de acesso</p>
        <p style="color:#aaa;font-size:12px;margin:0;word-break:break-all;">${inviteUrl}</p>
      </div>

      <a href="${inviteUrl}" style="display:block;background:#16a34a;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:15px 24px;border-radius:12px;text-align:center;margin-bottom:24px;">
        Aceitar convite e criar conta
      </a>

      <p style="color:#555;font-size:12px;margin:0;text-align:center;">
        Este convite expira em ${expiresHours} horas. Se você não esperava este e-mail, pode ignorá-lo.
      </p>
    </div>
  `

  return {
    subject: 'Você foi convidado para o LB.FIT',
    html: baseHtml('Convite — LB.FIT', `${nomeConvidante} convidou você para o LB.FIT`, body),
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
