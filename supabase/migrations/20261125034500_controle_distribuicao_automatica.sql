-- Controle de distribuição do aceite automático.
-- O fuso da operação continua America/Los_Angeles, o mesmo das corridas e do limite diário da empresa.
-- A semana começa na segunda-feira (date_trunc week).
-- Limite nulo = ilimitado. O teto do administrador soma-se ao limite diário que a empresa já configura.
-- Cancelada, expirada ou corrida que deixou de ser da empresa: a vaga volta e a linha permanece.

alter table public.company_auto_accept_settings
  add column if not exists periodo_distribuicao text not null default 'diario',
  add column if not exists limite_distribuicao integer,
  add column if not exists contador_reiniciado_em timestamptz,
  add column if not exists ultima_distribuicao_em timestamptz;

alter table public.trip_auto_acceptances
  add column if not exists conta_limite boolean not null default true;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'company_auto_accept_settings_periodo_check'
      and conrelid = 'public.company_auto_accept_settings'::regclass
  ) then
    alter table public.company_auto_accept_settings
      add constraint company_auto_accept_settings_periodo_check
      check (periodo_distribuicao in ('diario', 'semanal', 'mensal'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'company_auto_accept_settings_limite_distribuicao_check'
      and conrelid = 'public.company_auto_accept_settings'::regclass
  ) then
    alter table public.company_auto_accept_settings
      add constraint company_auto_accept_settings_limite_distribuicao_check
      check (limite_distribuicao is null or limite_distribuicao > 0);
  end if;
end $$;

create index if not exists trip_auto_acceptances_cota
  on public.trip_auto_acceptances (empresa_id, aceito_em)
  where conta_limite and viagem_id is not null;

update public.trip_auto_acceptances a
   set conta_limite = false
 where a.conta_limite
   and (
     a.viagem_id is null
     or exists (
       select 1
       from public.trips t
       where t.id = a.viagem_id
         and (
           t.status in ('cancelada', 'expired')
           or t.empresa_id is distinct from a.empresa_id
         )
     )
   );

create or replace function public.inicio_periodo_distribuicao(p_periodo text)
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select case
    when p_periodo = 'semanal' then
      date_trunc('week', (now() at time zone 'America/Los_Angeles'))
        at time zone 'America/Los_Angeles'
    when p_periodo = 'mensal' then
      date_trunc('month', (now() at time zone 'America/Los_Angeles'))
        at time zone 'America/Los_Angeles'
    else
      date_trunc('day', (now() at time zone 'America/Los_Angeles'))
        at time zone 'America/Los_Angeles'
  end;
$$;

create or replace function public.aceites_distribuidos_no_periodo(
  p_empresa_id uuid,
  p_periodo text,
  p_reinicio timestamptz
)
returns integer
language sql
volatile
set search_path = ''
as $$
  select count(*)::integer
  from public.trip_auto_acceptances x
  where x.empresa_id = p_empresa_id
    and x.conta_limite
    and x.viagem_id is not null
    and x.aceito_em >= public.inicio_periodo_distribuicao(coalesce(p_periodo, 'diario'))
    and (p_reinicio is null or x.aceito_em > p_reinicio);
$$;

create or replace function public.ajustar_cota_aceite_automatico()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  conta boolean;
begin
  conta := new.empresa_id is not null
    and new.status not in ('cancelada', 'expired');
  update public.trip_auto_acceptances a
     set conta_limite = conta and new.empresa_id is not distinct from a.empresa_id
   where a.viagem_id = new.id
     and a.conta_limite is distinct from (conta and new.empresa_id is not distinct from a.empresa_id);
  return new;
end;
$$;

drop trigger if exists trg_ajustar_cota_aceite_automatico on public.trips;
create trigger trg_ajustar_cota_aceite_automatico
  after update of status, empresa_id on public.trips
  for each row
  when (
    old.status is distinct from new.status
    or old.empresa_id is distinct from new.empresa_id
  )
  execute function public.ajustar_cota_aceite_automatico();

create or replace function public.processar_aceites_automaticos()
returns integer
language plpgsql
set search_path = ''
as $$
declare
  agora timestamptz := now();
  hora_local timestamp := agora at time zone 'America/Los_Angeles';
  hoje date := hora_local::date;
  corrida public.trips;
  vencedora uuid;
  total integer := 0;
begin
  -- Uma execução por vez. O lock da corrida também concorre com o aceite manual.
  if not pg_try_advisory_xact_lock(hashtextextended('jemani.aceites_automaticos', 0)) then
    return 0;
  end if;
  if not exists (select 1 from public.company_auto_accept_settings where ligada) then
    return 0;
  end if;

  for corrida in
    select t.*
    from public.trips t
    where t.empresa_id is null
      and t.payment_status = 'paid'
      and t.status in ('paid', 'aguardando_empresa', 'oferta_enviada')
      and (t.data_viagem, t.horario) > (hoje, hora_local::time)
      and not exists (select 1 from public.trip_auto_acceptances x where x.viagem_id = t.id)
      and exists (
        select 1
        from public.trip_assignments a
        join public.company_auto_accept_settings cfg on cfg.empresa_id = a.empresa_id
        join public.empresas_para_distribuicao(t.categoria_id) elegivel on elegivel.id = a.empresa_id
        where a.viagem_id = t.id and a.status = 'oferecida'
          and cfg.liberada and cfg.ligada and a.created_at >= cfg.ativada_em
          and t.valor_empresa >= cfg.valor_minimo_usd
          and (cfg.limite_diario is null or cfg.limite_diario > (
            select count(*) from public.trip_auto_acceptances x
            where x.empresa_id = cfg.empresa_id
              and x.dia_operacional = hoje
              and x.conta_limite
              and x.viagem_id is not null
          ))
          and (
            cfg.limite_distribuicao is null
            or public.aceites_distribuidos_no_periodo(
              cfg.empresa_id, cfg.periodo_distribuicao, cfg.contador_reiniciado_em
            ) < cfg.limite_distribuicao
          )
      )
    order by t.data_viagem, t.horario, t.id
    limit 100
    for update of t skip locked
  loop
    -- Quem está há mais tempo sem receber fica na frente. Quem nunca recebeu vem primeiro.
    select a.empresa_id into vencedora
    from public.trip_assignments a
    join public.company_auto_accept_settings cfg on cfg.empresa_id = a.empresa_id
    join public.empresas_para_distribuicao(corrida.categoria_id) elegivel on elegivel.id = a.empresa_id
    where a.viagem_id = corrida.id and a.status = 'oferecida'
      and cfg.liberada and cfg.ligada and a.created_at >= cfg.ativada_em
      and corrida.valor_empresa >= cfg.valor_minimo_usd
      and (cfg.limite_diario is null or cfg.limite_diario > (
        select count(*) from public.trip_auto_acceptances x
        where x.empresa_id = cfg.empresa_id
          and x.dia_operacional = hoje
          and x.conta_limite
          and x.viagem_id is not null
      ))
      and (
        cfg.limite_distribuicao is null
        or public.aceites_distribuidos_no_periodo(
          cfg.empresa_id, cfg.periodo_distribuicao, cfg.contador_reiniciado_em
        ) < cfg.limite_distribuicao
      )
    order by cfg.ultima_distribuicao_em nulls first, a.empresa_id
    limit 1
    for update of a, cfg skip locked;

    if vencedora is null then continue; end if;

    insert into public.trip_auto_acceptances (viagem_id, empresa_id, dia_operacional)
    values (corrida.id, vencedora, hoje)
    on conflict (viagem_id) do nothing;
    if not found then continue; end if;

    update public.trips
       set empresa_id = vencedora,
           status = 'empresa_confirmada',
           version = version + 1,
           updated_at = agora
     where id = corrida.id
       and empresa_id is null;

    if not found then
      delete from public.trip_auto_acceptances
       where viagem_id = corrida.id
         and empresa_id = vencedora;
      continue;
    end if;

    update public.company_auto_accept_settings
       set ultima_distribuicao_em = clock_timestamp()
     where empresa_id = vencedora;

    insert into public.trip_status_history (viagem_id, status_anterior, status_novo, observacao)
    values (corrida.id, corrida.status, 'empresa_confirmada', 'Aceite automático');

    insert into public.notifications (usuario_id, titulo, mensagem, tipo, referencia_id)
    select corrida.cliente_id, 'Empresa confirmada',
           'A empresa aceitou sua viagem ' || corrida.codigo || '.',
           'status', corrida.id::text
    union all
    select c.usuario_id, 'Corrida aceita automaticamente',
           'A viagem ' || corrida.codigo || ' está em Viagens.',
           'status', corrida.id::text
      from public.companies c
     where c.id = vencedora and c.usuario_id is not null;

    total := total + 1;
  end loop;
  return total;
end;
$$;

create or replace function public.contar_aceites_automaticos_hoje(p_empresa_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  hoje date := (now() at time zone 'America/Los_Angeles')::date;
  total integer;
begin
  if p_empresa_id is null then
    raise exception 'Empresa obrigatória' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.ativo
      and (
        p.tipo = 'admin'
        or (p.tipo = 'empresa' and p_empresa_id = public.minha_empresa_id())
      )
  ) then
    raise exception 'Sem permissão para consultar aceites desta empresa' using errcode = '42501';
  end if;

  select count(*)::integer
    into total
  from public.trip_auto_acceptances x
  where x.empresa_id = p_empresa_id
    and x.dia_operacional = hoje
    and x.conta_limite
    and x.viagem_id is not null;

  return coalesce(total, 0);
end;
$$;

create or replace function public.listar_controle_distribuicao()
returns table (
  empresa_id uuid,
  nome_comercial text,
  status_empresa public.status_empresa,
  habilitada_receber boolean,
  liberada boolean,
  ligada boolean,
  ilimitada boolean,
  limite integer,
  periodo text,
  recebidas integer,
  restante integer,
  limite_atingido boolean,
  pode_receber boolean,
  recebidas_total integer,
  contador_reiniciado_em timestamptz
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
    raise exception 'Apenas administradores podem ver o controle de distribuição'
      using errcode = '42501';
  end if;

  return query
  with hoje as (
    select (now() at time zone 'America/Los_Angeles')::date as dia
  ),
  aceites as (
    select
      x.empresa_id,
      cast(count(*) filter (
        where x.conta_limite
          and x.viagem_id is not null
          and x.aceito_em >= public.inicio_periodo_distribuicao(coalesce(cfg.periodo_distribuicao, 'diario'))
          and (cfg.contador_reiniciado_em is null or x.aceito_em > cfg.contador_reiniciado_em)
      ) as integer) as recebidas,
      cast(count(*) filter (
        where x.conta_limite
          and x.viagem_id is not null
          and x.dia_operacional = (select hoje.dia from hoje)
      ) as integer) as recebidas_hoje,
      cast(count(*) filter (
        where x.conta_limite and x.viagem_id is not null
      ) as integer) as recebidas_total
    from public.trip_auto_acceptances x
    left join public.company_auto_accept_settings cfg on cfg.empresa_id = x.empresa_id
    group by x.empresa_id, cfg.periodo_distribuicao, cfg.contador_reiniciado_em
  )
  select
    c.id,
    c.nome_comercial,
    c.status,
    c.habilitada_receber,
    coalesce(cfg.liberada, false),
    coalesce(cfg.ligada, false),
    cfg.limite_distribuicao is null,
    cfg.limite_distribuicao,
    coalesce(cfg.periodo_distribuicao, 'diario'),
    coalesce(a.recebidas, 0),
    case
      when cfg.limite_distribuicao is null then null::integer
      else greatest(cfg.limite_distribuicao - coalesce(a.recebidas, 0), 0)
    end,
    (
      cfg.limite_distribuicao is not null
      and coalesce(a.recebidas, 0) >= cfg.limite_distribuicao
    ),
    (
      coalesce(cfg.liberada, false)
      and coalesce(cfg.ligada, false)
      and c.status = 'ativa'::public.status_empresa
      and c.habilitada_receber
      and not (
        cfg.limite_distribuicao is not null
        and coalesce(a.recebidas, 0) >= cfg.limite_distribuicao
      )
      and (
        cfg.limite_diario is null
        or coalesce(a.recebidas_hoje, 0) < cfg.limite_diario
      )
    ),
    coalesce(a.recebidas_total, 0),
    cfg.contador_reiniciado_em
  from public.companies c
  left join public.company_auto_accept_settings cfg on cfg.empresa_id = c.id
  left join aceites a on a.empresa_id = c.id
  order by c.nome_comercial;
end;
$$;

create or replace function public.configurar_distribuicao_automatica(
  p_empresa_id uuid,
  p_liberada boolean,
  p_ilimitada boolean,
  p_limite integer,
  p_periodo text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limite integer;
begin
  if p_empresa_id is null then
    raise exception 'Empresa obrigatória' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.tipo = 'admin' and p.ativo
  ) then
    raise exception 'Apenas administradores podem configurar a distribuição automática'
      using errcode = '42501';
  end if;
  if not exists (select 1 from public.companies c where c.id = p_empresa_id) then
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

  insert into public.company_auto_accept_settings as config (
    empresa_id, liberada, periodo_distribuicao, limite_distribuicao
  )
  values (p_empresa_id, coalesce(p_liberada, false), p_periodo, v_limite)
  on conflict (empresa_id) do update
    set liberada = excluded.liberada,
        ligada = config.ligada and excluded.liberada,
        ativada_em = case when excluded.liberada then config.ativada_em end,
        periodo_distribuicao = excluded.periodo_distribuicao,
        limite_distribuicao = excluded.limite_distribuicao;
end;
$$;

create or replace function public.reiniciar_contador_distribuicao(p_empresa_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  marco timestamptz;
begin
  if p_empresa_id is null then
    raise exception 'Empresa obrigatória' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.tipo = 'admin' and p.ativo
  ) then
    raise exception 'Apenas administradores podem reiniciar o contador'
      using errcode = '42501';
  end if;
  if not exists (select 1 from public.companies c where c.id = p_empresa_id) then
    raise exception 'Empresa não encontrada' using errcode = 'P0002';
  end if;

  marco := clock_timestamp();
  insert into public.company_auto_accept_settings (empresa_id, liberada, contador_reiniciado_em)
  values (p_empresa_id, false, marco)
  on conflict (empresa_id) do update
    set contador_reiniciado_em = excluded.contador_reiniciado_em;
  return marco;
end;
$$;

revoke all on function public.inicio_periodo_distribuicao(text),
  public.aceites_distribuidos_no_periodo(uuid, text, timestamptz),
  public.ajustar_cota_aceite_automatico()
  from public, anon, authenticated, service_role;

revoke all on function public.listar_controle_distribuicao(),
  public.configurar_distribuicao_automatica(uuid, boolean, boolean, integer, text),
  public.reiniciar_contador_distribuicao(uuid)
  from public, anon, authenticated;

grant execute on function public.listar_controle_distribuicao(),
  public.configurar_distribuicao_automatica(uuid, boolean, boolean, integer, text),
  public.reiniciar_contador_distribuicao(uuid)
  to authenticated;

revoke all on function public.contar_aceites_automaticos_hoje(uuid)
  from public, anon, authenticated;
grant execute on function public.contar_aceites_automaticos_hoje(uuid) to authenticated;
