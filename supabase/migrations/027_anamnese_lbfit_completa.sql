-- =============================================================================
-- ECOFIT — Questionário completo de anamnese LBFIT
-- =============================================================================

-- ── client_profiles: novos campos pessoais ──
alter table public.client_profiles
  add column if not exists date_of_birth date,
  add column if not exists profession text,
  add column if not exists city_state text;

-- ── client_anamnese: todos os novos campos do questionário LBFIT ──
alter table public.client_anamnese
  -- Rotina diária
  add column if not exists wake_up_time text,
  add column if not exists sleep_time text,
  add column if not exists preferred_training_time text,
  add column if not exists trains_fasted text,
  add column if not exists hunger_peak_time text,
  add column if not exists feeding_difficulty_time text,
  add column if not exists feeding_difficulty_reason text,
  -- Treinamento
  add column if not exists can_train_twice_daily boolean default false,
  add column if not exists does_aerobic text,
  add column if not exists aerobic_type text,
  add column if not exists aerobic_frequency text,
  -- Objetivos
  add column if not exists secondary_goal text,
  add column if not exists desired_timeframe text,
  -- Hábitos alimentares
  add column if not exists skips_meals boolean default false,
  add column if not exists disliked_foods text,
  add column if not exists alcohol_consumption text,
  add column if not exists daily_water_intake text,
  -- Saúde
  add column if not exists frequent_pain text,
  add column if not exists previous_coaching text,
  -- Estrutura
  add column if not exists home_equipment text,
  add column if not exists meal_prep_time text,
  -- Comportamento
  add column if not exists discipline_level int,
  add column if not exists biggest_difficulty text,
  add column if not exists motivation_reason text;
