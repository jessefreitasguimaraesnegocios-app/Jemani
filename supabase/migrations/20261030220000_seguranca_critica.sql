-- =============================================================================
-- Segurança crítica Jemani: rate limit Edge, trava financeira em trips,
-- extensão hourly autenticada, stripe_account_id fora do SELECT autenticado.
-- =============================================================================

-- 1) Rate limit atômico para Edge Functions
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

-- 2) Cliente/empresa/motorista não marcam pagamento nem status paid
create or replace function public.proteger_pagamento_viagem()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- service role / jobs sem JWT
  if auth.uid() is null then
    return new;
  end if;
  if public.eh_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.payment_status is distinct from 'pending_payment' then
      new.payment_status := 'pending_payment';
    end if;
    if new.status = 'paid' then
      new.status := 'pending_payment';
    end if;
    return new;
  end if;

  if new.payment_status is distinct from old.payment_status then
    raise exception 'payment_status só pode ser alterado pelo sistema de pagamento';
  end if;

  if new.status is distinct from old.status and new.status = 'paid' then
    raise exception 'status paid só pode ser definido pelo sistema de pagamento';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_proteger_pagamento_viagem on public.trips;
create trigger trg_proteger_pagamento_viagem
  before insert or update on public.trips
  for each row
  execute function public.proteger_pagamento_viagem();

-- 3) Extensão hourly: só o cliente da viagem (ou admin) e não “paga” sem vínculo
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
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Não autenticado';
  end if;

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

  if not public.eh_admin() and t.cliente_id is distinct from uid then
    raise exception 'Sem permissão para confirmar esta extensão';
  end if;

  -- Se informar payment_id, precisa existir pagamento pago desta viagem
  if p_payment_id is not null then
    if not exists (
      select 1
      from public.payments p
      where p.id = p_payment_id
        and p.booking_id = t.id
        and p.status = 'pago'
    ) then
      raise exception 'Pagamento da extensão inválido';
    end if;
  elsif not public.eh_admin() then
    -- Cliente sem payment_id no banco: não confirma via RPC (use fluxo Stripe + store)
    raise exception 'Confirme a extensão pelo fluxo de pagamento Stripe';
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

-- 4) Empresas: cliente NÃO lê ficha completa (PII + stripe_account_id).
--    Frota na reserva usa vehicles_select (já filtra empresa ativa/habilitada).
drop policy if exists companies_select on public.companies;
create policy companies_select on public.companies
  for select to authenticated
  using (
    public.eh_admin()
    or usuario_id = (select auth.uid())
    or id = public.minha_empresa_id()
  );

-- Marketplace mínimo (sem PII sensível / sem Connect id)
create or replace function public.empresas_marketplace()
returns table (
  id uuid,
  nome_comercial text,
  cidade text,
  regioes_atendidas text[],
  categorias_ids uuid[],
  status public.status_empresa,
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
    c.status,
    c.habilitada_receber,
    c.avaliacao_media,
    c.latitude,
    c.longitude
  from public.companies c
  where c.status = 'ativa'
    and c.habilitada_receber = true;
$$;

revoke all on function public.empresas_marketplace() from public, anon;
grant execute on function public.empresas_marketplace() to authenticated;

-- 5) Cliente não marca extensão como paga via UPDATE direto
drop policy if exists trip_extensions_update on public.trip_extensions;
create policy trip_extensions_update on public.trip_extensions
  for update to authenticated
  using (public.eh_admin())
  with check (public.eh_admin());

-- 6) distribution_attempts: só admin (evita spam)
drop policy if exists distribution_insert on public.distribution_attempts;
create policy distribution_insert on public.distribution_attempts
  for insert to authenticated
  with check (public.eh_admin());
