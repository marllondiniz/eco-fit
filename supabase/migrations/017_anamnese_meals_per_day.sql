-- =============================================================================
-- ECOFIT — Campo refeições por dia na anamnese
-- =============================================================================
-- Evita uso do campo notes para "quantas refeições por dia", preservando
-- notes para observações gerais em texto livre.
-- =============================================================================

alter table public.client_anamnese
  add column if not exists meals_per_day text;

comment on column public.client_anamnese.meals_per_day is
  'Preferência de refeições por dia (ex: 3, 4, 5-6).';
