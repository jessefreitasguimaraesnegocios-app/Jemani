create or replace function public.pode_registrar_viagem(p_viagem_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.eh_admin()
    or exists (
      select 1
      from public.trips t
      where t.id = p_viagem_id
        and (
          t.cliente_id = auth.uid()
          or t.empresa_id = public.minha_empresa_id()
          or t.motorista_id = public.meu_motorista_id()
        )
    )
    or exists (
      select 1
      from public.trip_assignments a
      where a.viagem_id = p_viagem_id
        and a.empresa_id = public.minha_empresa_id()
    );
$$;

create or replace function public.pode_gravar_oferta(p_viagem_id uuid, p_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.eh_admin()
    or exists (
      select 1
      from public.trips t
      where t.id = p_viagem_id
        and t.cliente_id = auth.uid()
    )
    or (
      p_empresa_id = public.minha_empresa_id()
      and (
        exists (
          select 1
          from public.trips t
          where t.id = p_viagem_id
            and t.empresa_id = public.minha_empresa_id()
        )
        or exists (
          select 1
          from public.trip_assignments a
          where a.viagem_id = p_viagem_id
            and a.empresa_id = public.minha_empresa_id()
        )
      )
    );
$$;

revoke all on function public.pode_registrar_viagem(uuid) from public;
revoke all on function public.pode_gravar_oferta(uuid, uuid) from public;
grant execute on function public.pode_registrar_viagem(uuid) to authenticated;
grant execute on function public.pode_gravar_oferta(uuid, uuid) to authenticated;

drop policy if exists history_select on public.trip_status_history;
create policy history_select on public.trip_status_history
  for select to authenticated
  using (public.pode_registrar_viagem(viagem_id));

drop policy if exists history_insert on public.trip_status_history;
create policy history_insert on public.trip_status_history
  for insert to authenticated
  with check (
    public.pode_registrar_viagem(viagem_id)
    and (usuario_id is null or usuario_id = auth.uid() or public.eh_admin())
  );

drop policy if exists history_update on public.trip_status_history;
create policy history_update on public.trip_status_history
  for update to authenticated
  using (public.eh_admin() or usuario_id is null or usuario_id = auth.uid())
  with check (
    public.pode_registrar_viagem(viagem_id)
    and (usuario_id is null or usuario_id = auth.uid() or public.eh_admin())
  );

drop policy if exists assignments_select on public.trip_assignments;
create policy assignments_select on public.trip_assignments
  for select to authenticated
  using (public.pode_gravar_oferta(viagem_id, empresa_id) or empresa_id = public.minha_empresa_id());

drop policy if exists assignments_insert_cliente on public.trip_assignments;
create policy assignments_insert_cliente on public.trip_assignments
  for insert to authenticated
  with check (public.pode_gravar_oferta(viagem_id, empresa_id));

drop policy if exists assignments_update on public.trip_assignments;
create policy assignments_update on public.trip_assignments
  for update to authenticated
  using (public.pode_gravar_oferta(viagem_id, empresa_id))
  with check (public.pode_gravar_oferta(viagem_id, empresa_id));
