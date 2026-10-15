-- Fecha tabelas sem RLS e recoloca políticas que existem na migration inicial
-- mas não estavam ativas no banco. Sem USING (true). Sem apagar dados.

create or replace function public.viagem_campos_identidade(p_id uuid)
returns table (cliente_id uuid, empresa_id uuid, motorista_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select t.cliente_id, t.empresa_id, t.motorista_id
  from public.trips t
  where t.id = p_id;
$$;

create or replace function public.empresa_campos_protegidos(p_id uuid)
returns table (
  usuario_id uuid,
  status public.status_empresa,
  habilitada_receber boolean,
  comissao_percentual numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select c.usuario_id, c.status, c.habilitada_receber, c.comissao_percentual
  from public.companies c
  where c.id = p_id;
$$;

revoke all on function public.viagem_campos_identidade(uuid) from public, anon;
revoke all on function public.empresa_campos_protegidos(uuid) from public, anon;
grant execute on function public.viagem_campos_identidade(uuid) to authenticated;
grant execute on function public.empresa_campos_protegidos(uuid) to authenticated;

alter table public.company_users enable row level security;
alter table public.pickup_locations enable row level security;

drop policy if exists company_users_select on public.company_users;
create policy company_users_select on public.company_users
  for select to authenticated
  using (
    public.eh_admin()
    or user_id = auth.uid()
    or company_id = public.minha_empresa_id()
  );

drop policy if exists company_users_admin on public.company_users;
create policy company_users_admin on public.company_users
  for all to authenticated
  using (public.eh_admin())
  with check (public.eh_admin());

drop policy if exists pickup_select on public.pickup_locations;
create policy pickup_select on public.pickup_locations
  for select to authenticated
  using ((select auth.uid()) is not null and ativo = true);

drop policy if exists pickup_admin on public.pickup_locations;
create policy pickup_admin on public.pickup_locations
  for all to authenticated
  using (public.eh_admin())
  with check (public.eh_admin());

drop policy if exists categories_select on public.vehicle_categories;
create policy categories_select on public.vehicle_categories
  for select to authenticated
  using ((select auth.uid()) is not null);

drop policy if exists categories_admin on public.vehicle_categories;
create policy categories_admin on public.vehicle_categories
  for all to authenticated
  using (public.eh_admin())
  with check (public.eh_admin());

drop policy if exists price_rules_select on public.price_rules;
create policy price_rules_select on public.price_rules
  for select to authenticated
  using ((select auth.uid()) is not null);

drop policy if exists price_rules_admin on public.price_rules;
create policy price_rules_admin on public.price_rules
  for all to authenticated
  using (public.eh_admin())
  with check (public.eh_admin());

drop policy if exists settings_select on public.platform_settings;
create policy settings_select on public.platform_settings
  for select to authenticated
  using ((select auth.uid()) is not null);

drop policy if exists settings_admin on public.platform_settings;
create policy settings_admin on public.platform_settings
  for all to authenticated
  using (public.eh_admin())
  with check (public.eh_admin());

drop policy if exists companies_select on public.companies;
create policy companies_select on public.companies
  for select to authenticated
  using (
    public.eh_admin()
    or usuario_id = (select auth.uid())
    or id = public.minha_empresa_id()
  );

drop policy if exists companies_admin_write on public.companies;
create policy companies_admin_write on public.companies
  for all to authenticated
  using (public.eh_admin())
  with check (public.eh_admin());

drop policy if exists companies_update_own on public.companies;
create policy companies_update_own on public.companies
  for update to authenticated
  using (usuario_id = (select auth.uid()))
  with check (
    usuario_id is not distinct from (
      select e.usuario_id from public.empresa_campos_protegidos(id) e
    )
    and status is not distinct from (
      select e.status from public.empresa_campos_protegidos(id) e
    )
    and habilitada_receber is not distinct from (
      select e.habilitada_receber from public.empresa_campos_protegidos(id) e
    )
    and comissao_percentual is not distinct from (
      select e.comissao_percentual from public.empresa_campos_protegidos(id) e
    )
  );

drop policy if exists drivers_select on public.drivers;
create policy drivers_select on public.drivers
  for select to authenticated
  using (
    public.eh_admin()
    or empresa_id = public.minha_empresa_id()
    or usuario_id = (select auth.uid())
  );

drop policy if exists drivers_write_empresa on public.drivers;
create policy drivers_write_empresa on public.drivers
  for all to authenticated
  using (public.eh_admin() or empresa_id = public.minha_empresa_id())
  with check (public.eh_admin() or empresa_id = public.minha_empresa_id());

drop policy if exists vehicles_select on public.vehicles;
create policy vehicles_select on public.vehicles
  for select to authenticated
  using (
    public.eh_admin()
    or empresa_id = public.minha_empresa_id()
    or empresa_id = public.empresa_do_motorista()
  );

drop policy if exists vehicles_write_empresa on public.vehicles;
create policy vehicles_write_empresa on public.vehicles
  for all to authenticated
  using (public.eh_admin() or empresa_id = public.minha_empresa_id())
  with check (public.eh_admin() or empresa_id = public.minha_empresa_id());

drop policy if exists payments_select on public.payments;
create policy payments_select on public.payments
  for select to authenticated
  using (
    public.eh_admin()
    or exists (
      select 1 from public.trips t
      where t.id = booking_id and t.cliente_id = (select auth.uid())
    )
    or exists (
      select 1 from public.trips t
      where t.id = booking_id and t.empresa_id = public.minha_empresa_id()
    )
  );

drop policy if exists payments_admin_write on public.payments;
create policy payments_admin_write on public.payments
  for all to authenticated
  using (public.eh_admin())
  with check (public.eh_admin());

drop policy if exists commissions_select on public.commissions;
create policy commissions_select on public.commissions
  for select to authenticated
  using (public.eh_admin() or empresa_id = public.minha_empresa_id());

drop policy if exists commissions_admin_write on public.commissions;
create policy commissions_admin_write on public.commissions
  for all to authenticated
  using (public.eh_admin())
  with check (public.eh_admin());

drop policy if exists notifications_own on public.notifications;
create policy notifications_own on public.notifications
  for all to authenticated
  using (usuario_id = (select auth.uid()) or public.eh_admin())
  with check (usuario_id = (select auth.uid()) or public.eh_admin());

drop policy if exists reviews_select on public.reviews;
create policy reviews_select on public.reviews
  for select to authenticated
  using (
    public.eh_admin()
    or cliente_id = (select auth.uid())
    or empresa_id = public.minha_empresa_id()
    or motorista_id = public.meu_motorista_id()
  );

drop policy if exists reviews_insert on public.reviews;
create policy reviews_insert on public.reviews
  for insert to authenticated
  with check (
    public.eh_admin()
    or (
      cliente_id = (select auth.uid())
      and exists (
        select 1 from public.trips t
        where t.id = viagem_id
          and t.cliente_id = (select auth.uid())
          and (reviews.empresa_id is null or t.empresa_id = reviews.empresa_id)
          and (reviews.motorista_id is null or t.motorista_id = reviews.motorista_id)
      )
    )
  );

drop policy if exists reviews_admin on public.reviews;
create policy reviews_admin on public.reviews
  for all to authenticated
  using (public.eh_admin())
  with check (public.eh_admin());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or public.eh_admin())
  with check (
    public.eh_admin()
    or (
      id = (select auth.uid())
      and tipo = public.meu_tipo()
    )
  );

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (
    public.eh_admin()
    or (
      id = (select auth.uid())
      and tipo is distinct from 'admin'::public.tipo_usuario
    )
  );

drop policy if exists trips_update on public.trips;
create policy trips_update on public.trips
  for update to authenticated
  using (
    public.eh_admin()
    or cliente_id = (select auth.uid())
    or empresa_id = public.minha_empresa_id()
    or motorista_id = public.meu_motorista_id()
  )
  with check (
    public.eh_admin()
    or (
      cliente_id is not distinct from (
        select v.cliente_id from public.viagem_campos_identidade(id) v
      )
      and (
        (
          cliente_id = (select auth.uid())
          and empresa_id is not distinct from (
            select v.empresa_id from public.viagem_campos_identidade(id) v
          )
          and motorista_id is not distinct from (
            select v.motorista_id from public.viagem_campos_identidade(id) v
          )
        )
        or (
          empresa_id = public.minha_empresa_id()
          and (
            (select v.empresa_id from public.viagem_campos_identidade(id) v) is null
            or empresa_id is not distinct from (
              select v.empresa_id from public.viagem_campos_identidade(id) v
            )
          )
        )
        or (
          motorista_id = public.meu_motorista_id()
          and empresa_id is not distinct from (
            select v.empresa_id from public.viagem_campos_identidade(id) v
          )
          and motorista_id is not distinct from (
            select v.motorista_id from public.viagem_campos_identidade(id) v
          )
        )
      )
    )
  );

drop policy if exists trips_aceite_empresa on public.trips;
create policy trips_aceite_empresa on public.trips
  for update to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.tipo = 'empresa'::public.tipo_usuario
    )
    and empresa_id is null
    and status in ('aguardando_empresa'::public.status_viagem, 'paid'::public.status_viagem)
  )
  with check (
    empresa_id = public.minha_empresa_id()
    and cliente_id is not distinct from (
      select v.cliente_id from public.viagem_campos_identidade(id) v
    )
    and motorista_id is not distinct from (
      select v.motorista_id from public.viagem_campos_identidade(id) v
    )
  );

drop policy if exists trips_insert_cliente on public.trips;
create policy trips_insert_cliente on public.trips
  for insert to authenticated
  with check (
    public.eh_admin()
    or (
      cliente_id = (select auth.uid())
      and (
        (empresa_id is null and motorista_id is null)
        or exists (select 1 from public.trips t where t.id = trips.id)
      )
    )
  );

revoke truncate, references, trigger on all tables in schema public from anon, authenticated;
