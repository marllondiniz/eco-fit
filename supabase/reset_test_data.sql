-- =============================================================================
-- ECOFIT — Reset Controlado de Dados de Teste
-- =============================================================================
-- Limpa dados de sessões, planos, solicitações e vínculos, preservando:
--   - O usuário admin
--   - marlloinho32@gmail.com
-- Schema (tabelas, enums, functions, RLS) é preservado integralmente.
--
-- Execute no SQL Editor do Supabase. Leia antes de rodar.
-- =============================================================================

do $$
declare
  preserved_ids uuid[];
begin
  -- Coletar IDs a preservar (admin + marlloinho32)
  select array_agg(id)
  into preserved_ids
  from public.profiles
  where role = 'admin'
     or email = 'marlloinho32@gmail.com';

  raise notice 'Preservando % usuário(s): %', array_length(preserved_ids, 1), preserved_ids;

  -- --------------------------------------------------------
  -- 1. Limpar solicitações de plano (todos os usuários)
  -- --------------------------------------------------------
  delete from public.plan_requests;
  raise notice '✓ plan_requests limpo';

  -- --------------------------------------------------------
  -- 2. Limpar grade semanal (todos)
  -- --------------------------------------------------------
  delete from public.client_workout_schedule;
  raise notice '✓ client_workout_schedule limpo';

  -- --------------------------------------------------------
  -- 3. Limpar sessões de treino (todos)
  -- --------------------------------------------------------
  delete from public.workout_sessions;
  raise notice '✓ workout_sessions limpo';

  -- --------------------------------------------------------
  -- 4. Limpar gamificação (todos)
  -- --------------------------------------------------------
  delete from public.user_gamification;
  raise notice '✓ user_gamification limpo';

  -- --------------------------------------------------------
  -- 5. Limpar exercícios e treinos (todos)
  -- --------------------------------------------------------
  delete from public.workout_exercises;
  delete from public.workouts;
  raise notice '✓ workout_exercises + workouts limpos';

  -- --------------------------------------------------------
  -- 6. Limpar refeições e dietas (todos)
  -- --------------------------------------------------------
  delete from public.diet_meals;
  delete from public.diets;
  raise notice '✓ diet_meals + diets limpos';

  -- --------------------------------------------------------
  -- 7. Limpar anamnese de usuários NÃO preservados
  -- --------------------------------------------------------
  delete from public.client_anamnese
  where user_id <> all(preserved_ids);
  raise notice '✓ client_anamnese limpo (preservados mantidos)';

  -- --------------------------------------------------------
  -- 8. Limpar perfil estendido de usuários NÃO preservados
  -- --------------------------------------------------------
  delete from public.client_profiles
  where user_id <> all(preserved_ids);
  raise notice '✓ client_profiles limpo (preservados mantidos)';

  -- --------------------------------------------------------
  -- 9. Resetar onboarding dos usuários NÃO preservados
  -- --------------------------------------------------------
  update public.profiles
  set onboarding_completed = false
  where id <> all(preserved_ids)
    and role = 'user';
  raise notice '✓ onboarding_completed resetado para clientes não preservados';

  -- --------------------------------------------------------
  -- 10. Remover convites já usados (limpar para novo ciclo)
  -- --------------------------------------------------------
  delete from public.invitations
  where used_at is not null;
  raise notice '✓ Convites usados removidos';

  raise notice '';
  raise notice '✅ Reset concluído. Usuários preservados: %', preserved_ids;
end $$;
