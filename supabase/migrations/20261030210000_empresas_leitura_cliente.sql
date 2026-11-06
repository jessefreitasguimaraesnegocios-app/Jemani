-- Cliente autenticado precisa ver empresas ativas (e habilitadas) e a frota
-- delas na reserva. A auditoria RLS tinha removido status = 'ativa' de companies.

drop policy if exists companies_select on public.companies;
create policy companies_select on public.companies
  for select to authenticated
  using (
    public.eh_admin()
    or usuario_id = (select auth.uid())
    or id = public.minha_empresa_id()
    or (
      status = 'ativa'
      and habilitada_receber = true
    )
  );

drop policy if exists vehicles_select on public.vehicles;
create policy vehicles_select on public.vehicles
  for select to authenticated
  using (
    public.eh_admin()
    or empresa_id = public.minha_empresa_id()
    or empresa_id = public.empresa_do_motorista()
    or (
      status <> 'inativo'
      and exists (
        select 1
        from public.companies c
        where c.id = vehicles.empresa_id
          and c.status = 'ativa'
          and c.habilitada_receber = true
      )
    )
  );
