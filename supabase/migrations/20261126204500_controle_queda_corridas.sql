-- Queda das corridas normais: quantidade, intervalo e fila.
-- Não mexe no aceite automático. O fuso continua America/Los_Angeles.
-- Rodízio igual: uma empresa por vez.
-- Prioridade: peso 2 ou 3 volta antes de fechar a fila, sem repetir em seguida se houver outra.
-- Destaque: prioridade alta recebe, depois uma empresa comum, e volta.

create table if not exists public.ride_fall_config (
  id boolean primary key default true check (id),
  modo text not null default 'rodizio',
  ponteiro integer not null default 0,
  atualizado_em timestamptz not null default now(),
  constraint ride_fall_config_modo_check check (modo in ('rodizio', 'prioridade', 'destaque'))
);

insert into public.ride_fall_config (id)
values (true)
on conflict (id) do nothing;

create table if not exists public.company_ride_fall_settings (
  empresa_id uuid primary key references public.companies (id) on delete cascade,
  participa boolean not null default true,
  limite integer,
  periodo text not null default 'diario',
  intervalo_minutos integer,
  prioridade smallint not null default 1,
  ordem integer not null default 0,
  contador_reiniciado_em timestamptz,
  constraint company_ride_fall_settings_limite_check check (limite is null or limite > 0),
  constraint company_ride_fall_settings_periodo_check check (periodo in ('diario', 'semanal', 'mensal')),
  constraint company_ride_fall_settings_intervalo_check check (intervalo_minutos is null or intervalo_minutos > 0),
  constraint company_ride_fall_settings_prioridade_check check (prioridade between 1 and 3)
);

create table if not exists public.trip_ride_falls (
  viagem_id uuid primary key references public.trips (id) on delete cascade,
  empresa_id uuid not null references public.companies (id) on delete cascade,
  caida_em timestamptz not null default now(),
  conta boolean not null default true
);

create table if not exists public.trip_ride_fall_recusas (
  viagem_id uuid not null references public.trips (id) on delete cascade,
  empresa_id uuid not null references public.companies (id) on delete cascade,
  primary key (viagem_id, empresa_id)
);

create index if not exists trip_ride_falls_empresa_conta
  on public.trip_ride_falls (empresa_id, caida_em)
  where conta;

alter table public.ride_fall_config enable row level security;
alter table public.company_ride_fall_settings enable row level security;
alter table public.trip_ride_falls enable row level security;
alter table public.trip_ride_fall_recusas enable row level security;

alter table public.ride_fall_config force row level security;
alter table public.company_ride_fall_settings force row level security;
alter table public.trip_ride_falls force row level security;
alter table public.trip_ride_fall_recusas force row level security;

revoke all on public.ride_fall_config, public.company_ride_fall_settings,
  public.trip_ride_falls, public.trip_ride_fall_recusas
  from public, anon, authenticated;

create or replace function public.ciclo_queda(p_ids uuid[], p_pesos integer[], p_modo text)
returns uuid[]
language plpgsql
immutable
set search_path = ''
as $$
declare
  n integer := coalesce(array_length(p_ids, 1), 0);
  seq uuid[] := '{}';
  falta integer[];
  total integer := 0;
  ultimo uuid;
  melhor integer;
  i integer;
  passo integer;
  destaques uuid[] := '{}';
  comuns uuid[] := '{}';
  nd integer;
  nc integer;
  tem_outra boolean;
begin
  if n = 0 then
    return seq;
  end if;
  if p_modo is distinct from 'prioridade' and p_modo is distinct from 'destaque' then
    return p_ids;
  end if;

  if p_modo = 'destaque' then
    for i in 1..n loop
      if coalesce(p_pesos[i], 1) >= 2 then
        destaques := destaques || p_ids[i];
      else
        comuns := comuns || p_ids[i];
      end if;
    end loop;
    nd := coalesce(array_length(destaques, 1), 0);
    nc := coalesce(array_length(comuns, 1), 0);
    if nd = 0 then
      return p_ids;
    end if;
    if nc = 0 then
      return destaques;
    end if;
    for passo in 0..greatest(nd, nc) - 1 loop
      seq := seq || destaques[(passo % nd) + 1] || comuns[(passo % nc) + 1];
    end loop;
    return seq;
  end if;

  falta := p_pesos;
  for i in 1..n loop
    if falta[i] is null or falta[i] < 1 then
      falta[i] := 1;
    end if;
    if falta[i] > 3 then
      falta[i] := 3;
    end if;
    total := total + falta[i];
  end loop;

  while coalesce(array_length(seq, 1), 0) < total loop
    melhor := null;
    for i in 1..n loop
      if falta[i] <= 0 then
        continue;
      end if;
      if ultimo is not null and p_ids[i] = ultimo then
        tem_outra := false;
        for passo in 1..n loop
          if falta[passo] > 0 and p_ids[passo] is distinct from ultimo then
            tem_outra := true;
          end if;
        end loop;
        if tem_outra then
          continue;
        end if;
      end if;
      if melhor is null
        or coalesce(p_pesos[i], 1) > coalesce(p_pesos[melhor], 1)
        or (
          coalesce(p_pesos[i], 1) = coalesce(p_pesos[melhor], 1)
          and i < melhor
        )
      then
        melhor := i;
      end if;
    end loop;
    exit when melhor is null;
    seq := seq || p_ids[melhor];
    falta[melhor] := falta[melhor] - 1;
    ultimo := p_ids[melhor];
  end loop;
  return seq;
end;
$$;

create or replace function public.escolher_empresa_queda_interna(p_viagem_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  atual uuid;
  v_modo text;
  v_ponteiro integer;
  v_categoria uuid;
  ids uuid[] := '{}';
  pesos integer[] := '{}';
  disp boolean[] := '{}';
  ciclo uuid[] := '{}';
  rec record;
  recebidas integer;
  ultima timestamptz;
  inicio timestamptz;
  escolhida uuid;
  indice integer;
  passo integer;
  n integer;
begin
  if p_viagem_id is null then
    raise exception 'Viagem obrigatória' using errcode = '22023';
  end if;

  select t.categoria_id
    into v_categoria
  from public.trips t
  where t.id = p_viagem_id;

  if not found then
    raise exception 'Viagem não encontrada' using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('jemani.queda_corridas', 0));

  select f.empresa_id
    into atual
  from public.trip_ride_falls f
  where f.viagem_id = p_viagem_id
    and f.conta;
  if atual is not null then
    return atual;
  end if;

  select cfg.modo, cfg.ponteiro
    into v_modo, v_ponteiro
  from public.ride_fall_config cfg
  where cfg.id;

  v_modo := coalesce(v_modo, 'rodizio');
  v_ponteiro := coalesce(v_ponteiro, 0);

  for rec in
    select
      c.id,
      c.nome_comercial,
      coalesce(s.participa, true) as participa,
      s.limite,
      coalesce(s.periodo, 'diario') as periodo,
      s.intervalo_minutos,
      coalesce(s.prioridade, 1) as prioridade,
      coalesce(s.ordem, 0) as ordem,
      s.contador_reiniciado_em
    from public.empresas_para_distribuicao(v_categoria) e
    join public.companies c on c.id = e.id
    left join public.company_ride_fall_settings s on s.empresa_id = c.id
    where not exists (
      select 1
      from public.trip_ride_fall_recusas r
      where r.viagem_id = p_viagem_id
        and r.empresa_id = c.id
    )
    order by coalesce(s.ordem, 0), c.nome_comercial, c.id
  loop
    if not rec.participa then
      continue;
    end if;
    inicio := public.inicio_periodo_distribuicao(rec.periodo);
    select count(*)::integer
      into recebidas
    from public.trip_ride_falls f
    where f.empresa_id = rec.id
      and f.conta
      and f.caida_em >= inicio
      and (rec.contador_reiniciado_em is null or f.caida_em > rec.contador_reiniciado_em);

    select max(f.caida_em)
      into ultima
    from public.trip_ride_falls f
    where f.empresa_id = rec.id
      and f.conta;

    ids := ids || rec.id;
    pesos := pesos || rec.prioridade::integer;
    disp := disp || (
      (rec.limite is null or recebidas < rec.limite)
      and (
        rec.intervalo_minutos is null
        or ultima is null
        or ultima <= now() - make_interval(mins => rec.intervalo_minutos)
      )
    );
  end loop;

  ciclo := public.ciclo_queda(ids, pesos, v_modo);
  n := coalesce(array_length(ciclo, 1), 0);
  if n = 0 then
    return null;
  end if;

  for passo in 0..n - 1 loop
    indice := ((v_ponteiro + passo) % n) + 1;
    escolhida := ciclo[indice];
    if disp[array_position(ids, escolhida)] then
      insert into public.trip_ride_falls (viagem_id, empresa_id, conta)
      values (p_viagem_id, escolhida, true)
      on conflict (viagem_id) do update
        set empresa_id = excluded.empresa_id,
            caida_em = now(),
            conta = true
      where public.trip_ride_falls.conta = false;

      update public.ride_fall_config
         set ponteiro = indice % n,
             atualizado_em = now()
       where id;
      return escolhida;
    end if;
  end loop;

  return null;
end;
$$;

create or replace function public.escolher_empresa_queda(p_viagem_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cliente uuid;
begin
  select t.cliente_id into v_cliente from public.trips t where t.id = p_viagem_id;
  if not found then
    raise exception 'Viagem não encontrada' using errcode = 'P0002';
  end if;
  if coalesce(auth.role(), '') is distinct from 'service_role'
    and not exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.ativo and (p.tipo = 'admin' or p.id = v_cliente)
    )
  then
    raise exception 'Sem permissão para distribuir esta corrida' using errcode = '42501';
  end if;
  return public.escolher_empresa_queda_interna(p_viagem_id);
end;
$$;

create or replace function public.avancar_queda_corrida(p_viagem_id uuid, p_empresa_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_viagem_id is null or p_empresa_id is null then
    raise exception 'Viagem e empresa são obrigatórias' using errcode = '22023';
  end if;
  if coalesce(auth.role(), '') is distinct from 'service_role'
    and not exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.ativo
        and (
          p.tipo = 'admin'
          or (p.tipo = 'empresa' and p_empresa_id = public.minha_empresa_id())
        )
    )
  then
    raise exception 'Sem permissão para passar esta corrida' using errcode = '42501';
  end if;

  insert into public.trip_ride_fall_recusas (viagem_id, empresa_id)
  values (p_viagem_id, p_empresa_id)
  on conflict do nothing;

  update public.trip_ride_falls
     set conta = false
   where viagem_id = p_viagem_id
     and empresa_id = p_empresa_id;

  return public.escolher_empresa_queda_interna(p_viagem_id);
end;
$$;

create or replace function public.obter_modo_queda()
returns table (modo text, ponteiro integer)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.tipo = 'admin' and p.ativo
  ) then
    raise exception 'Apenas administradores podem ver a queda das corridas'
      using errcode = '42501';
  end if;
  return query
  select cfg.modo, cfg.ponteiro
  from public.ride_fall_config cfg
  where cfg.id;
end;
$$;

create or replace function public.definir_modo_queda(p_modo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.tipo = 'admin' and p.ativo
  ) then
    raise exception 'Apenas administradores podem definir o modo da fila'
      using errcode = '42501';
  end if;
  if p_modo is null or p_modo not in ('rodizio', 'prioridade', 'destaque') then
    raise exception 'Modo inválido' using errcode = '22023';
  end if;
  update public.ride_fall_config
     set modo = p_modo,
         atualizado_em = now()
   where id;
end;
$$;

create or replace function public.listar_controle_queda()
returns table (
  empresa_id uuid,
  nome_comercial text,
  participa boolean,
  ilimitada boolean,
  limite integer,
  periodo text,
  intervalo_minutos integer,
  prioridade smallint,
  ordem integer,
  recebidas integer,
  restante integer,
  limite_atingido boolean,
  pode_receber boolean,
  recebidas_total integer,
  ultima_queda_em timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.tipo = 'admin' and p.ativo
  ) then
    raise exception 'Apenas administradores podem ver a queda das corridas'
      using errcode = '42501';
  end if;

  return query
  select
    c.id,
    c.nome_comercial,
    coalesce(s.participa, true),
    s.limite is null,
    s.limite,
    coalesce(s.periodo, 'diario'),
    s.intervalo_minutos,
    coalesce(s.prioridade, 1)::smallint,
    coalesce(s.ordem, 0),
    coalesce(cont.recebidas, 0),
    case
      when s.limite is null then null::integer
      else greatest(s.limite - coalesce(cont.recebidas, 0), 0)
    end,
    s.limite is not null and coalesce(cont.recebidas, 0) >= s.limite,
    (
      coalesce(s.participa, true)
      and c.status = 'ativa'::public.status_empresa
      and c.habilitada_receber
      and not (s.limite is not null and coalesce(cont.recebidas, 0) >= s.limite)
      and (
        s.intervalo_minutos is null
        or cont.ultima is null
        or cont.ultima <= now() - make_interval(mins => s.intervalo_minutos)
      )
    ),
    coalesce(cont.total, 0),
    cont.ultima
  from public.companies c
  left join public.company_ride_fall_settings s on s.empresa_id = c.id
  left join lateral (
    select
      count(*) filter (
        where f.conta
          and f.caida_em >= public.inicio_periodo_distribuicao(coalesce(s.periodo, 'diario'))
          and (s.contador_reiniciado_em is null or f.caida_em > s.contador_reiniciado_em)
      )::integer as recebidas,
      count(*) filter (where f.conta)::integer as total,
      max(f.caida_em) filter (where f.conta) as ultima
    from public.trip_ride_falls f
    where f.empresa_id = c.id
  ) cont on true
  order by coalesce(s.ordem, 0), c.nome_comercial;
end;
$$;

create or replace function public.configurar_queda_empresa(
  p_empresa_id uuid,
  p_participa boolean,
  p_ilimitada boolean,
  p_limite integer,
  p_periodo text,
  p_intervalo_minutos integer,
  p_prioridade integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limite integer;
  v_intervalo integer;
  v_prioridade smallint;
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.tipo = 'admin' and p.ativo
  ) then
    raise exception 'Apenas administradores podem configurar a queda' using errcode = '42501';
  end if;
  if p_empresa_id is null or not exists (select 1 from public.companies c where c.id = p_empresa_id) then
    raise exception 'Empresa não encontrada' using errcode = 'P0002';
  end if;
  if p_periodo is null or p_periodo not in ('diario', 'semanal', 'mensal') then
    raise exception 'Período inválido' using errcode = '22023';
  end if;
  if coalesce(p_ilimitada, false) then
    v_limite := null;
  elsif p_limite is null or p_limite < 1 or p_limite > 1000000 then
    raise exception 'Limite inválido' using errcode = '22023';
  else
    v_limite := p_limite;
  end if;
  if p_intervalo_minutos is null then
    v_intervalo := null;
  elsif p_intervalo_minutos < 1 or p_intervalo_minutos > 10080 then
    raise exception 'Intervalo inválido' using errcode = '22023';
  else
    v_intervalo := p_intervalo_minutos;
  end if;
  if p_prioridade is null or p_prioridade < 1 or p_prioridade > 3 then
    raise exception 'Prioridade inválida' using errcode = '22023';
  end if;
  v_prioridade := p_prioridade::smallint;

  insert into public.company_ride_fall_settings as config (
    empresa_id, participa, limite, periodo, intervalo_minutos, prioridade
  )
  values (
    p_empresa_id,
    coalesce(p_participa, true),
    v_limite,
    p_periodo,
    v_intervalo,
    v_prioridade
  )
  on conflict (empresa_id) do update
    set participa = excluded.participa,
        limite = excluded.limite,
        periodo = excluded.periodo,
        intervalo_minutos = excluded.intervalo_minutos,
        prioridade = excluded.prioridade;
end;
$$;

create or replace function public.definir_ordens_queda(p_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  i integer;
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.tipo = 'admin' and p.ativo
  ) then
    raise exception 'Apenas administradores podem ordenar a fila' using errcode = '42501';
  end if;
  if p_ids is null then
    return;
  end if;
  for i in 1..coalesce(array_length(p_ids, 1), 0) loop
    insert into public.company_ride_fall_settings (empresa_id, ordem)
    values (p_ids[i], i * 10)
    on conflict (empresa_id) do update
      set ordem = excluded.ordem;
  end loop;
end;
$$;

create or replace function public.reiniciar_contador_queda(p_empresa_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  marco timestamptz := clock_timestamp();
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.tipo = 'admin' and p.ativo
  ) then
    raise exception 'Apenas administradores podem reiniciar o contador' using errcode = '42501';
  end if;
  if p_empresa_id is null or not exists (select 1 from public.companies c where c.id = p_empresa_id) then
    raise exception 'Empresa não encontrada' using errcode = 'P0002';
  end if;
  insert into public.company_ride_fall_settings (empresa_id, contador_reiniciado_em)
  values (p_empresa_id, marco)
  on conflict (empresa_id) do update
    set contador_reiniciado_em = excluded.contador_reiniciado_em;
  return marco;
end;
$$;

revoke all on function public.ciclo_queda(uuid[], integer[], text),
  public.escolher_empresa_queda_interna(uuid)
  from public, anon, authenticated, service_role;

revoke all on function public.escolher_empresa_queda(uuid),
  public.avancar_queda_corrida(uuid, uuid),
  public.obter_modo_queda(),
  public.definir_modo_queda(text),
  public.listar_controle_queda(),
  public.configurar_queda_empresa(uuid, boolean, boolean, integer, text, integer, integer),
  public.definir_ordens_queda(uuid[]),
  public.reiniciar_contador_queda(uuid)
  from public, anon, authenticated;

grant execute on function public.escolher_empresa_queda(uuid),
  public.avancar_queda_corrida(uuid, uuid)
  to authenticated, service_role;

grant execute on function public.obter_modo_queda(),
  public.definir_modo_queda(text),
  public.listar_controle_queda(),
  public.configurar_queda_empresa(uuid, boolean, boolean, integer, text, integer, integer),
  public.definir_ordens_queda(uuid[]),
  public.reiniciar_contador_queda(uuid)
  to authenticated;
