-- Migration 021: Prescrição de suplementação na dieta
-- Armazena suplementos prescritos pelo nutricionista (nome, dose, horário, observações)

alter table public.diets
  add column if not exists supplements jsonb not null default '[]';

comment on column public.diets.supplements is 'Array JSON: [{name, dose, schedule, notes}] - Prescrição de suplementação.';
