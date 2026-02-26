-- =============================================================================
-- ECOFIT — Treino por dia da semana (A/B/C) + meta semanal
-- =============================================================================
-- Execute após 006_workout_gamification.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. workouts: dia da semana e rótulo (A/B/C)
-- -----------------------------------------------------------------------------
alter table public.workouts
  add column if not exists day_of_week text check (day_of_week in ('mon','tue','wed','thu','fri','sat','sun')),
  add column if not exists label text check (label in ('A','B','C'));

comment on column public.workouts.day_of_week is 'Dia da semana do treino: mon=Segunda ... sun=Domingo.';
comment on column public.workouts.label is 'Rótulo do treino na divisão semanal (A, B ou C).';

create index if not exists workouts_day_of_week_idx on public.workouts (client_id, day_of_week);

-- -----------------------------------------------------------------------------
-- 2. user_gamification: meta de treinos por semana
-- -----------------------------------------------------------------------------
alter table public.user_gamification
  add column if not exists weekly_target_sessions int not null default 3;

comment on column public.user_gamification.weekly_target_sessions is 'Meta de treinos por semana definida pelo profissional (2 a 7).';
