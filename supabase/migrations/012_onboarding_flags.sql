-- =============================================================================
-- ECOFIT — Onboarding obrigatório de perfil / anamnese
-- =============================================================================
-- 1) Adiciona flag de onboarding em profiles
-- 2) Adiciona flag de confirmação em client_anamnese
-- =============================================================================

alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false;

comment on column public.profiles.onboarding_completed is
  'Indica se o usuário concluiu o fluxo obrigatório de configuração de perfil.';

alter table public.client_anamnese
  add column if not exists confirmed boolean not null default false;

comment on column public.client_anamnese.confirmed is
  'Se o cliente marcou a confirmação de veracidade das informações da anamnese.';

