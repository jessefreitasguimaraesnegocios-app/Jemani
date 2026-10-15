-- A política de insert consultava a própria tabela trips e o Postgres
-- respondia 42P17. A existência da viagem passa a ser lida por uma função
-- security definer, fora do RLS.

create or replace function public.viagem_ja_existe(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.trips t where t.id = p_id);
$$;

revoke all on function public.viagem_ja_existe(uuid) from public, anon;
grant execute on function public.viagem_ja_existe(uuid) to authenticated;

drop policy if exists trips_insert_cliente on public.trips;
create policy trips_insert_cliente on public.trips
  for insert to authenticated
  with check (
    public.eh_admin()
    or (
      cliente_id = (select auth.uid())
      and (
        (empresa_id is null and motorista_id is null)
        or public.viagem_ja_existe(id)
      )
    )
  );

-- A empresa que já ficou com a viagem precisa marcar as outras ofertas
-- como expiradas. Isso só vale para oferta que já existe.
create or replace function public.pode_atualizar_oferta(p_viagem_id uuid, p_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.pode_gravar_oferta(p_viagem_id, p_empresa_id)
    or exists (
      select 1
      from public.trip_assignments a
      join public.trips t on t.id = a.viagem_id
      where a.viagem_id = p_viagem_id
        and a.empresa_id = p_empresa_id
        and t.empresa_id = public.minha_empresa_id()
    );
$$;

revoke all on function public.pode_atualizar_oferta(uuid, uuid) from public, anon;
grant execute on function public.pode_atualizar_oferta(uuid, uuid) to authenticated;

drop policy if exists assignments_insert_cliente on public.trip_assignments;
create policy assignments_insert_cliente on public.trip_assignments
  for insert to authenticated
  with check (public.pode_atualizar_oferta(viagem_id, empresa_id));

drop policy if exists assignments_update on public.trip_assignments;
create policy assignments_update on public.trip_assignments
  for update to authenticated
  using (public.pode_atualizar_oferta(viagem_id, empresa_id))
  with check (public.pode_atualizar_oferta(viagem_id, empresa_id));
