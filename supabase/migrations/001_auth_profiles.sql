-- =============================================================================
-- ECOFIT - Supabase: Auth + Perfis
-- =============================================================================
-- Login, criar conta e trocar senha usam o Supabase Auth (tabela auth.users).
-- Este migration cria a tabela de perfis e a liga ao Auth com trigger e RLS.
-- Execute no SQL Editor do Supabase: https://supabase.com/dashboard → SQL Editor
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tabela public.profiles (dados extras do usuário, ligada a auth.users)
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid not null references auth.users on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (id)
);

comment on table public.profiles is 'Perfis dos usuários; uma linha por auth.users.';

-- Índice para buscas por email (opcional)
create index if not exists profiles_email_idx on public.profiles (email);

-- -----------------------------------------------------------------------------
-- 2. Row Level Security (RLS)
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;

-- Usuário pode ver apenas o próprio perfil
create policy "Usuários podem ver o próprio perfil"
  on public.profiles for select
  using (auth.uid() = id);

-- Usuário pode atualizar apenas o próprio perfil
create policy "Usuários podem atualizar o próprio perfil"
  on public.profiles for update
  using (auth.uid() = id);

-- Inserção só via trigger (service role / trigger), não por usuário logado
-- Se quiser que o usuário possa inserir o próprio perfil uma vez, descomente:
-- create policy "Usuários podem inserir o próprio perfil"
--   on public.profiles for insert
--   with check (auth.uid() = id);

-- -----------------------------------------------------------------------------
-- 3. Trigger: ao criar usuário no Auth, criar perfil em public.profiles
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')
  );
  return new;
end;
$$;

comment on function public.handle_new_user() is 'Cria linha em public.profiles quando um novo usuário é criado em auth.users.';

-- Só cria o trigger se não existir (evita erro ao reexecutar)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 4. Atualizar updated_at automaticamente
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 5. (Opcional) Preencher perfis para usuários que já existiam antes do trigger
-- -----------------------------------------------------------------------------
insert into public.profiles (id, email, full_name)
select id, email, coalesce(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name', '')
from auth.users
on conflict (id) do update set
  email = excluded.email,
  full_name = coalesce(profiles.full_name, excluded.full_name);
