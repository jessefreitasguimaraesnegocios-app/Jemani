-- 1) RPC mais permissiva: sem exigir lat/lng; categorias vazias aceitam qualquer categoria.
create or replace function public.empresas_para_distribuicao(p_categoria_id uuid)
returns table (
  id uuid,
  usuario_id uuid,
  nome_comercial text,
  razao_social text,
  cnpj text,
  telefone text,
  email text,
  cidade text,
  endereco_base text,
  latitude numeric,
  longitude numeric,
  regioes_atendidas text[],
  categorias_ids uuid[],
  status public.status_empresa,
  habilitada_receber boolean,
  avaliacao_media numeric,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.usuario_id,
    c.nome_comercial,
    c.razao_social,
    c.cnpj,
    c.telefone,
    c.email,
    c.cidade,
    c.endereco_base,
    c.latitude,
    c.longitude,
    c.regioes_atendidas,
    c.categorias_ids,
    c.status,
    c.habilitada_receber,
    c.avaliacao_media,
    c.created_at,
    c.updated_at
  from public.companies c
  where c.status = 'ativa'
    and c.habilitada_receber = true
    and (
      cardinality(c.categorias_ids) = 0
      or p_categoria_id = any (c.categorias_ids)
    )
    and (
      not exists (
        select 1
        from public.vehicles v
        where v.empresa_id = c.id
          and v.status is distinct from 'inativo'
      )
      or exists (
        select 1
        from public.vehicles v
        where v.empresa_id = c.id
          and v.categoria_id = p_categoria_id
          and v.status is distinct from 'inativo'
      )
      or cardinality(c.categorias_ids) = 0
    );
$$;

revoke all on function public.empresas_para_distribuicao(uuid) from public;
grant execute on function public.empresas_para_distribuicao(uuid) to authenticated;

-- 2) Preenche categorias vazias com todas as categorias ativas (parceiras antigas).
update public.companies c
set categorias_ids = coalesce(
  (
    select array_agg(vc.id)
    from public.vehicle_categories vc
    where vc.ativo = true
  ),
  '{}'::uuid[]
)
where c.status = 'ativa'
  and c.habilitada_receber = true
  and cardinality(c.categorias_ids) = 0;

-- 3) Destrava corridas pagas sem empresa: cria oferta para cada parceira elegível.
insert into public.trip_assignments (viagem_id, empresa_id, status, motivo, created_at)
select
  t.id,
  c.id,
  'oferecida',
  'redistribuicao_sql',
  now()
from public.trips t
join public.companies c
  on c.status = 'ativa'
 and c.habilitada_receber = true
 and (
   cardinality(c.categorias_ids) = 0
   or t.categoria_id = any (c.categorias_ids)
 )
where t.payment_status = 'paid'
  and t.empresa_id is null
  and t.status in ('paid', 'aguardando_empresa', 'oferta_enviada')
on conflict (viagem_id, empresa_id) do update
set
  status = 'oferecida',
  motivo = excluded.motivo;

update public.trips t
set
  status = 'aguardando_empresa',
  updated_at = now(),
  version = t.version + 1
where t.payment_status = 'paid'
  and t.empresa_id is null
  and t.status in ('paid', 'oferta_enviada')
  and exists (
    select 1
    from public.trip_assignments a
    where a.viagem_id = t.id
      and a.status = 'oferecida'
  );
