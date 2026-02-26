-- Migration 020: adicionar campos de exercício alternativo em workout_exercises
-- Execute no Supabase Dashboard > SQL Editor

alter table public.workout_exercises
  add column if not exists alternative_name  text,
  add column if not exists alternative_notes text;

comment on column public.workout_exercises.alternative_name  is 'Nome do exercício alternativo/substituto (opcional)';
comment on column public.workout_exercises.alternative_notes is 'Observações sobre a alternativa (opcional)';
