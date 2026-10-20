-- Fotos de motorista (pasta motoristas/{id}/) enviadas pela empresa; admin também.
-- Cliente continua em {auth.uid()}/.

drop policy if exists avatars_envio_motorista_empresa on storage.objects;
create policy avatars_envio_motorista_empresa on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = 'motoristas'
    and (
      public.eh_admin()
      or exists (
        select 1
        from public.drivers d
        where d.id::text = (storage.foldername(name))[2]
          and d.empresa_id = public.minha_empresa_id()
      )
    )
  );

drop policy if exists avatars_atualiza_motorista_empresa on storage.objects;
create policy avatars_atualiza_motorista_empresa on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = 'motoristas'
    and (
      public.eh_admin()
      or exists (
        select 1
        from public.drivers d
        where d.id::text = (storage.foldername(name))[2]
          and d.empresa_id = public.minha_empresa_id()
      )
    )
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = 'motoristas'
    and (
      public.eh_admin()
      or exists (
        select 1
        from public.drivers d
        where d.id::text = (storage.foldername(name))[2]
          and d.empresa_id = public.minha_empresa_id()
      )
    )
  );

drop policy if exists avatars_remove_motorista_empresa on storage.objects;
create policy avatars_remove_motorista_empresa on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = 'motoristas'
    and (
      public.eh_admin()
      or exists (
        select 1
        from public.drivers d
        where d.id::text = (storage.foldername(name))[2]
          and d.empresa_id = public.minha_empresa_id()
      )
    )
  );

-- Cliente vê motorista da própria corrida (foto + nome).
drop policy if exists drivers_select_cliente_corrida on public.drivers;
create policy drivers_select_cliente_corrida on public.drivers
  for select to authenticated
  using (
    exists (
      select 1
      from public.trips t
      where t.motorista_id = drivers.id
        and t.cliente_id = (select auth.uid())
    )
  );

-- Admin lista todos os clientes (já tem profiles_select_own_or_admin).
-- Empresa/motorista: profiles_select_corrida (migration avatares_cliente).
