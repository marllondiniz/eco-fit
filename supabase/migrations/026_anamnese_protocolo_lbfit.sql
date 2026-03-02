-- =============================================================================
-- ECOFIT — Campos adicionais na anamnese para o Protocolo LBFIT
-- =============================================================================
-- Novos campos: tempo por sessão, modalidades adicionais, prioridades musculares.
-- =============================================================================

alter table public.client_anamnese
  add column if not exists session_duration_min int,
  add column if not exists additional_modalities text,
  add column if not exists muscle_priorities text;

comment on column public.client_anamnese.session_duration_min is 'Tempo disponível por sessão em minutos.';
comment on column public.client_anamnese.additional_modalities is 'Modalidades extras praticadas (ex.: natação, jiu-jitsu, corrida).';
comment on column public.client_anamnese.muscle_priorities is 'Prioridades musculares do aluno (ex.: glúteos, costas, peito).';
