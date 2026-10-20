-- Bucket público de fotos de perfil do cliente (arquivos pequenos, pasta por usuário).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  512000,
  array['image/jpeg', 'image/webp', 'image/png']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists avatars_leitura_publica on storage.objects;
create policy avatars_leitura_publica on storage.objects
  for select
  using (bucket_id = 'avatars');

drop policy if exists avatars_envio_proprio on storage.objects;
create policy avatars_envio_proprio on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists avatars_atualiza_proprio on storage.objects;
create policy avatars_atualiza_proprio on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists avatars_remove_proprio on storage.objects;
create policy avatars_remove_proprio on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Empresa e motorista veem o perfil do cliente só em corridas em que atuam.
drop policy if exists profiles_select_corrida on public.profiles;
create policy profiles_select_corrida on public.profiles
  for select to authenticated
  using (
    exists (
      select 1
      from public.trips t
      where t.cliente_id = profiles.id
        and (
          t.empresa_id = public.minha_empresa_id()
          or t.motorista_id = public.meu_motorista_id()
        )
    )
  );
