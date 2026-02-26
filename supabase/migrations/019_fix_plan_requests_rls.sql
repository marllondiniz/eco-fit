-- =============================================================================
-- ECOFIT — Corrigir RLS de plan_requests para solicitações sem profissional
-- =============================================================================
-- Problema: quando professional_id = null (cliente novo, sem histórico),
-- nenhum profissional via a solicitação porque a policy exigia:
--   auth.uid() = professional_id   → nunca bate com null
--
-- Solução:
--   1) Profissionais podem VER solicitações sem profissional_id (abertas)
--   2) Profissionais podem ATUALIZAR essas solicitações (para se atribuir)
--   3) Coluna invited_by em client_profiles para vincular profissional do convite
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Policy: profissional pode ver solicitações sem profissional_id (abertas)
-- -----------------------------------------------------------------------------
drop policy if exists "Profissional vê solicitações não atribuídas" on public.plan_requests;
create policy "Profissional vê solicitações não atribuídas"
  on public.plan_requests for select
  using (
    professional_id is null
    and public.current_user_is_personal()
  );

-- -----------------------------------------------------------------------------
-- 2. Policy: profissional pode atualizar solicitações sem profissional_id
--    (para se auto-atribuir como responsável)
-- -----------------------------------------------------------------------------
drop policy if exists "Profissional reivindica solicitações não atribuídas" on public.plan_requests;
create policy "Profissional reivindica solicitações não atribuídas"
  on public.plan_requests for update
  using (
    professional_id is null
    and public.current_user_is_personal()
  );

-- -----------------------------------------------------------------------------
-- 3. Coluna invited_by em client_profiles
--    Guarda o profissional que convidou o cliente, para vinculação permanente
-- -----------------------------------------------------------------------------
alter table public.client_profiles
  add column if not exists invited_by uuid references public.profiles(id) on delete set null;

comment on column public.client_profiles.invited_by is
  'Profissional que convidou este cliente (referência da tabela invitations.invited_by).';

-- -----------------------------------------------------------------------------
-- 4. Admin vê todas as solicitações (select + update + delete)
-- -----------------------------------------------------------------------------
drop policy if exists "Admin gerencia todas as solicitações" on public.plan_requests;
create policy "Admin gerencia todas as solicitações"
  on public.plan_requests for all
  using (public.current_user_is_admin());
