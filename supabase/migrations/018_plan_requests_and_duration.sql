-- =============================================================================
-- ECOFIT — Solicitações de plano e duração dos treinos/dietas
-- =============================================================================
-- 1) Tabela plan_requests: ciclo de vida de cada plano por cliente
-- 2) Duração (start_date, end_date, duration_weeks) em workouts e diets
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tabela plan_requests
-- -----------------------------------------------------------------------------
create table if not exists public.plan_requests (
  id               uuid        primary key default gen_random_uuid(),
  client_id        uuid        not null references public.profiles(id) on delete cascade,
  professional_id  uuid        references public.profiles(id) on delete set null,
  type             text        not null default 'workout'
                                check (type in ('workout', 'diet', 'both')),
  status           text        not null default 'pending'
                                check (status in ('pending', 'in_progress', 'completed', 'cancelled')),
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table public.plan_requests is
  'Ciclo de solicitação de planos: cliente solicita → profissional cria e envia.';

create index if not exists plan_requests_client_idx       on public.plan_requests (client_id);
create index if not exists plan_requests_professional_idx on public.plan_requests (professional_id);
create index if not exists plan_requests_status_idx       on public.plan_requests (status);

-- Trigger updated_at
drop trigger if exists plan_requests_updated_at on public.plan_requests;
create trigger plan_requests_updated_at
  before update on public.plan_requests
  for each row execute procedure public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 2. RLS — plan_requests
-- -----------------------------------------------------------------------------
alter table public.plan_requests enable row level security;

-- Cliente lê e cria suas próprias solicitações
create policy "Cliente lê suas solicitações"
  on public.plan_requests for select
  using (auth.uid() = client_id);

create policy "Cliente cria solicitação"
  on public.plan_requests for insert
  with check (auth.uid() = client_id);

-- Profissional vê solicitações dos seus clientes
create policy "Profissional vê solicitações de seus clientes"
  on public.plan_requests for select
  using (auth.uid() = professional_id);

create policy "Profissional atualiza solicitações de seus clientes"
  on public.plan_requests for update
  using (auth.uid() = professional_id);

-- Admin vê tudo
create policy "Admin vê todas as solicitações"
  on public.plan_requests for select
  using (public.current_user_is_admin());

-- -----------------------------------------------------------------------------
-- 3. Duração em workouts
-- -----------------------------------------------------------------------------
alter table public.workouts
  add column if not exists start_date date,
  add column if not exists end_date   date,
  add column if not exists duration_weeks int;

comment on column public.workouts.start_date    is 'Data de início do plano de treino.';
comment on column public.workouts.end_date      is 'Data de término do plano de treino.';
comment on column public.workouts.duration_weeks is 'Duração em semanas definida pelo profissional.';

-- -----------------------------------------------------------------------------
-- 4. Duração em diets
-- -----------------------------------------------------------------------------
alter table public.diets
  add column if not exists start_date date,
  add column if not exists end_date   date,
  add column if not exists duration_weeks int;

comment on column public.diets.start_date    is 'Data de início do plano de dieta.';
comment on column public.diets.end_date      is 'Data de término do plano de dieta.';
comment on column public.diets.duration_weeks is 'Duração em semanas definida pelo profissional.';
