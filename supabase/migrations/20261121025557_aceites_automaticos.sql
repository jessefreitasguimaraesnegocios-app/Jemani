create table public.company_auto_accept_settings (
  empresa_id uuid primary key references public.companies(id) on delete cascade,
  liberada boolean not null default false,
  ligada boolean not null default false,
  ativada_em timestamptz,
  valor_minimo_usd numeric(12, 2) not null default 0
    check (valor_minimo_usd between 0 and 9999999999.99),
  limite_diario integer check (limite_diario > 0),
  check (liberada or not ligada),
  check (ligada = (ativada_em is not null))
);

create table public.trip_auto_acceptances (
  id bigint generated always as identity primary key,
  viagem_id uuid unique references public.trips(id) on delete set null,
  empresa_id uuid not null references public.companies(id) on delete cascade,
  dia_operacional date not null,
  aceito_em timestamptz not null default now()
);
create index trip_auto_acceptances_empresa_dia
  on public.trip_auto_acceptances(empresa_id, dia_operacional);

alter table public.company_auto_accept_settings enable row level security;
alter table public.trip_auto_acceptances enable row level security;
revoke all on public.company_auto_accept_settings, public.trip_auto_acceptances
  from public, anon, authenticated;
grant select on public.company_auto_accept_settings to authenticated;
create policy leitura_regras_aceite_automatico on public.company_auto_accept_settings
  for select to authenticated using (
    exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.ativo)
    and ((select public.eh_admin()) or empresa_id = (select public.minha_empresa_id()))
  );

create function public.liberar_aceite_automatico(p_empresa_id uuid, p_liberada boolean)
returns public.company_auto_accept_settings
language plpgsql security definer set search_path = ''
as $$
declare
  regra public.company_auto_accept_settings;
begin
  if not exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.tipo = 'admin' and p.ativo
  ) then
    raise exception 'Apenas administradores podem liberar o aceite automático' using errcode = '42501';
  end if;

  insert into public.company_auto_accept_settings as config (empresa_id, liberada)
  values (p_empresa_id, p_liberada)
  on conflict (empresa_id) do update
    set liberada = excluded.liberada,
        ligada = config.ligada and excluded.liberada,
        ativada_em = case when excluded.liberada then config.ativada_em end
  returning * into regra;
  return regra;
end;
$$;

create function public.configurar_aceite_automatico(
  p_empresa_id uuid, p_ligada boolean, p_valor_minimo_usd numeric, p_limite_diario integer
)
returns public.company_auto_accept_settings
language plpgsql security definer set search_path = ''
as $$
declare
  regra public.company_auto_accept_settings;
begin
  if p_empresa_id is distinct from public.minha_empresa_id() or not exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.tipo = 'empresa' and p.ativo
  ) then
    raise exception 'Sem permissão para configurar esta empresa' using errcode = '42501';
  end if;

  update public.company_auto_accept_settings
     set ligada = p_ligada,
         ativada_em = case when p_ligada then coalesce(ativada_em, clock_timestamp()) end,
         valor_minimo_usd = p_valor_minimo_usd,
         limite_diario = p_limite_diario
   where empresa_id = p_empresa_id and liberada
   returning * into regra;
  if not found then
    raise exception 'Aceite automático não liberado pelo administrador' using errcode = '42501';
  end if;
  return regra;
end;
$$;

revoke all on function public.liberar_aceite_automatico(uuid, boolean),
  public.configurar_aceite_automatico(uuid, boolean, numeric, integer) from public, anon, authenticated;
grant execute on function public.liberar_aceite_automatico(uuid, boolean),
  public.configurar_aceite_automatico(uuid, boolean, numeric, integer) to authenticated;

create function public.processar_aceites_automaticos()
returns integer
language plpgsql set search_path = ''
as $$
declare
  agora timestamptz := now();
  hora_local timestamp := agora at time zone 'America/Los_Angeles';
  hoje date := hora_local::date;
  corrida public.trips;
  vencedora uuid;
  total integer := 0;
begin
  -- Serializa o processamento da cota diária. O lock da corrida também concorre com o aceite manual.
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
            where x.empresa_id = cfg.empresa_id and x.dia_operacional = hoje
          ))
      )
    order by t.data_viagem, t.horario, t.id
    limit 100
    for update of t skip locked
  loop
    -- Reavalia a cota e a configuração após cada aceite no lote.
    select a.empresa_id into vencedora
    from public.trip_assignments a
    join public.company_auto_accept_settings cfg on cfg.empresa_id = a.empresa_id
    join public.empresas_para_distribuicao(corrida.categoria_id) elegivel on elegivel.id = a.empresa_id
    where a.viagem_id = corrida.id and a.status = 'oferecida'
      and cfg.liberada and cfg.ligada and a.created_at >= cfg.ativada_em
      and corrida.valor_empresa >= cfg.valor_minimo_usd
      and (cfg.limite_diario is null or cfg.limite_diario > (
        select count(*) from public.trip_auto_acceptances x
        where x.empresa_id = cfg.empresa_id and x.dia_operacional = hoje
      ))
    order by a.distancia_km nulls last, a.created_at, a.empresa_id
    limit 1
    for update of a, cfg skip locked;

    if vencedora is null then continue; end if;

    insert into public.trip_auto_acceptances (viagem_id, empresa_id, dia_operacional)
    values (corrida.id, vencedora, hoje) on conflict (viagem_id) do nothing;
    if not found then continue; end if;

    -- O trigger existente confirma a oferta vencedora e expira as demais.
    update public.trips
       set empresa_id = vencedora, status = 'empresa_confirmada',
           version = version + 1, updated_at = agora
     where id = corrida.id;

    insert into public.trip_status_history (viagem_id, status_anterior, status_novo, observacao)
    values (corrida.id, corrida.status, 'empresa_confirmada', 'Aceite automático');

    insert into public.notifications (usuario_id, titulo, mensagem, tipo, referencia_id)
    select corrida.cliente_id, 'Empresa confirmada', 'A empresa aceitou sua viagem ' || corrida.codigo || '.',
           'status', corrida.id::text
    union all
    select c.usuario_id, 'Corrida aceita automaticamente', 'A viagem ' || corrida.codigo || ' está em Viagens.',
           'status', corrida.id::text
      from public.companies c where c.id = vencedora and c.usuario_id is not null;

    total := total + 1;
  end loop;
  return total;
end;
$$;

revoke all on function public.processar_aceites_automaticos() from public, anon, authenticated, service_role;

-- Uma distribuição em andamento pode tentar devolver a corrida já aceita à fila.
create function public.preservar_status_aceite_automatico()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null and old.empresa_id is not null
     and new.empresa_id = old.empresa_id
     and new.status in ('paid', 'aguardando_empresa', 'oferta_enviada')
     and old.status not in ('paid', 'aguardando_empresa', 'oferta_enviada')
     and exists (select 1 from public.trip_auto_acceptances a
                 where a.viagem_id = old.id and a.empresa_id = old.empresa_id) then
    new.status := old.status;
    new.version := greatest(new.version, old.version);
  end if;
  return new;
end;
$$;
revoke all on function public.preservar_status_aceite_automatico() from public, anon, authenticated, service_role;
create trigger trg_preservar_status_aceite_automatico
  before update of status on public.trips
  for each row execute function public.preservar_status_aceite_automatico();

alter publication supabase_realtime add table public.company_auto_accept_settings;

select cron.schedule('jemani-auto-accept', '10 seconds',
  'select public.processar_aceites_automaticos()');
