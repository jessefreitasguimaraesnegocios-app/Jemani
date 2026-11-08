-- Sync: shield em motoristas, notificações cross-user, referencia_id texto, Realtime

alter table public.drivers
  add column if not exists eh_categoria_shield boolean not null default false;

-- referencia_id recebe chaves compostas do app (não só UUID)
alter table public.notifications
  alter column referencia_id type text using referencia_id::text;

-- Notificações para outros papéis (empresa/motorista/admin) via função segura
create or replace function public.enviar_notificacao(
  p_usuario_id uuid,
  p_titulo text,
  p_mensagem text,
  p_tipo text,
  p_referencia_id text default null,
  p_id uuid default null
)
returns public.notifications
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  alvo public.profiles;
  linha public.notifications;
  permitido boolean := false;
begin
  if uid is null then
    raise exception 'Não autenticado';
  end if;
  if p_usuario_id is null or length(trim(coalesce(p_titulo, ''))) = 0 then
    raise exception 'Notificação inválida';
  end if;

  select * into alvo from public.profiles where id = p_usuario_id and ativo = true;
  if not found then
    raise exception 'Destinatário inválido';
  end if;

  if public.eh_admin() or p_usuario_id = uid or alvo.tipo = 'admin' then
    permitido := true;
  elsif exists (
    select 1
    from public.trips t
    left join public.drivers d on d.id = t.motorista_id
    left join public.companies c on c.id = t.empresa_id
    where
      (t.cliente_id = uid or t.empresa_id = public.minha_empresa_id() or t.motorista_id = public.meu_motorista_id()
        or c.usuario_id = uid or d.usuario_id = uid)
      and (
        t.cliente_id = p_usuario_id
        or c.usuario_id = p_usuario_id
        or d.usuario_id = p_usuario_id
        or exists (
          select 1 from public.profiles a
          where a.id = p_usuario_id and a.tipo = 'admin' and a.ativo
        )
      )
  ) then
    permitido := true;
  elsif public.minha_empresa_id() is not null and exists (
    select 1 from public.drivers d
    where d.empresa_id = public.minha_empresa_id()
      and (d.usuario_id = p_usuario_id or d.usuario_id = uid)
  ) then
    permitido := true;
  end if;

  if not permitido then
    raise exception 'Sem permissão para notificar este usuário';
  end if;

  insert into public.notifications (id, usuario_id, titulo, mensagem, tipo, lida, referencia_id, created_at)
  values (
    coalesce(p_id, gen_random_uuid()),
    p_usuario_id,
    trim(p_titulo),
    coalesce(p_mensagem, ''),
    coalesce(nullif(trim(p_tipo), ''), 'sistema'),
    false,
    nullif(trim(p_referencia_id), ''),
    now()
  )
  on conflict (id) do update set
    titulo = excluded.titulo,
    mensagem = excluded.mensagem,
    tipo = excluded.tipo,
    referencia_id = excluded.referencia_id
  returning * into linha;

  return linha;
end;
$$;

revoke all on function public.enviar_notificacao(uuid, text, text, text, text, uuid) from public;
grant execute on function public.enviar_notificacao(uuid, text, text, text, text, uuid) to authenticated;

-- Confirma extensão hourly com payment criado pelo sistema (edge) ou admin
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
    raise exception 'Confirme a extensão pelo fluxo de pagamento';
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
    franquia_milhas = coalesce(franquia_milhas, 0) + (ext.minutos::numeric / 60) * coalesce(
      (select franquia_milhas_por_hora from public.price_rules where ativo order by updated_at desc limit 1),
      0
    ),
    paradas_liberadas = coalesce(paradas_liberadas, 0) + coalesce(
      (
        select nullif(trim(valor), '')::int
        from public.platform_settings
        where chave = 'hourly_paradas_por_bloco'
        limit 1
      ),
      2
    ),
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

-- Realtime: notifications + reviews (trip_extensions já publicado)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'reviews'
  ) then
    alter publication supabase_realtime add table public.reviews;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'drivers'
  ) then
    alter publication supabase_realtime add table public.drivers;
  end if;
end $$;
