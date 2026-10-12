drop policy if exists assignments_select on public.trip_assignments;
create policy assignments_select on public.trip_assignments
  for select to authenticated
  using (
    public.eh_admin()
    or empresa_id = public.minha_empresa_id()
  );

drop policy if exists assignments_update on public.trip_assignments;
create policy assignments_update on public.trip_assignments
  for update to authenticated
  using (
    public.eh_admin()
    or empresa_id = public.minha_empresa_id()
  )
  with check (
    public.eh_admin()
    or empresa_id = public.minha_empresa_id()
  );

drop policy if exists trips_update on public.trips;
create policy trips_update on public.trips
  for update to authenticated
  using (
    public.eh_admin()
    or cliente_id = auth.uid()
    or empresa_id = public.minha_empresa_id()
    or motorista_id = public.meu_motorista_id()
  )
  with check (
    public.eh_admin()
    or cliente_id = auth.uid()
    or empresa_id = public.minha_empresa_id()
    or motorista_id = public.meu_motorista_id()
  );
