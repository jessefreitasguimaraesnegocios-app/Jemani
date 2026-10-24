-- Hourly Chauffeur: modalidade, preços por hora, extensões e avisos (compatível com one_way).

-- 1) Preços hourly (admin configura; 0 = desabilitado em produção)
alter table public.price_rules
  add column if not exists preco_por_hora numeric(12, 2) not null default 0,
  add column if not exists franquia_milhas_por_hora numeric(12, 2) not null default 0,
  add column if not exists preco_por_milha_excedente numeric(12, 2) not null default 0,
  add column if not exists duracao_minima_minutos integer not null default 120,
  add column if not exists duracao_maxima_minutos integer not null default 720,
  add column if not exists pacotes_minutos integer[] not null default '{120,180,240,300,360,480}',
  add column if not exists regra_extensao text,
  add column if not exists regra_cancelamento text,
  add column if not exists cobrancas_adicionais text;

-- 2) Campos hourly em trips (one_way continua igual; destino permanece NOT NULL com placeholder)
alter table public.trips
  add column if not exists modalidade text not null default 'one_way'
    check (modalidade in ('one_way', 'hourly')),
  add column if not exists duracao_contratada_minutos integer,
  add column if not exists inicio_agendado timestamptz,
  add column if not exists fim_agendado timestamptz,
  add column if not exists franquia_milhas numeric(12, 2),
  add column if not exists milhas_percorridas numeric(12, 2),
  add column if not exists horario_vencido_em timestamptz,
  add column if not exists conclusao_efetiva_em timestamptz;

create index if not exists idx_trips_modalidade on public.trips (modalidade);
create index if not exists idx_trips_fim_agendado on public.trips (fim_agendado)
  where modalidade = 'hourly' and status is distinct from 'viagem_finalizada'
    and status is distinct from 'cancelada';

-- 3) Extensões (histórico + cobrança)
create table if not exists public.trip_extensions (
  id uuid primary key default gen_random_uuid(),
  viagem_id uuid not null references public.trips (id) on delete cascade,
  minutos integer not null check (minutos > 0),
  preco_adicional numeric(12, 2) not null default 0,
  valor_plataforma numeric(12, 2) not null default 0,
  valor_empresa numeric(12, 2) not null default 0,
  payment_id uuid references public.payments (id) on delete set null,
  status text not null default 'pendente'
    check (status in ('pendente', 'pago', 'falhou', 'cancelado', 'expirado')),
  idempotency_key text not null,
  fim_anterior timestamptz,
  fim_novo timestamptz,
  solicitado_por uuid references public.profiles (id) on delete set null,
  motivo_recusa text,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  unique (viagem_id, idempotency_key)
);

create index if not exists idx_trip_extensions_viagem on public.trip_extensions (viagem_id, created_at desc);

alter table public.trip_extensions enable row level security;

drop policy if exists trip_extensions_select on public.trip_extensions;
create policy trip_extensions_select on public.trip_extensions
  for select to authenticated
  using (
    public.eh_admin()
    or exists (
      select 1 from public.trips t
      where t.id = viagem_id
        and (
          t.cliente_id = auth.uid()
          or t.empresa_id = public.minha_empresa_id()
          or t.motorista_id = public.meu_motorista_id()
        )
    )
  );

drop policy if exists trip_extensions_insert_cliente on public.trip_extensions;
create policy trip_extensions_insert_cliente on public.trip_extensions
  for insert to authenticated
  with check (
    exists (
      select 1 from public.trips t
      where t.id = viagem_id
        and t.cliente_id = auth.uid()
        and t.modalidade = 'hourly'
    )
  );

drop policy if exists trip_extensions_update on public.trip_extensions;
create policy trip_extensions_update on public.trip_extensions
  for update to authenticated
  using (
    public.eh_admin()
    or exists (
      select 1 from public.trips t
      where t.id = viagem_id and t.cliente_id = auth.uid()
    )
  );

-- 4) Avisos de encerramento (dedupe confiável)
create table if not exists public.trip_hourly_alerts (
  id uuid primary key default gen_random_uuid(),
  viagem_id uuid not null references public.trips (id) on delete cascade,
  minutos_restantes integer not null check (minutos_restantes in (20, 15, 10, 5)),
  fim_agendado_ref timestamptz not null,
  created_at timestamptz not null default now(),
  unique (viagem_id, minutos_restantes, fim_agendado_ref)
);

alter table public.trip_hourly_alerts enable row level security;

drop policy if exists trip_hourly_alerts_select on public.trip_hourly_alerts;
create policy trip_hourly_alerts_select on public.trip_hourly_alerts
  for select to authenticated
  using (
    public.eh_admin()
    or exists (
      select 1 from public.trips t
      where t.id = viagem_id
        and (
          t.cliente_id = auth.uid()
          or t.empresa_id = public.minha_empresa_id()
          or t.motorista_id = public.meu_motorista_id()
        )
    )
  );

-- 5) Confirma extensão só após pagamento (transacional + conflito de agenda)
create or replace function public.confirmar_extensao_hourly(
  p_extensao_id uuid,
  p_payment_id uuid default null
)
returns public.trip_extensions
language plpgsql
security definer
set search_path = public
as $$
declare
  ext public.trip_extensions;
  t public.trips;
  novo_fim timestamptz;
  conflito boolean;
begin
  select * into ext from public.trip_extensions where id = p_extensao_id for update;
  if not found then
    raise exception 'Extensão não encontrada';
  end if;
  if ext.status = 'pago' then
    return ext;
  end if;
  if ext.status is distinct from 'pendente' then
    raise exception 'Extensão não está pendente';
  end if;

  select * into t from public.trips where id = ext.viagem_id for update;
  if not found or t.modalidade is distinct from 'hourly' then
    raise exception 'Viagem hourly inválida';
  end if;
  if t.status in ('viagem_finalizada', 'cancelada', 'expired') then
    raise exception 'Viagem não permite extensão';
  end if;

  novo_fim := coalesce(t.fim_agendado, now()) + make_interval(mins => ext.minutos);

  select exists (
    select 1
    from public.trips outras
    where outras.motorista_id is not null
      and outras.motorista_id = t.motorista_id
      and outras.id <> t.id
      and outras.status not in ('cancelada', 'expired', 'viagem_finalizada')
      and outras.inicio_agendado is not null
      and outras.inicio_agendado < novo_fim
      and coalesce(outras.fim_agendado, outras.inicio_agendado) > coalesce(t.fim_agendado, now())
  ) into conflito;

  if conflito then
    update public.trip_extensions
    set status = 'cancelado', motivo_recusa = 'conflito_agenda_motorista'
    where id = ext.id;
    raise exception 'Motorista indisponível para a extensão';
  end if;

  update public.trips
  set
    duracao_contratada_minutos = coalesce(duracao_contratada_minutos, 0) + ext.minutos,
    fim_agendado = novo_fim,
    preco_total = preco_total + ext.preco_adicional,
    valor_plataforma = valor_plataforma + ext.valor_plataforma,
    valor_empresa = valor_empresa + ext.valor_empresa,
    updated_at = now(),
    version = version + 1
  where id = t.id;

  update public.trip_extensions
  set
    status = 'pago',
    payment_id = coalesce(p_payment_id, payment_id),
    fim_anterior = t.fim_agendado,
    fim_novo = novo_fim,
    confirmed_at = now()
  where id = ext.id
  returning * into ext;

  return ext;
end;
$$;

revoke all on function public.confirmar_extensao_hourly(uuid, uuid) from public;
grant execute on function public.confirmar_extensao_hourly(uuid, uuid) to authenticated;

-- 6) Realtime
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'trip_extensions'
  ) then
    alter publication supabase_realtime add table public.trip_extensions;
  end if;
end $$;
