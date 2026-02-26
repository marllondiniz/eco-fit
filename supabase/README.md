# Supabase – ECOFIT

## Login, criar conta e trocar senha

Essas ações usam o **Supabase Auth** (tabela `auth.users`). Não é necessário criar SQL para que funcionem.

Confirme no **Dashboard do Supabase**:

1. **Authentication → Providers → Email**
   - Habilitar **Email**.
   - Se quiser confirmação por e-mail ao criar conta, ative **Confirm email**.

2. **Authentication → URL Configuration**
   - Em **Redirect URLs**, adicione:
     - `http://localhost:3030/redefinir-senha` (desenvolvimento)
     - Sua URL de produção, ex.: `https://seusite.com/redefinir-senha`

3. **Authentication → Email Templates** (opcional)
   - Ajuste os textos de “Confirm signup” e “Reset password” se quiser.

## O que o SQL faz

O arquivo `migrations/001_auth_profiles.sql`:

- Cria a tabela **`public.profiles`** (perfil por usuário).
- Liga **`auth.users`** a **`public.profiles`** com um **trigger**: ao criar conta, uma linha em `profiles` é criada automaticamente.
- Ativa **RLS** em `profiles` e políticas para o usuário ver/editar só o próprio perfil.

## Como rodar a migration

1. Abra o [Supabase Dashboard](https://supabase.com/dashboard) e selecione o projeto.
2. Vá em **SQL Editor**.
3. Cole o conteúdo de `migrations/001_auth_profiles.sql`.
4. Clique em **Run**.

Pronto. Novos cadastros passam a ter uma linha em `public.profiles` automaticamente.
