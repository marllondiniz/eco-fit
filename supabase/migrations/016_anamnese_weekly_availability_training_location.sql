-- =============================================================================
-- ECOFIT — Campos de disponibilidade semanal e local de treino na anamnese
-- =============================================================================
-- Corrige uso indevido de health_history e medications no formulário.
-- =============================================================================

alter table public.client_anamnese
  add column if not exists weekly_availability text,
  add column if not exists training_location text;

comment on column public.client_anamnese.weekly_availability is
  'Máximo de vezes por semana que o cliente pode treinar (2 a 7).';

comment on column public.client_anamnese.training_location is
  'Onde o cliente vai treinar (ex: Em casa, Academia).';
