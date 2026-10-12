alter type public.status_viagem add value if not exists 'oferta_enviada';

alter table public.trips
  add column if not exists motorista_lat numeric(10, 7),
  add column if not exists motorista_lng numeric(10, 7);

create or replace function public.meu_tipo()
returns public.tipo_usuario
language sql
stable
security definer
set search_path = public
as $$
  select tipo from public.profiles where id = auth.uid();
$$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'trips'
  ) then
    alter publication supabase_realtime add table public.trips;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'trip_assignments'
  ) then
    alter publication supabase_realtime add table public.trip_assignments;
  end if;
end $$;

drop policy if exists trips_aceite_empresa on public.trips;
create policy trips_aceite_empresa on public.trips
  for update to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.tipo = 'empresa'
    )
    and empresa_id is null
    and status in ('aguardando_empresa', 'paid')
  )
  with check (empresa_id = public.minha_empresa_id());

drop policy if exists assignments_insert_cliente on public.trip_assignments;
create policy assignments_insert_cliente on public.trip_assignments
  for insert to authenticated
  with check (
    public.eh_admin()
    or exists (
      select 1 from public.trips t
      where t.id = viagem_id and t.cliente_id = auth.uid()
    )
  );
