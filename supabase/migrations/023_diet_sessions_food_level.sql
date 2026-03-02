-- Migration 023: Check por alimento (igual ao treino)
-- Permite marcar cada alimento individualmente, não apenas a refeição inteira.

alter table public.diet_sessions
  add column if not exists completed_food_keys text[] not null default '{}',
  add column if not exists total_foods int not null default 0;

comment on column public.diet_sessions.completed_food_keys is 'Chaves "mealId:foodIndex" dos alimentos marcados como consumidos.';
comment on column public.diet_sessions.total_foods is 'Total de alimentos na dieta do dia.';
