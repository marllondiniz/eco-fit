-- =============================================================================
-- ECOFIT — Grade semanal A/B/C (qual treino em cada dia)
-- =============================================================================
-- Define, por cliente, qual rótulo (A, B ou C) treinar em cada dia da semana.
-- A mesma estrutura se repete a cada semana.
-- =============================================================================

create table if not exists public.client_workout_schedule (
  client_id    uuid    not null references public.profiles(id) on delete cascade,
  day_of_week  text    not null check (day_of_week in ('mon','tue','wed','thu','fri','sat','sun')),
  workout_label text   check (workout_label in ('A','B','C')),
  primary key (client_id, day_of_week)
);

comment on table public.client_workout_schedule is 'Grade semanal do cliente: qual treino (A/B/C) em cada dia. Null = descanso.';

create index if not exists client_workout_schedule_client_idx on public.client_workout_schedule (client_id);

-- RLS
alter table public.client_workout_schedule enable row level security;

create policy "Cliente vê própria grade"
  on public.client_workout_schedule for select
  using (auth.uid() = client_id);

create policy "Profissional gerencia grade dos clientes"
  on public.client_workout_schedule for all
  using (
    exists (
      select 1 from public.workouts w
      where w.client_id = client_workout_schedule.client_id and w.professional_id = auth.uid()
    )
    or exists (
      select 1 from public.diets d
      where d.client_id = client_workout_schedule.client_id and d.professional_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workouts w
      where w.client_id = client_workout_schedule.client_id and w.professional_id = auth.uid()
    )
    or exists (
      select 1 from public.diets d
      where d.client_id = client_workout_schedule.client_id and d.professional_id = auth.uid()
    )
  );
