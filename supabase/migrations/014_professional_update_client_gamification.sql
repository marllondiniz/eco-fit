-- =============================================================================
-- ECOFIT — Profissional pode atualizar meta semanal do cliente
-- =============================================================================

drop policy if exists "Profissional atualiza gamificação de seus clientes" on public.user_gamification;
create policy "Profissional atualiza gamificação de seus clientes"
  on public.user_gamification for update
  using (
    exists (
      select 1 from public.workouts
      where client_id = user_gamification.user_id and professional_id = auth.uid()
    )
    or exists (
      select 1 from public.diets
      where client_id = user_gamification.user_id and professional_id = auth.uid()
    )
  )
  with check (true);

-- Permite que profissional insira linha de gamificação para cliente que ainda não tem
drop policy if exists "Profissional insere gamificação para seus clientes" on public.user_gamification;
create policy "Profissional insere gamificação para seus clientes"
  on public.user_gamification for insert
  with check (
    exists (
      select 1 from public.workouts
      where client_id = user_gamification.user_id and professional_id = auth.uid()
    )
    or exists (
      select 1 from public.diets
      where client_id = user_gamification.user_id and professional_id = auth.uid()
    )
  );
