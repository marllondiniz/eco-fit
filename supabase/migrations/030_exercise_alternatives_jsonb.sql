-- Migration 030: coluna alternatives (JSONB) em workout_exercises
-- Armazena lista de exercícios alternativos para cada exercício
-- Formato: [{ "name": "Supino inclinado", "notes": "Mesmo ângulo de tração" }, ...]
-- Execute no Supabase Dashboard > SQL Editor

alter table public.workout_exercises
  add column if not exists alternatives jsonb default '[]'::jsonb;

comment on column public.workout_exercises.alternatives is
  'Lista de exercícios substitutos no formato [{name, notes}]. Substitui alternative_name/alternative_notes para suportar múltiplas opções.';
