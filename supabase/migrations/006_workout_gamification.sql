-- =============================================================================
-- ECOFIT — Gamificação e Sessões de Treino
-- =============================================================================
-- Cria tabelas para rastrear sessões de treino, exercícios concluídos e XP.
-- Execute após 003_plans.sql.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tabela workout_sessions: cada vez que o usuário faz um treino
-- -----------------------------------------------------------------------------
create table if not exists public.workout_sessions (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references public.profiles(id) on delete cascade,
  workout_id       uuid        not null references public.workouts(id) on delete cascade,
  date             date        not null default current_date,
  -- array de IDs dos exercícios concluídos nesta sessão
  completed_exercise_ids text[] not null default '{}',
  total_exercises  int         not null default 0,
  completed_count  int         not null default 0,
  is_complete      boolean     not null default false,
  xp_earned        int         not null default 0,
  started_at       timestamptz not null default now(),
  completed_at     timestamptz,
  created_at       timestamptz not null default now(),
  -- Um usuário pode ter apenas uma sessão por treino por dia
  unique (user_id, workout_id, date)
);

comment on table public.workout_sessions is 'Registra cada sessão de treino de um cliente, incluindo exercícios concluídos e XP ganho.';

create index if not exists workout_sessions_user_idx    on public.workout_sessions (user_id);
create index if not exists workout_sessions_workout_idx on public.workout_sessions (workout_id);
create index if not exists workout_sessions_date_idx    on public.workout_sessions (date);

-- -----------------------------------------------------------------------------
-- 2. Tabela user_gamification: perfil de XP/nível do usuário
-- -----------------------------------------------------------------------------
create table if not exists public.user_gamification (
  user_id                  uuid    primary key references public.profiles(id) on delete cascade,
  total_xp                 int     not null default 0,
  level                    int     not null default 1,
  streak_days              int     not null default 0,
  longest_streak           int     not null default 0,
  last_workout_date        date,
  total_sessions           int     not null default 0,
  total_exercises_done     int     not null default 0,
  updated_at               timestamptz not null default now()
);

comment on table public.user_gamification is 'Perfil de gamificação: XP, nível, streak e estatísticas do usuário.';

-- -----------------------------------------------------------------------------
-- 3. RLS — workout_sessions
-- -----------------------------------------------------------------------------
alter table public.workout_sessions enable row level security;

create policy "Usuário vê suas próprias sessões"
  on public.workout_sessions for select
  using (auth.uid() = user_id);

create policy "Usuário insere suas próprias sessões"
  on public.workout_sessions for insert
  with check (auth.uid() = user_id);

create policy "Usuário atualiza suas próprias sessões"
  on public.workout_sessions for update
  using (auth.uid() = user_id);

-- Profissionais e admin podem ver sessões de seus clientes
create policy "Profissional vê sessões de seus clientes"
  on public.workout_sessions for select
  using (
    exists (
      select 1 from public.workouts
      where id = workout_id and professional_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- 4. RLS — user_gamification
-- -----------------------------------------------------------------------------
alter table public.user_gamification enable row level security;

create policy "Usuário vê e gerencia sua própria gamificação"
  on public.user_gamification for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Profissional vê gamificação de seus clientes"
  on public.user_gamification for select
  using (
    exists (
      select 1 from public.workouts
      where client_id = user_id and professional_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- 5. Trigger: atualiza updated_at em user_gamification
-- -----------------------------------------------------------------------------
drop trigger if exists user_gamification_updated_at on public.user_gamification;
create trigger user_gamification_updated_at
  before update on public.user_gamification
  for each row execute procedure public.set_updated_at();
