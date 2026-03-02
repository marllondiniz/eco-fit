-- =============================================================================
-- ECOFIT — Fotos corporais do aluno (frente, lado, costas)
-- =============================================================================

-- 1. Tabela body_photos
create table if not exists public.body_photos (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references public.profiles(id) on delete cascade,
  photo_type    text        not null check (photo_type in ('front', 'side', 'back')),
  url           text        not null,
  uploaded_at   timestamptz not null default now()
);

create index if not exists idx_body_photos_user on public.body_photos(user_id);

alter table public.body_photos enable row level security;

-- Cliente vê suas próprias fotos
drop policy if exists "User reads own body photos" on public.body_photos;
create policy "User reads own body photos"
  on public.body_photos for select
  using (auth.uid() = user_id);

-- Cliente insere suas próprias fotos
drop policy if exists "User inserts own body photos" on public.body_photos;
create policy "User inserts own body photos"
  on public.body_photos for insert
  with check (auth.uid() = user_id);

-- Cliente deleta suas próprias fotos
drop policy if exists "User deletes own body photos" on public.body_photos;
create policy "User deletes own body photos"
  on public.body_photos for delete
  using (auth.uid() = user_id);

-- Profissional vê fotos de clientes vinculados
drop policy if exists "Professional reads client body photos" on public.body_photos;
create policy "Professional reads client body photos"
  on public.body_photos for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('personal', 'admin')
    )
    and (
      exists (
        select 1 from public.workouts w
        where w.client_id = body_photos.user_id
          and w.professional_id = auth.uid()
      )
      or exists (
        select 1 from public.diets d
        where d.client_id = body_photos.user_id
          and d.professional_id = auth.uid()
      )
      or exists (
        select 1 from public.cardio_plans cp
        where cp.client_id = body_photos.user_id
          and cp.professional_id = auth.uid()
      )
    )
  );

-- 2. Bucket body-photos (público para leitura simplificada via URL)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'body-photos',
  'body-photos',
  true,
  10485760,  -- 10 MB
  array['image/jpeg','image/jpg','image/png','image/webp']
)
on conflict (id) do update set
  public            = true,
  file_size_limit   = 10485760,
  allowed_mime_types = array['image/jpeg','image/jpg','image/png','image/webp'];

-- Leitura pública
drop policy if exists "Public read body photos" on storage.objects;
create policy "Public read body photos"
  on storage.objects for select
  using (bucket_id = 'body-photos');

-- Upload: usuário autenticado na própria pasta
drop policy if exists "User uploads own body photos" on storage.objects;
create policy "User uploads own body photos"
  on storage.objects for insert
  with check (
    bucket_id = 'body-photos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Update: upsert na própria pasta
drop policy if exists "User updates own body photos" on storage.objects;
create policy "User updates own body photos"
  on storage.objects for update
  using (
    bucket_id = 'body-photos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Delete: próprio usuário
drop policy if exists "User deletes own body photos" on storage.objects;
create policy "User deletes own body photos"
  on storage.objects for delete
  using (
    bucket_id = 'body-photos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
