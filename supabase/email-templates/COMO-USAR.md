# Templates de e-mail – ECOFIT

Use estes templates no **Supabase Dashboard**:

**Authentication** → **Email Templates**  
[https://supabase.com/dashboard/project/_/auth/templates](https://supabase.com/dashboard/project/_/auth/templates)

---

## 1. Confirm signup (Confirmar conta)

### Subject (assunto)
```
Confirme sua conta no ECOFIT
```

### Message body (corpo)
Copie **todo** o conteúdo do arquivo `confirmar-conta.html` (incluindo as variáveis `{{ .ConfirmationURL }}` e `{{ .Email }}` — não altere essas partes).

Ou use o conteúdo resumido abaixo se preferir um e-mail mais simples:

```html
<h2>Confirme sua conta</h2>
<p>Olá! Você criou uma conta no ECOFIT com o e-mail <strong>{{ .Email }}</strong>.</p>
<p>Clique no link abaixo para ativar sua conta:</p>
<p><a href="{{ .ConfirmationURL }}">Confirmar e-mail</a></p>
<p style="color: #666; font-size: 12px;">Se você não criou esta conta, ignore este e-mail. O link expira em 24 horas.</p>
```
(Os templates completos não exibem o link de confirmação em texto — apenas o botão.)

---

## 2. Reset password (Esqueci a senha)

### Subject (assunto)
```
Redefinir sua senha - ECOFIT
```

### Message body (corpo)
Copie **todo** o conteúdo do arquivo `esqueci-senha.html` (mantenha as variáveis `{{ .ConfirmationURL }}` e `{{ .Email }}`).

Ou use o conteúdo resumido abaixo:

```html
<h2>Redefinir sua senha</h2>
<p>Olá! Recebemos uma solicitação para redefinir a senha da conta <strong>{{ .Email }}</strong>.</p>
<p>Clique no link abaixo para criar uma nova senha:</p>
<p><a href="{{ .ConfirmationURL }}">Redefinir senha</a></p>
<p style="color: #666; font-size: 12px;">Se você não pediu a redefinição, ignore este e-mail. O link expira em 1 hora.</p>
```
(Os templates completos não exibem o link em texto — apenas o botão.)

---

## Passo a passo no Dashboard

1. Abra **Authentication** → **Email Templates**.
2. Em **Confirm signup**:
   - **Subject:** cole o assunto da confirmação de conta.
   - **Message body:** cole o HTML completo de `confirmar-conta.html`.
3. Em **Reset password**:
   - **Subject:** cole o assunto de redefinir senha.
   - **Message body:** cole o HTML completo de `esqueci-senha.html`.
4. Clique em **Save** em cada template.

As variáveis `{{ .ConfirmationURL }}` e `{{ .Email }}` são substituídas automaticamente pelo Supabase ao enviar o e-mail.
