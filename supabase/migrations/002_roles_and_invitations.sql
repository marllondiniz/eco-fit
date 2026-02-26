-- =============================================================================
-- ECOFIT — Roles e Convites
-- =============================================================================
-- Adiciona o campo de role em profiles e cria o sistema de convites para
-- profissionais. Roles: user (padrão), personal (profissional), admin.
-- Execute no SQL Editor do Supabase após 001_auth_profiles.sql.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Enum user_role
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'user_role'
  ) then
    create type public.user_role as enum ('user', 'personal', 'admin');
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 2. Coluna role em public.profiles
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists role public.user_role not null default 'user';

comment on column public.profiles.role is 'Tipo de conta: user (cliente), personal (profissional), admin.';

create index if not exists profiles_role_idx on public.profiles (role);

-- -----------------------------------------------------------------------------
-- 3. Tabela public.invitations (convites para profissionais)
-- -----------------------------------------------------------------------------
create table if not exists public.invitations (
  id          uuid        primary key default gen_random_uuid(),
  email       text        not null,
  role        public.user_role not null default 'personal',
  token       text        not null unique default encode(gen_random_bytes(32), 'hex'),
  invited_by  uuid        references public.profiles(id) on delete set null,
  used_at     timestamptz,
  expires_at  timestamptz not null default now() + interval '7 days',
  created_at  timestamptz not null default now()
);

comment on table public.invitations is 'Convites enviados pelo admin para profissionais se cadastrarem.';

create index if not exists invitations_token_idx on public.invitations (token);
create index if not exists invitations_email_idx on public.invitations (email);

-- -----------------------------------------------------------------------------
-- 4. RLS em invitations
-- -----------------------------------------------------------------------------
alter table public.invitations enable row level security;

-- Qualquer pessoa pode ler um convite pelo token (necessário no signup)
create policy "Leitura pública de convite por token"
  on public.invitations for select
  using (true);

-- Apenas admin pode criar convites
create policy "Admin pode criar convites"
  on public.invitations for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Apenas admin pode atualizar convites
create policy "Admin pode atualizar convites"
  on public.invitations for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- -----------------------------------------------------------------------------
-- 5. Policy extra: admins podem ver todos os perfis
-- -----------------------------------------------------------------------------
-- Remover policies antigas para permitir reexecução da migração
drop policy if exists "Usuários podem ver o próprio perfil" on public.profiles;
drop policy if exists "Admins podem ver todos os perfis" on public.profiles;

create policy "Admins podem ver todos os perfis"
  on public.profiles for select
  using (
    auth.uid() = id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
