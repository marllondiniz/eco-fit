-- =============================================================================
-- ECOFIT — Tipos de profissional (personal / nutricionista / ambos)
-- =============================================================================
-- Mantemos o enum user_role como está (user, personal, admin) e criamos um
-- novo enum professional_type para especializar o profissional:
--   - personal      -> foca em treinos
--   - nutritionist  -> foca em dietas
--   - both          -> faz ambos
--
-- Esse tipo é salvo em profiles e também nos convites (invitations).
-- =============================================================================

-- 1) Enum professional_type
do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'professional_type'
  ) then
    create type public.professional_type as enum ('personal', 'nutritionist', 'both');
  end if;
end $$;

comment on type public.professional_type is 'Especialização do profissional: personal, nutritionist, both.';

-- 2) Coluna em profiles
alter table public.profiles
  add column if not exists professional_type public.professional_type;

comment on column public.profiles.professional_type is 'Tipo de profissional: personal, nutritionist ou both.';

-- Preenche profissionais existentes como "both" (já tinham acesso a dietas e treinos)
update public.profiles
set professional_type = 'both'
where role = 'personal' and professional_type is null;

-- 3) Coluna em invitations
alter table public.invitations
  add column if not exists professional_type public.professional_type;

comment on column public.invitations.professional_type is 'Tipo de profissional convidado: personal, nutritionist ou both.';

