-- =============================================================================
-- ECOFIT — Ajuste RLS em profiles: admin vê todos, personal vê todos os users
-- =============================================================================
-- Corrige: admin não via personal/user; personal não via users (clientes).
-- Execute após 002_roles_and_invitations.sql e 003_plans.sql.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Funções auxiliares com SECURITY DEFINER (evitam recursão na RLS)
-- -----------------------------------------------------------------------------
create or replace function public.current_user_is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.current_user_is_personal()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'personal'
  );
$$;

comment on function public.current_user_is_admin()   is 'Retorna true se o usuário atual for admin.';
comment on function public.current_user_is_personal() is 'Retorna true se o usuário atual for personal.';

-- -----------------------------------------------------------------------------
-- 2. Remover policies antigas e criar as novas
-- -----------------------------------------------------------------------------
drop policy if exists "Usuários podem ver o próprio perfil"           on public.profiles;
drop policy if exists "Admins podem ver todos os perfis"              on public.profiles;
drop policy if exists "Profissionais podem ver perfis de seus clientes" on public.profiles;

-- Qualquer usuário autenticado pode ver o próprio perfil
create policy "Usuário vê o próprio perfil"
  on public.profiles for select
  using (auth.uid() = id);

-- Admins veem todos os perfis (personal + user + admin)
create policy "Admin vê todos os perfis"
  on public.profiles for select
  using (public.current_user_is_admin());

-- Profissionais (personal) veem todos os perfis com role = 'user'
create policy "Personal vê todos os clientes (user)"
  on public.profiles for select
  using (
    public.current_user_is_personal()
    and role = 'user'
  );
