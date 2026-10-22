-- Lista parceiras elegíveis para o cliente ranquear/ofertar corridas (bypass RLS de companies).
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
    and p_categoria_id = any (c.categorias_ids)
    and c.latitude is not null
    and c.longitude is not null
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
    );
$$;

revoke all on function public.empresas_para_distribuicao(uuid) from public;
grant execute on function public.empresas_para_distribuicao(uuid) to authenticated;
