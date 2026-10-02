-- Jemani features locais: coords, payment_status, distribuição, auditoria, finalização dupla
-- Aditiva — sem DROP de tabelas existentes

-- Novos valores de status (operacional)
alter type public.status_viagem add value if not exists 'pending_payment';
alter type public.status_viagem add value if not exists 'paid';
alter type public.status_viagem add value if not exists 'expired';

alter type public.status_pagamento add value if not exists 'pending_payment';

-- Empresas: localização base para proximidade
alter table public.companies
  add column if not exists endereco_base text,
  add column if not exists latitude numeric(10,7),
  add column if not exists longitude numeric(10,7);

-- Viagens: endereços estruturados + pagamento
alter table public.trips
  add column if not exists origem_lat numeric(10,7),
  add column if not exists origem_lng numeric(10,7),
  add column if not exists destino_lat numeric(10,7),
  add column if not exists destino_lng numeric(10,7),
  add column if not exists origem_place_id text,
  add column if not exists destino_place_id text,
  add column if not exists payment_status text not null default 'pending_payment',
  add column if not exists finalizado_por uuid references public.profiles (id),
  add column if not exists finalizado_em timestamptz;

alter table public.trip_assignments
  add column if not exists distancia_km numeric(10,2),
  add column if not exists motivo text;

create table if not exists public.distribution_attempts (
  id uuid primary key default gen_random_uuid(),
  viagem_id uuid not null references public.trips (id) on delete cascade,
  empresa_id uuid not null references public.companies (id),
  distancia_km numeric(10,2) not null default -1,
  resultado text not null,
  motivo text,
  created_at timestamptz not null default now()
);

create index if not exists idx_distribution_viagem on public.distribution_attempts (viagem_id);
create index if not exists idx_distribution_empresa on public.distribution_attempts (empresa_id);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  acao text not null,
  usuario_id uuid references public.profiles (id),
  entidade_tipo text,
  entidade_id uuid,
  metadados jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_usuario on public.audit_logs (usuario_id);
create index if not exists idx_audit_acao on public.audit_logs (acao);

-- Validação de antecedência mínima (4 horas) no timezone America/Los_Angeles
create or replace function public.validar_antecedencia_4h(
  p_data date,
  p_horario time,
  p_timezone text default 'America/Los_Angeles'
)
returns boolean
language plpgsql
stable
as $$
declare
  v_agora timestamptz := now();
  v_partida timestamptz;
begin
  v_partida := (p_data::text || ' ' || p_horario::text)::timestamp
    at time zone p_timezone;
  return v_partida >= v_agora + interval '4 hours';
end;
$$;

-- Finalização com checagem dupla (backend)
create or replace function public.finalizar_viagem(
  p_viagem_id uuid,
  p_confirmado boolean
)
returns public.trips
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip public.trips;
begin
  if not coalesce(p_confirmado, false) then
    raise exception 'É necessária a segunda confirmação para finalizar';
  end if;

  select * into v_trip from public.trips where id = p_viagem_id for update;
  if v_trip.id is null then
    raise exception 'Viagem não encontrada';
  end if;
  if v_trip.status = 'cancelada' then
    raise exception 'Corrida cancelada';
  end if;
  if v_trip.status = 'viagem_finalizada' then
    raise exception 'Corrida já concluída';
  end if;
  if v_trip.status is distinct from 'viagem_em_andamento' then
    raise exception 'Só é possível finalizar corrida em andamento';
  end if;

  if not (
    public.eh_admin()
    or v_trip.empresa_id = public.minha_empresa_id()
    or v_trip.motorista_id = public.meu_motorista_id()
  ) then
    raise exception 'Não autorizado';
  end if;

  update public.trips
  set
    status = 'viagem_finalizada',
    finalizado_por = auth.uid(),
    finalizado_em = now(),
    version = version + 1,
    updated_at = now()
  where id = p_viagem_id
  returning * into v_trip;

  insert into public.trip_status_history (viagem_id, status_anterior, status_novo, usuario_id, observacao)
  values (p_viagem_id, 'viagem_em_andamento', 'viagem_finalizada', auth.uid(), 'checagem_dupla');

  insert into public.audit_logs (acao, usuario_id, entidade_tipo, entidade_id, metadados)
  values (
    'viagem_finalizada',
    auth.uid(),
    'viagem',
    p_viagem_id,
    jsonb_build_object('confirmacao_dupla', true, 'empresa_id', v_trip.empresa_id)
  );

  return v_trip;
end;
$$;

alter table public.distribution_attempts enable row level security;
alter table public.audit_logs enable row level security;

create policy distribution_select on public.distribution_attempts for select using (
  public.eh_admin()
  or empresa_id = public.minha_empresa_id()
  or exists (
    select 1 from public.trips t
    where t.id = viagem_id and t.cliente_id = auth.uid()
  )
);

create policy distribution_insert on public.distribution_attempts for insert with check (
  public.eh_admin() or empresa_id = public.minha_empresa_id() or auth.uid() is not null
);

create policy audit_admin_select on public.audit_logs for select using (public.eh_admin());
create policy audit_insert_auth on public.audit_logs for insert with check (
  auth.uid() is not null and (usuario_id is null or usuario_id = auth.uid() or public.eh_admin())
);
