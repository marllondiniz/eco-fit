-- =============================================================================
-- ECOFIT — Perfil estendido e Anamnese do cliente
-- =============================================================================
-- Execute após 006_workout_gamification.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tabela client_profiles: dados pessoais do usuário (além do profiles base)
-- -----------------------------------------------------------------------------
create table if not exists public.client_profiles (
  user_id          uuid        primary key references public.profiles(id) on delete cascade,
  age              int,
  sex              text        check (sex in ('male','female','other','prefer_not_to_say')),
  height_cm        numeric(5,1),
  weight_kg        numeric(5,1),
  goal             text        check (goal in (
    'weight_loss','muscle_gain','maintenance','health','performance','rehabilitation'
  )),
  activity_level   text        check (activity_level in (
    'sedentary','light','moderate','intense','athlete'
  )),
  avatar_url       text,
  updated_at       timestamptz not null default now()
);

comment on table public.client_profiles is 'Dados pessoais estendidos do cliente (idade, peso, objetivo, etc.).';

-- -----------------------------------------------------------------------------
-- 2. Tabela client_anamnese: histórico de saúde e preferências
-- -----------------------------------------------------------------------------
create table if not exists public.client_anamnese (
  user_id                 uuid        primary key references public.profiles(id) on delete cascade,
  health_history          text,
  injuries                text,
  diseases                text,
  medications             text,
  food_allergies          text,
  food_preferences        text,
  training_experience     text,
  notes                   text,
  updated_at              timestamptz not null default now()
);

comment on table public.client_anamnese is 'Anamnese do cliente: saúde, restrições, preferências e histórico de treino.';

-- -----------------------------------------------------------------------------
-- 3. RLS — client_profiles
-- -----------------------------------------------------------------------------
alter table public.client_profiles enable row level security;

create policy "Cliente gerencia o próprio perfil"
  on public.client_profiles for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Profissional visualiza perfil de seus clientes"
  on public.client_profiles for select
  using (
    exists (
      select 1 from public.workouts
      where client_id = user_id and professional_id = auth.uid()
      union
      select 1 from public.diets
      where client_id = user_id and professional_id = auth.uid()
    )
  );

create policy "Admin visualiza todos os perfis estendidos"
  on public.client_profiles for select
  using (public.current_user_is_admin());

-- -----------------------------------------------------------------------------
-- 4. RLS — client_anamnese
-- -----------------------------------------------------------------------------
alter table public.client_anamnese enable row level security;

create policy "Cliente gerencia a própria anamnese"
  on public.client_anamnese for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Profissional visualiza anamnese de seus clientes"
  on public.client_anamnese for select
  using (
    exists (
      select 1 from public.workouts
      where client_id = user_id and professional_id = auth.uid()
      union
      select 1 from public.diets
      where client_id = user_id and professional_id = auth.uid()
    )
  );

create policy "Admin visualiza todas as anamneses"
  on public.client_anamnese for select
  using (public.current_user_is_admin());

-- -----------------------------------------------------------------------------
-- 5. Triggers updated_at
-- -----------------------------------------------------------------------------
drop trigger if exists client_profiles_updated_at  on public.client_profiles;
drop trigger if exists client_anamnese_updated_at  on public.client_anamnese;

create trigger client_profiles_updated_at
  before update on public.client_profiles
  for each row execute procedure public.set_updated_at();

create trigger client_anamnese_updated_at
  before update on public.client_anamnese
  for each row execute procedure public.set_updated_at();
