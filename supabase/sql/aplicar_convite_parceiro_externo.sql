-- Cole no SQL Editor do projeto Jemani (qdiocaeoevxhdsrtcahn) e execute uma vez.
-- Cria status parceiro_externo, tabela de convites, RPCs e notificação no aceite.

create extension if not exists pgcrypto with schema extensions;

alter type public.status_viagem add value if not exists 'parceiro_externo';

create table if not exists public.trip_offer_invites (
  id uuid primary key default gen_random_uuid(),
  viagem_id uuid not null references public.trips (id) on delete cascade,
  empresa_id uuid not null references public.companies (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_trip_offer_invites_viagem on public.trip_offer_invites (viagem_id);
create index if not exists idx_trip_offer_invites_hash on public.trip_offer_invites (token_hash);

alter table public.trip_offer_invites enable row level security;

drop policy if exists trip_offer_invites_admin on public.trip_offer_invites;
create policy trip_offer_invites_admin on public.trip_offer_invites
  for all to authenticated
  using (public.eh_admin())
  with check (public.eh_admin());

create or replace function public.hash_token_convite(p_token text)
returns text
language sql
immutable
set search_path = public, extensions
as $$
  select encode(
    extensions.digest(convert_to(trim(p_token), 'UTF8'), 'sha256'::text),
    'hex'
  );
$$;

create or replace function public.consultar_convite_oferta(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
  v_inv public.trip_offer_invites%rowtype;
  v_trip public.trips%rowtype;
  v_empresa public.companies%rowtype;
  v_situacao text;
begin
  if p_token is null or length(trim(p_token)) < 16 then
    return jsonb_build_object('ok', false, 'erro', 'link_invalido');
  end if;

  v_hash := public.hash_token_convite(p_token);

  select * into v_inv
  from public.trip_offer_invites
  where token_hash = v_hash
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'erro', 'nao_encontrado');
  end if;

  select * into v_trip from public.trips where id = v_inv.viagem_id;
  select * into v_empresa from public.companies where id = v_inv.empresa_id;

  if v_inv.accepted_at is not null or v_trip.status = 'parceiro_externo' then
    v_situacao := 'aceita';
  elsif v_inv.revoked_at is not null then
    v_situacao := 'revogada';
  elsif v_inv.expires_at < now() then
    v_situacao := 'expirada';
  elsif v_trip.status in ('cancelada', 'expired', 'viagem_finalizada') then
    v_situacao := 'indisponivel';
  elsif v_trip.empresa_id is not null and v_trip.empresa_id <> v_inv.empresa_id then
    v_situacao := 'indisponivel';
  elsif v_trip.status not in ('aguardando_empresa', 'oferta_enviada', 'paid') then
    v_situacao := 'indisponivel';
  else
    v_situacao := 'aberta';
  end if;

  return jsonb_build_object(
    'ok', true,
    'situacao', v_situacao,
    'convite_id', v_inv.id,
    'viagem_id', v_trip.id,
    'expires_at', v_inv.expires_at,
    'accepted_at', v_inv.accepted_at,
    'empresa_nome', coalesce(v_empresa.nome_comercial, ''),
    'codigo', v_trip.codigo,
    'origem', v_trip.origem,
    'destino', v_trip.destino,
    'data_viagem', v_trip.data_viagem,
    'horario', to_char(v_trip.horario, 'HH24:MI'),
    'valor_empresa', v_trip.valor_empresa,
    'passageiros', v_trip.passageiros
  );
end;
$$;

create or replace function public.aceitar_convite_oferta(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
  v_inv public.trip_offer_invites%rowtype;
  v_trip public.trips%rowtype;
  v_empresa public.companies%rowtype;
  v_agora timestamptz := now();
  v_titulo text;
  v_mensagem text;
begin
  if p_token is null or length(trim(p_token)) < 16 then
    return jsonb_build_object('ok', false, 'erro', 'link_invalido');
  end if;

  v_hash := public.hash_token_convite(p_token);

  select * into v_inv
  from public.trip_offer_invites
  where token_hash = v_hash
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'erro', 'nao_encontrado');
  end if;

  select * into v_trip from public.trips where id = v_inv.viagem_id for update;
  select * into v_empresa from public.companies where id = v_inv.empresa_id;

  if v_inv.accepted_at is not null or v_trip.status = 'parceiro_externo' then
    return jsonb_build_object(
      'ok', true,
      'situacao', 'aceita',
      'accepted_at', coalesce(v_inv.accepted_at, v_trip.updated_at),
      'viagem_id', v_trip.id,
      'codigo', v_trip.codigo,
      'empresa_nome', coalesce(v_empresa.nome_comercial, ''),
      'origem', v_trip.origem,
      'destino', v_trip.destino,
      'data_viagem', v_trip.data_viagem,
      'horario', to_char(v_trip.horario, 'HH24:MI'),
      'valor_empresa', v_trip.valor_empresa,
      'passageiros', v_trip.passageiros
    );
  end if;

  if v_inv.revoked_at is not null then
    return jsonb_build_object('ok', false, 'erro', 'revogada');
  end if;

  if v_inv.expires_at < v_agora then
    return jsonb_build_object('ok', false, 'erro', 'expirada');
  end if;

  if v_trip.status in ('cancelada', 'expired', 'viagem_finalizada') then
    return jsonb_build_object('ok', false, 'erro', 'indisponivel');
  end if;

  if v_trip.empresa_id is not null and v_trip.empresa_id <> v_inv.empresa_id then
    return jsonb_build_object('ok', false, 'erro', 'ja_aceita');
  end if;

  if v_trip.status not in ('aguardando_empresa', 'oferta_enviada', 'paid') then
    return jsonb_build_object('ok', false, 'erro', 'indisponivel');
  end if;

  update public.trip_offer_invites
  set accepted_at = v_agora
  where id = v_inv.id;

  update public.trip_offer_invites
  set revoked_at = coalesce(revoked_at, v_agora)
  where viagem_id = v_inv.viagem_id
    and id <> v_inv.id
    and accepted_at is null
    and revoked_at is null;

  update public.trips
  set
    empresa_id = v_inv.empresa_id,
    status = 'parceiro_externo',
    version = version + 1,
    updated_at = v_agora
  where id = v_inv.viagem_id;

  update public.trip_assignments
  set status = 'aceita', respondido_em = v_agora
  where viagem_id = v_inv.viagem_id and empresa_id = v_inv.empresa_id;

  update public.trip_assignments
  set status = 'expirada', respondido_em = v_agora
  where viagem_id = v_inv.viagem_id
    and empresa_id <> v_inv.empresa_id
    and status = 'oferecida';

  insert into public.trip_status_history (viagem_id, status_anterior, status_novo, observacao)
  values (v_inv.viagem_id, v_trip.status, 'parceiro_externo', 'aceite_convite_email');

  v_titulo := 'Parceiro externo aceitou';
  v_mensagem := format(
    '%s reservou a corrida %s · %s → %s',
    coalesce(nullif(v_empresa.nome_comercial, ''), 'Empresa'),
    v_trip.codigo,
    v_trip.origem,
    v_trip.destino
  );

  insert into public.notifications (usuario_id, titulo, mensagem, tipo, lida, referencia_id, created_at)
  select
    p.id,
    v_titulo,
    v_mensagem,
    'nova_solicitacao',
    false,
    v_inv.viagem_id::text,
    v_agora
  from public.profiles p
  where p.tipo = 'admin' and p.ativo = true;

  if v_trip.cliente_id is not null then
    insert into public.notifications (usuario_id, titulo, mensagem, tipo, lida, referencia_id, created_at)
    values (
      v_trip.cliente_id,
      'Parceiro confirmado',
      format('A empresa %s reservou sua corrida %s.', coalesce(v_empresa.nome_comercial, ''), v_trip.codigo),
      'status',
      false,
      v_inv.viagem_id::text,
      v_agora
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'situacao', 'aceita',
    'accepted_at', v_agora,
    'viagem_id', v_trip.id,
    'codigo', v_trip.codigo,
    'empresa_nome', coalesce(v_empresa.nome_comercial, ''),
    'origem', v_trip.origem,
    'destino', v_trip.destino,
    'data_viagem', v_trip.data_viagem,
    'horario', to_char(v_trip.horario, 'HH24:MI'),
    'valor_empresa', v_trip.valor_empresa,
    'passageiros', v_trip.passageiros
  );
end;
$$;

revoke all on function public.hash_token_convite(text) from public;
revoke all on function public.consultar_convite_oferta(text) from public;
revoke all on function public.aceitar_convite_oferta(text) from public;
grant execute on function public.consultar_convite_oferta(text) to anon, authenticated;
grant execute on function public.aceitar_convite_oferta(text) to anon, authenticated;
