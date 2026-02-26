-- =============================================================================
-- ECOFIT — Sincronizar role do profiles no JWT (app_metadata)
-- =============================================================================
-- O middleware lê o role diretamente do JWT (user.app_metadata.role),
-- sem depender de uma query RLS em profiles. Isso elimina o loop e garante
-- que a troca de role no banco reflita imediatamente no próximo login/refresh.
-- Execute no SQL Editor do Supabase após as migrações anteriores.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Função que copia profiles.role → auth.users.raw_app_meta_data
-- -----------------------------------------------------------------------------
create or replace function public.sync_role_to_jwt()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update auth.users
  set raw_app_meta_data =
    coalesce(raw_app_meta_data, '{}'::jsonb) ||
    jsonb_build_object('role', new.role::text)
  where id = new.id;
  return new;
end;
$$;

comment on function public.sync_role_to_jwt()
  is 'Mantém auth.users.raw_app_meta_data.role em sincronia com public.profiles.role.';

-- -----------------------------------------------------------------------------
-- 2. Triggers — dispara na criação e na atualização do role
-- -----------------------------------------------------------------------------
drop trigger if exists on_profiles_insert_sync_role on public.profiles;
create trigger on_profiles_insert_sync_role
  after insert on public.profiles
  for each row execute procedure public.sync_role_to_jwt();

drop trigger if exists on_profiles_role_update_sync on public.profiles;
create trigger on_profiles_role_update_sync
  after update of role on public.profiles
  for each row
  when (old.role is distinct from new.role)
  execute procedure public.sync_role_to_jwt();

-- -----------------------------------------------------------------------------
-- 3. Backfill — sincronizar roles de usuários já existentes
-- -----------------------------------------------------------------------------
update auth.users u
set raw_app_meta_data =
  coalesce(u.raw_app_meta_data, '{}'::jsonb) ||
  jsonb_build_object('role', p.role::text)
from public.profiles p
where p.id = u.id;
