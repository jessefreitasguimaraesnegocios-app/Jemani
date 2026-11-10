-- Cliente precisa listar empresas do marketplace e a frota completa na reserva.
-- companies_select ficou restrito; EXISTS em vehicles/companies e RPC marketplace
-- precisam de security definer para não zerar a frota no app do cliente.

create or replace function public.empresa_oferece_frota(p_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.companies c
    where c.id = p_empresa_id
      and c.status = 'ativa'
      and c.habilitada_receber = true
  );
$$;

revoke all on function public.empresa_oferece_frota(uuid) from public, anon;
grant execute on function public.empresa_oferece_frota(uuid) to authenticated, service_role;

drop policy if exists vehicles_select on public.vehicles;
create policy vehicles_select on public.vehicles
  for select to authenticated
  using (
    public.eh_admin()
    or empresa_id = public.minha_empresa_id()
    or empresa_id = public.empresa_do_motorista()
    or (
      status <> 'inativo'
      and public.empresa_oferece_frota(empresa_id)
    )
  );

drop function if exists public.empresas_marketplace();
create function public.empresas_marketplace()
returns table (
  id uuid,
  nome_comercial text,
  cidade text,
  regioes_atendidas text[],
  categorias_ids uuid[],
  status text,
  habilitada_receber boolean,
  avaliacao_media numeric,
  latitude double precision,
  longitude double precision
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.nome_comercial,
    c.cidade,
    c.regioes_atendidas,
    c.categorias_ids,
    c.status::text,
    c.habilitada_receber,
    c.avaliacao_media,
    c.latitude,
    c.longitude
  from public.companies c
  where c.status = 'ativa'
    and c.habilitada_receber = true;
$$;

revoke all on function public.empresas_marketplace() from public, anon;
grant execute on function public.empresas_marketplace() to authenticated, service_role;

notify pgrst, 'reload schema';
