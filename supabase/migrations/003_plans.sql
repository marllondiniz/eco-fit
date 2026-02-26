-- =============================================================================
-- ECOFIT — Dietas, Treinos e Documentos Profissionais
-- =============================================================================
-- Cria as tabelas de dietas, refeições, treinos, exercícios e documentos
-- profissionais (CRN/CREF), com RLS para profissionais e clientes.
-- Execute no SQL Editor do Supabase após 002_roles_and_invitations.sql.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Enum plan_status (status de dietas e treinos)
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'plan_status'
  ) then
    create type public.plan_status as enum ('draft', 'review', 'sent');
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 2. Tabela public.diets
-- -----------------------------------------------------------------------------
create table if not exists public.diets (
  id              uuid           primary key default gen_random_uuid(),
  professional_id uuid           not null references public.profiles(id) on delete cascade,
  client_id       uuid           references public.profiles(id) on delete set null,
  name            text           not null,
  objective       text,
  methodology     text,
  notes           text,
  status          public.plan_status not null default 'draft',
  sent_at         timestamptz,
  created_at      timestamptz    not null default now(),
  updated_at      timestamptz    not null default now()
);

comment on table public.diets is 'Planos de dieta criados por profissionais para clientes.';

create index if not exists diets_professional_idx on public.diets (professional_id);
create index if not exists diets_client_idx       on public.diets (client_id);
create index if not exists diets_status_idx       on public.diets (status);

-- -----------------------------------------------------------------------------
-- 3. Tabela public.diet_meals (refeições de uma dieta)
-- -----------------------------------------------------------------------------
create table if not exists public.diet_meals (
  id          uuid    primary key default gen_random_uuid(),
  diet_id     uuid    not null references public.diets(id) on delete cascade,
  name        text    not null,
  time_of_day text,
  foods       jsonb   not null default '[]',
  notes       text,
  order_index int     not null default 0
);

comment on table public.diet_meals is 'Refeições de uma dieta. foods é um array JSON com {name, quantity, unit, calories}.';
comment on column public.diet_meals.foods is 'Array JSON: [{name, quantity, unit, calories}]';

create index if not exists diet_meals_diet_idx on public.diet_meals (diet_id);

-- -----------------------------------------------------------------------------
-- 4. Tabela public.workouts
-- -----------------------------------------------------------------------------
create table if not exists public.workouts (
  id              uuid           primary key default gen_random_uuid(),
  professional_id uuid           not null references public.profiles(id) on delete cascade,
  client_id       uuid           references public.profiles(id) on delete set null,
  name            text           not null,
  division        text,
  methodology     text,
  notes           text,
  status          public.plan_status not null default 'draft',
  sent_at         timestamptz,
  created_at      timestamptz    not null default now(),
  updated_at      timestamptz    not null default now()
);

comment on table public.workouts is 'Planos de treino criados por profissionais para clientes.';

create index if not exists workouts_professional_idx on public.workouts (professional_id);
create index if not exists workouts_client_idx       on public.workouts (client_id);
create index if not exists workouts_status_idx       on public.workouts (status);

-- -----------------------------------------------------------------------------
-- 5. Tabela public.workout_exercises (exercícios de um treino)
-- -----------------------------------------------------------------------------
create table if not exists public.workout_exercises (
  id              uuid    primary key default gen_random_uuid(),
  workout_id      uuid    not null references public.workouts(id) on delete cascade,
  division_label  text,
  name            text    not null,
  sets            int,
  reps            text,
  rest_seconds    int,
  notes           text,
  order_index     int     not null default 0
);

comment on table public.workout_exercises is 'Exercícios de um treino. reps é text para suportar "8-12", "até a falha", etc.';

create index if not exists workout_exercises_workout_idx on public.workout_exercises (workout_id);

-- -----------------------------------------------------------------------------
-- 6. Tabela public.professional_documents (CRN / CREF)
-- -----------------------------------------------------------------------------
create table if not exists public.professional_documents (
  id              uuid        primary key default gen_random_uuid(),
  professional_id uuid        not null unique references public.profiles(id) on delete cascade,
  document_type   text        not null check (document_type in ('CRN', 'CREF')),
  document_number text,
  file_url        text,
  verified_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.professional_documents is 'Documentos profissionais (CRN/CREF) enviados para verificação.';

-- -----------------------------------------------------------------------------
-- 7. Trigger updated_at para diets, workouts e professional_documents
-- -----------------------------------------------------------------------------
drop trigger if exists diets_updated_at on public.diets;
create trigger diets_updated_at
  before update on public.diets
  for each row execute procedure public.set_updated_at();

drop trigger if exists workouts_updated_at on public.workouts;
create trigger workouts_updated_at
  before update on public.workouts
  for each row execute procedure public.set_updated_at();

drop trigger if exists professional_documents_updated_at on public.professional_documents;
create trigger professional_documents_updated_at
  before update on public.professional_documents
  for each row execute procedure public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 8. RLS — Dietas
-- -----------------------------------------------------------------------------
alter table public.diets enable row level security;

create policy "Profissional vê suas dietas"
  on public.diets for select
  using (professional_id = auth.uid());

create policy "Cliente vê as dietas recebidas"
  on public.diets for select
  using (client_id = auth.uid() and status = 'sent');

create policy "Profissional cria dietas"
  on public.diets for insert
  with check (professional_id = auth.uid());

create policy "Profissional atualiza suas dietas"
  on public.diets for update
  using (professional_id = auth.uid());

create policy "Profissional deleta suas dietas"
  on public.diets for delete
  using (professional_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 9. RLS — Refeições
-- -----------------------------------------------------------------------------
alter table public.diet_meals enable row level security;

create policy "Profissional vê refeições de suas dietas"
  on public.diet_meals for select
  using (
    exists (
      select 1 from public.diets
      where id = diet_id and professional_id = auth.uid()
    )
  );

create policy "Cliente vê refeições de dietas recebidas"
  on public.diet_meals for select
  using (
    exists (
      select 1 from public.diets
      where id = diet_id and client_id = auth.uid() and status = 'sent'
    )
  );

create policy "Profissional gerencia refeições"
  on public.diet_meals for all
  using (
    exists (
      select 1 from public.diets
      where id = diet_id and professional_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- 10. RLS — Treinos
-- -----------------------------------------------------------------------------
alter table public.workouts enable row level security;

create policy "Profissional vê seus treinos"
  on public.workouts for select
  using (professional_id = auth.uid());

create policy "Cliente vê os treinos recebidos"
  on public.workouts for select
  using (client_id = auth.uid() and status = 'sent');

create policy "Profissional cria treinos"
  on public.workouts for insert
  with check (professional_id = auth.uid());

create policy "Profissional atualiza seus treinos"
  on public.workouts for update
  using (professional_id = auth.uid());

create policy "Profissional deleta seus treinos"
  on public.workouts for delete
  using (professional_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 11. RLS — Exercícios
-- -----------------------------------------------------------------------------
alter table public.workout_exercises enable row level security;

create policy "Profissional vê exercícios de seus treinos"
  on public.workout_exercises for select
  using (
    exists (
      select 1 from public.workouts
      where id = workout_id and professional_id = auth.uid()
    )
  );

create policy "Cliente vê exercícios de treinos recebidos"
  on public.workout_exercises for select
  using (
    exists (
      select 1 from public.workouts
      where id = workout_id and client_id = auth.uid() and status = 'sent'
    )
  );

create policy "Profissional gerencia exercícios"
  on public.workout_exercises for all
  using (
    exists (
      select 1 from public.workouts
      where id = workout_id and professional_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- 12. RLS — Documentos profissionais
-- -----------------------------------------------------------------------------
alter table public.professional_documents enable row level security;

create policy "Profissional vê seu documento"
  on public.professional_documents for select
  using (professional_id = auth.uid());

create policy "Profissional envia seu documento"
  on public.professional_documents for insert
  with check (professional_id = auth.uid());

create policy "Profissional atualiza seu documento"
  on public.professional_documents for update
  using (professional_id = auth.uid());

create policy "Admin vê todos os documentos"
  on public.professional_documents for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admin atualiza documentos (verificação)"
  on public.professional_documents for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
