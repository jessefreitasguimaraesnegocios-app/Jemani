-- RPC de distribuição: não expõe CNPJ/razão social a qualquer authenticated.
drop function if exists public.empresas_para_distribuicao(uuid);

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
    ''::text as razao_social,
    ''::text as cnpj,
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
