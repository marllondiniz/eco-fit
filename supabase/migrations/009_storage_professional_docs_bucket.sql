-- =============================================================================
-- ECOFIT — Bucket de documentos profissionais no Supabase Storage
-- =============================================================================
-- Cria o bucket 'professional-docs' (privado) e define políticas de acesso.
-- Execute após 008_storage_avatars_bucket.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Criar bucket 'professional-docs' (privado — apenas leitura para admin)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'professional-docs',
  'professional-docs',
  false,
  10485760,  -- 10 MB
  array['application/pdf','image/jpeg','image/jpg','image/png']
)
on conflict (id) do update set
  public            = false,
  file_size_limit   = 10485760,
  allowed_mime_types = array['application/pdf','image/jpeg','image/jpg','image/png'];

-- -----------------------------------------------------------------------------
-- 2. Policies de Storage
-- -----------------------------------------------------------------------------

-- Profissional faz upload na própria pasta
drop policy if exists "Professional uploads own docs" on storage.objects;
create policy "Professional uploads own docs"
  on storage.objects for insert
  with check (
    bucket_id = 'professional-docs'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = 'documents'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- Profissional atualiza os próprios arquivos
drop policy if exists "Professional updates own docs" on storage.objects;
create policy "Professional updates own docs"
  on storage.objects for update
  using (
    bucket_id = 'professional-docs'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- Profissional lê os próprios arquivos
drop policy if exists "Professional reads own docs" on storage.objects;
create policy "Professional reads own docs"
  on storage.objects for select
  using (
    bucket_id = 'professional-docs'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- Admin lê todos os documentos
drop policy if exists "Admin reads all docs" on storage.objects;
create policy "Admin reads all docs"
  on storage.objects for select
  using (
    bucket_id = 'professional-docs'
    and public.current_user_is_admin()
  );

-- Profissional deleta os próprios arquivos
drop policy if exists "Professional deletes own docs" on storage.objects;
create policy "Professional deletes own docs"
  on storage.objects for delete
  using (
    bucket_id = 'professional-docs'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
