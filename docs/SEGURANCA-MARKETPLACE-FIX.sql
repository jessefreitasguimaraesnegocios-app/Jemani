-- Se empresas_marketplace ainda der 404 no PostgREST, rode isto e confira o SELECT final.
-- Usa status text (evita problema de enum) e força reload do schema.

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

-- Garante rate limit (service_role) se ainda não existir
create table if not exists public.edge_rate_limits (
  chave text primary key,
  contagem integer not null default 0,
  janela_inicio timestamptz not null default now()
);

alter table public.edge_rate_limits enable row level security;

drop policy if exists edge_rate_limits_deny on public.edge_rate_limits;
create policy edge_rate_limits_deny on public.edge_rate_limits
  for all to authenticated
  using (false)
  with check (false);

create or replace function public.edge_rate_limit(
  p_chave text,
  p_limite integer,
  p_janela_segundos integer
)
returns table (ok boolean, retry_after_segundos integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agora timestamptz := now();
  v_inicio timestamptz;
  v_contagem integer;
  v_limite integer := greatest(1, p_limite);
  v_janela integer := greatest(1, p_janela_segundos);
begin
  if p_chave is null or length(trim(p_chave)) < 3 then
    return query select false, v_janela;
    return;
  end if;

  insert into public.edge_rate_limits (chave, contagem, janela_inicio)
  values (p_chave, 1, v_agora)
  on conflict (chave) do update
  set
    contagem = case
      when public.edge_rate_limits.janela_inicio + make_interval(secs => v_janela) <= v_agora
        then 1
      else public.edge_rate_limits.contagem + 1
    end,
    janela_inicio = case
      when public.edge_rate_limits.janela_inicio + make_interval(secs => v_janela) <= v_agora
        then v_agora
      else public.edge_rate_limits.janela_inicio
    end
  returning edge_rate_limits.contagem, edge_rate_limits.janela_inicio
  into v_contagem, v_inicio;

  if v_contagem <= v_limite then
    return query select true, 0;
  else
    return query select
      false,
      greatest(
        1,
        ceil(extract(epoch from (v_inicio + make_interval(secs => v_janela) - v_agora)))::integer
      );
  end if;
end;
$$;

revoke all on function public.edge_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.edge_rate_limit(text, integer, integer) to service_role;

NOTIFY pgrst, 'reload schema';

-- Deve retornar as 2 linhas
select proname
from pg_proc
where proname in ('empresas_marketplace', 'edge_rate_limit')
order by 1;

-- Deve listar empresas ativas
select * from public.empresas_marketplace();
