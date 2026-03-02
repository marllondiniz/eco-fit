-- =============================================================================
-- ECOFIT — Tipo 'cardio' em plan_requests
-- =============================================================================
-- Permite ao cliente solicitar apenas cardio (sem treino).
-- =============================================================================

alter table public.plan_requests
  drop constraint if exists plan_requests_type_check;

alter table public.plan_requests
  add constraint plan_requests_type_check
  check (type in ('workout', 'diet', 'both', 'cardio'));
