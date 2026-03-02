-- =============================================================================
-- ECOFIT — Atividade Aeróbica (Cardio)
-- =============================================================================
-- Prescrição simples em texto livre, marcação de conclusão e histórico por data.
-- A solicitação de cardio chega junto com a solicitação de treino.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tabela cardio_plans
-- -----------------------------------------------------------------------------
create table if not exists public.cardio_plans (
  id                uuid        primary key default gen_random_uuid(),
  professional_id   uuid        not null references public.profiles(id) on delete cascade,
  client_id         uuid        references public.profiles(id) on delete set null,
  prescription      text        not null default '',
  status            text        not null default 'draft'
    check (status in ('draft', 'sent')),
  sent_at           timestamptz,
  start_date        date,
  end_date          date,
  duration_weeks     int,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.cardio_plans is 'Prescrição de atividade aeróbica em texto livre.';
comment on column public.cardio_plans.prescription is 'Texto descritivo: ex. "30 min bike Z2", "HIIT 10 tiros 30s"';

create index if not exists cardio_plans_professional_idx on public.cardio_plans (professional_id);
create index if not exists cardio_plans_client_idx     on public.cardio_plans (client_id);
create index if not exists cardio_plans_status_idx    on public.cardio_plans (status);

drop trigger if exists cardio_plans_updated_at on public.cardio_plans;
create trigger cardio_plans_updated_at
  before update on public.cardio_plans
  for each row execute procedure public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 2. Tabela cardio_sessions (conclusão por dia)
-- -----------------------------------------------------------------------------
create table if not exists public.cardio_sessions (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references public.profiles(id) on delete cascade,
  cardio_plan_id  uuid        not null references public.cardio_plans(id) on delete cascade,
  date          date        not null default current_date,
  is_complete   boolean     not null default false,
  created_at    timestamptz not null default now(),
  unique (user_id, cardio_plan_id, date)
);

comment on table public.cardio_sessions is 'Registro diário de conclusão da atividade aeróbica.';

create index if not exists cardio_sessions_user_idx   on public.cardio_sessions (user_id);
create index if not exists cardio_sessions_plan_idx  on public.cardio_sessions (cardio_plan_id);
create index if not exists cardio_sessions_date_idx  on public.cardio_sessions (date);

-- -----------------------------------------------------------------------------
-- 3. RLS — cardio_plans
-- -----------------------------------------------------------------------------
alter table public.cardio_plans enable row level security;

create policy "Profissional vê seus planos cardio"
  on public.cardio_plans for select
  using (professional_id = auth.uid());

create policy "Cliente vê planos cardio recebidos"
  on public.cardio_plans for select
  using (client_id = auth.uid() and status = 'sent');

create policy "Profissional cria planos cardio"
  on public.cardio_plans for insert
  with check (professional_id = auth.uid());

create policy "Profissional atualiza seus planos cardio"
  on public.cardio_plans for update
  using (professional_id = auth.uid());

create policy "Profissional deleta seus planos cardio"
  on public.cardio_plans for delete
  using (professional_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 4. RLS — cardio_sessions
-- -----------------------------------------------------------------------------
alter table public.cardio_sessions enable row level security;

create policy "Usuário vê suas sessões cardio"
  on public.cardio_sessions for select
  using (auth.uid() = user_id);

create policy "Usuário insere suas sessões cardio"
  on public.cardio_sessions for insert
  with check (auth.uid() = user_id);

create policy "Usuário atualiza suas sessões cardio"
  on public.cardio_sessions for update
  using (auth.uid() = user_id);

create policy "Profissional vê sessões cardio dos clientes"
  on public.cardio_sessions for select
  using (
    exists (
      select 1 from public.cardio_plans
      where id = cardio_plan_id and professional_id = auth.uid()
    )
  );
