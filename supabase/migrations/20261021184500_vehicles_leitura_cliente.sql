-- Cliente autenticado precisa ver a frota disponível para escolher categoria na reserva.

drop policy if exists vehicles_select on public.vehicles;
create policy vehicles_select on public.vehicles
  for select to authenticated
  using (
    public.eh_admin()
    or empresa_id = public.minha_empresa_id()
    or empresa_id = public.empresa_do_motorista()
    or status <> 'inativo'
  );
