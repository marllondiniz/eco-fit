-- =============================================================================
-- ECOFIT — Bucket de avatares no Supabase Storage
-- =============================================================================
-- Cria o bucket 'avatars' (público) e define políticas de acesso.
-- Execute após 007_client_profiles_and_anamnese.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Criar bucket 'avatars' (ignora se já existir)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,   -- 5 MB
  array['image/jpeg','image/jpg','image/png','image/webp','image/gif']
)
on conflict (id) do update set
  public            = true,
  file_size_limit   = 5242880,
  allowed_mime_types = array['image/jpeg','image/jpg','image/png','image/webp','image/gif'];

-- -----------------------------------------------------------------------------
-- 2. Policies de Storage (objects)
-- -----------------------------------------------------------------------------

-- Leitura pública de qualquer avatar
drop policy if exists "Public read avatars"  on storage.objects;
create policy "Public read avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Upload: usuário autenticado só faz upload na própria pasta (uuid/)
drop policy if exists "Authenticated users upload own avatar" on storage.objects;
create policy "Authenticated users upload own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Update (upsert): só o próprio usuário
drop policy if exists "Users update own avatar" on storage.objects;
create policy "Users update own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Delete: só o próprio usuário
drop policy if exists "Users delete own avatar" on storage.objects;
create policy "Users delete own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
