-- =============================================================================
-- ECOFIT — Gamificação da Dieta
-- =============================================================================
-- Dieta gamificada igual ao treino: marcar refeições do dia e ganhar XP/streak.
-- Execute após 021_diet_supplements.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tabela diet_sessions: cada dia de dieta cumprido
-- -----------------------------------------------------------------------------
create table if not exists public.diet_sessions (
  id                    uuid        primary key default gen_random_uuid(),
  user_id               uuid        not null references public.profiles(id) on delete cascade,
  diet_id               uuid        not null references public.diets(id) on delete cascade,
  date                  date        not null default current_date,
  completed_meal_ids    uuid[]      not null default '{}',
  total_meals           int         not null default 0,
  completed_count       int         not null default 0,
  is_complete           boolean     not null default false,
  xp_earned             int         not null default 0,
  started_at            timestamptz not null default now(),
  completed_at          timestamptz,
  created_at            timestamptz not null default now(),
  unique (user_id, diet_id, date)
);

comment on table public.diet_sessions is 'Registra cada dia de dieta cumprido: refeições marcadas e XP ganho.';

create index if not exists diet_sessions_user_idx   on public.diet_sessions (user_id);
create index if not exists diet_sessions_diet_idx    on public.diet_sessions (diet_id);
create index if not exists diet_sessions_date_idx    on public.diet_sessions (date);

-- -----------------------------------------------------------------------------
-- 2. user_gamification: colunas de dieta
-- -----------------------------------------------------------------------------
alter table public.user_gamification
  add column if not exists total_diet_sessions    int     not null default 0,
  add column if not exists last_diet_date         date,
  add column if not exists diet_streak_days       int     not null default 0,
  add column if not exists longest_diet_streak   int     not null default 0;

comment on column public.user_gamification.total_diet_sessions   is 'Total de dias com dieta completa (todas as refeições).';
comment on column public.user_gamification.last_diet_date          is 'Última data em que a dieta foi completada.';
comment on column public.user_gamification.diet_streak_days        is 'Dias consecutivos cumprindo dieta.';
comment on column public.user_gamification.longest_diet_streak    is 'Maior sequência de dias cumprindo dieta.';

-- -----------------------------------------------------------------------------
-- 3. RLS — diet_sessions
-- -----------------------------------------------------------------------------
alter table public.diet_sessions enable row level security;

create policy "Usuário vê suas próprias sessões de dieta"
  on public.diet_sessions for select
  using (auth.uid() = user_id);

create policy "Usuário insere suas próprias sessões de dieta"
  on public.diet_sessions for insert
  with check (auth.uid() = user_id);

create policy "Usuário atualiza suas próprias sessões de dieta"
  on public.diet_sessions for update
  using (auth.uid() = user_id);

create policy "Profissional vê sessões de dieta de seus clientes"
  on public.diet_sessions for select
  using (
    exists (
      select 1 from public.diets
      where id = diet_id and professional_id = auth.uid()
    )
  );
