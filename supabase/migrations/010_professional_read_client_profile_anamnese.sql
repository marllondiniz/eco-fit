-- =============================================================================
-- ECOFIT — Profissional pode ver perfil/anamnese ao criar o primeiro plano
-- =============================================================================
-- Antes: profissional só via client_profiles/client_anamnese se já existisse
--        dieta ou treino dele para o cliente (ao criar o 1º plano retornava vazio).
-- Agora: profissional (personal) pode ler perfil e anamnese de qualquer cliente
--        (profile com role = 'user'), para exibir na tela de nova dieta/treino.
-- Execute após 007_client_profiles_and_anamnese.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. client_profiles: substituir policy de visualização do profissional
-- -----------------------------------------------------------------------------
drop policy if exists "Profissional visualiza perfil de seus clientes" on public.client_profiles;

create policy "Profissional visualiza perfil de clientes"
  on public.client_profiles for select
  using (
    public.current_user_is_personal()
    and exists (
      select 1 from public.profiles
      where id = client_profiles.user_id and role = 'user'
    )
  );

-- -----------------------------------------------------------------------------
-- 2. client_anamnese: substituir policy de visualização do profissional
-- -----------------------------------------------------------------------------
drop policy if exists "Profissional visualiza anamnese de seus clientes" on public.client_anamnese;

create policy "Profissional visualiza anamnese de clientes"
  on public.client_anamnese for select
  using (
    public.current_user_is_personal()
    and exists (
      select 1 from public.profiles
      where id = client_anamnese.user_id and role = 'user'
    )
  );
