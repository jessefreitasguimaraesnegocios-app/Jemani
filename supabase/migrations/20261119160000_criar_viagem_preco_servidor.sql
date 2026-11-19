-- Reserva: preço calculado no servidor (RPC criar_viagem + trigger anti-fraude).

create or replace function public.horario_eh_noturno(
  p_horario text,
  p_inicio text,
  p_fim text
)
returns boolean
language plpgsql
immutable
set search_path = public
as $$
declare
  v_min int;
  v_ini int;
  v_fim int;
begin
  v_min := (split_part(coalesce(p_horario, '00:00'), ':', 1)::int * 60)
    + split_part(coalesce(p_horario, '00:00'), ':', 2)::int;
  v_ini := (split_part(coalesce(p_inicio, '22:00'), ':', 1)::int * 60)
    + split_part(coalesce(p_inicio, '22:00'), ':', 2)::int;
  v_fim := (split_part(coalesce(p_fim, '06:00'), ':', 1)::int * 60)
    + split_part(coalesce(p_fim, '06:00'), ':', 2)::int;
  if v_ini > v_fim then
    return v_min >= v_ini or v_min < v_fim;
  end if;
  return v_min >= v_ini and v_min < v_fim;
end;
$$;

create or replace function public.distancia_km_haversine(
  p_lat1 double precision,
  p_lng1 double precision,
  p_lat2 double precision,
  p_lng2 double precision
)
returns numeric
language sql
immutable
set search_path = public
as $$
  select round(
    (
      6371 * acos(
        least(
          1::double precision,
          greatest(
            -1::double precision,
            cos(radians(p_lat1)) * cos(radians(p_lat2))
              * cos(radians(p_lng2) - radians(p_lng1))
              + sin(radians(p_lat1)) * sin(radians(p_lat2))
          )
        )
      )
    )::numeric,
    2
  );
$$;

create or replace function public.calcular_preco_reserva_servidor(
  p_categoria_id uuid,
  p_modalidade text,
  p_horario text,
  p_origem_lat double precision default null,
  p_origem_lng double precision default null,
  p_destino_lat double precision default null,
  p_destino_lng double precision default null,
  p_duracao_minutos integer default null
)
returns table (
  preco_base numeric,
  taxas numeric,
  preco_total numeric,
  comissao_percentual numeric,
  valor_plataforma numeric,
  valor_empresa numeric,
  distancia_km numeric,
  franquia_milhas numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_cat public.vehicle_categories;
  v_regra public.price_rules;
  v_taxa numeric := 0;
  v_comissao numeric := 10;
  v_distancia numeric;
  v_preco_distancia numeric := 0;
  v_adicional_horario numeric := 0;
  v_adicional_categoria numeric := 0;
  v_subtotal numeric;
  v_total numeric;
  v_plataforma numeric;
  v_empresa numeric;
  v_horas numeric;
  v_franquia numeric := null;
  v_preco_horas numeric;
  v_min int;
  v_max int;
begin
  if p_modalidade is distinct from 'one_way' and p_modalidade is distinct from 'hourly' then
    raise exception 'Modalidade inválida';
  end if;

  select * into v_cat from public.vehicle_categories where id = p_categoria_id;
  if not found then
    raise exception 'Categoria não encontrada';
  end if;

  select * into v_regra
  from public.price_rules
  where ativo
  order by updated_at desc nulls last, created_at desc nulls last
  limit 1;
  if not found then
    raise exception 'Regra de preço indisponível';
  end if;

  select nullif(valor, '')::numeric into v_taxa
  from public.platform_settings where chave = 'taxa_servico';
  v_taxa := coalesce(v_taxa, 0);

  select nullif(valor, '')::numeric into v_comissao
  from public.platform_settings where chave = 'comissao_percentual';
  v_comissao := coalesce(v_comissao, 10);

  v_adicional_categoria := coalesce(v_cat.adicional_preco, 0);
  if public.horario_eh_noturno(
    p_horario,
    v_regra.horario_noturno_inicio::text,
    v_regra.horario_noturno_fim::text
  ) then
    v_adicional_horario := coalesce(v_regra.adicional_horario_noturno, 0);
  end if;

  if p_modalidade = 'hourly' then
    if coalesce(v_regra.preco_por_hora, 0) <= 0 then
      raise exception 'Hourly Chauffeur sem preço por hora configurado';
    end if;
    v_min := coalesce(v_regra.duracao_minima_minutos, 120);
    v_max := coalesce(v_regra.duracao_maxima_minutos, 720);
    if p_duracao_minutos is null then
      raise exception 'Duração contratada obrigatória no hourly';
    end if;
    if p_duracao_minutos < v_min or p_duracao_minutos > v_max then
      raise exception 'Duração hourly fora do intervalo permitido';
    end if;
    v_horas := p_duracao_minutos::numeric / 60;
    v_preco_horas := round((v_horas * v_regra.preco_por_hora)::numeric, 2);
    v_franquia := round((v_horas * coalesce(v_regra.franquia_milhas_por_hora, 0))::numeric, 2);
    v_distancia := round((v_franquia * 1.60934)::numeric, 2);
    v_subtotal := v_preco_horas + v_adicional_horario + v_adicional_categoria + v_taxa;
    if v_subtotal < v_regra.preco_minimo then
      v_subtotal := v_regra.preco_minimo;
    end if;
    v_total := round(v_subtotal::numeric, 2);
    v_plataforma := round(((v_total * v_comissao) / 100)::numeric, 2);
    v_empresa := round((v_total - v_plataforma)::numeric, 2);
    return query select
      v_preco_horas,
      v_taxa,
      v_total,
      v_comissao,
      v_plataforma,
      v_empresa,
      v_distancia,
      v_franquia;
    return;
  end if;

  if p_origem_lat is not null and p_origem_lng is not null
     and p_destino_lat is not null and p_destino_lng is not null then
    v_distancia := public.distancia_km_haversine(
      p_origem_lat, p_origem_lng, p_destino_lat, p_destino_lng
    );
  else
    v_distancia := coalesce(v_regra.distancia_padrao_km, 0);
  end if;

  v_preco_distancia := v_distancia * coalesce(v_regra.preco_por_km, 0);
  v_subtotal := coalesce(v_regra.preco_base, 0)
    + v_preco_distancia
    + v_adicional_horario
    + v_adicional_categoria
    + v_taxa;
  if v_subtotal < v_regra.preco_minimo then
    v_subtotal := v_regra.preco_minimo;
  end if;
  v_total := round(v_subtotal::numeric, 2);
  v_plataforma := round(((v_total * v_comissao) / 100)::numeric, 2);
  v_empresa := round((v_total - v_plataforma)::numeric, 2);

  return query select
    coalesce(v_regra.preco_base, 0),
    v_taxa,
    v_total,
    v_comissao,
    v_plataforma,
    v_empresa,
    v_distancia,
    null::numeric;
end;
$$;

revoke all on function public.calcular_preco_reserva_servidor(
  uuid, text, text, double precision, double precision, double precision, double precision, integer
) from public, anon;
grant execute on function public.calcular_preco_reserva_servidor(
  uuid, text, text, double precision, double precision, double precision, double precision, integer
) to authenticated, service_role;

create or replace function public.proteger_preco_viagem()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_calc record;
begin
  if auth.uid() is null or public.eh_admin() then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and old.payment_status is distinct from 'pending_payment' then
    new.preco_base := old.preco_base;
    new.taxas := old.taxas;
    new.preco_total := old.preco_total;
    new.comissao_percentual := old.comissao_percentual;
    new.valor_plataforma := old.valor_plataforma;
    new.valor_empresa := old.valor_empresa;
    new.distancia_km := old.distancia_km;
    new.franquia_milhas := old.franquia_milhas;
    return new;
  end if;

  if tg_op = 'UPDATE'
     and new.payment_status is not distinct from 'pending_payment'
     and new.preco_total is not distinct from old.preco_total
     and new.preco_base is not distinct from old.preco_base
     and new.taxas is not distinct from old.taxas
     and new.valor_plataforma is not distinct from old.valor_plataforma
     and new.valor_empresa is not distinct from old.valor_empresa
     and new.comissao_percentual is not distinct from old.comissao_percentual
     and new.distancia_km is not distinct from old.distancia_km
     and new.franquia_milhas is not distinct from old.franquia_milhas
     and new.categoria_id is not distinct from old.categoria_id
     and new.modalidade is not distinct from old.modalidade
     and new.horario is not distinct from old.horario
     and new.duracao_contratada_minutos is not distinct from old.duracao_contratada_minutos
     and new.origem_lat is not distinct from old.origem_lat
     and new.origem_lng is not distinct from old.origem_lng
     and new.destino_lat is not distinct from old.destino_lat
     and new.destino_lng is not distinct from old.destino_lng then
    return new;
  end if;

  select * into v_calc
  from public.calcular_preco_reserva_servidor(
    new.categoria_id,
    coalesce(new.modalidade, 'one_way'),
    to_char(new.horario, 'HH24:MI'),
    new.origem_lat,
    new.origem_lng,
    new.destino_lat,
    new.destino_lng,
    new.duracao_contratada_minutos
  );

  new.preco_base := v_calc.preco_base;
  new.taxas := v_calc.taxas;
  new.preco_total := v_calc.preco_total;
  new.comissao_percentual := v_calc.comissao_percentual;
  new.valor_plataforma := v_calc.valor_plataforma;
  new.valor_empresa := v_calc.valor_empresa;
  new.distancia_km := v_calc.distancia_km;
  new.franquia_milhas := v_calc.franquia_milhas;
  return new;
end;
$$;

drop trigger if exists trg_proteger_preco_viagem on public.trips;
create trigger trg_proteger_preco_viagem
  before insert or update on public.trips
  for each row
  execute function public.proteger_preco_viagem();

create or replace function public.criar_viagem(
  p_categoria_id uuid,
  p_modalidade text,
  p_origem text,
  p_destino text,
  p_data_viagem date,
  p_horario time,
  p_passageiros integer,
  p_origem_lat double precision default null,
  p_origem_lng double precision default null,
  p_destino_lat double precision default null,
  p_destino_lng double precision default null,
  p_origem_place_id text default null,
  p_destino_place_id text default null,
  p_duracao_minutos integer default null,
  p_malas integer default null,
  p_numero_voo text default null,
  p_nome_passageiro text default null,
  p_observacoes text default null,
  p_id uuid default null
)
returns public.trips
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_calc record;
  v_id uuid := coalesce(p_id, gen_random_uuid());
  v_codigo text;
  v_agora timestamptz := now();
  v_inicio timestamptz;
  v_fim timestamptz;
  v_paradas int := 0;
  v_linha public.trips;
  v_modalidade text := coalesce(nullif(trim(p_modalidade), ''), 'one_way');
begin
  if uid is null then
    raise exception 'Não autenticado';
  end if;
  if p_origem is null or length(trim(p_origem)) = 0 then
    raise exception 'Origem obrigatória';
  end if;
  if p_destino is null or length(trim(p_destino)) = 0 then
    raise exception 'Destino obrigatório';
  end if;
  if p_passageiros is null or p_passageiros < 1 then
    raise exception 'Passageiros inválidos';
  end if;
  if p_origem_lat is not null and p_destino_lat is not null
     and p_origem_lat = p_destino_lat and p_origem_lng = p_destino_lng then
    raise exception 'Origem e destino precisam ser diferentes';
  end if;

  select * into v_calc
  from public.calcular_preco_reserva_servidor(
    p_categoria_id,
    v_modalidade,
    to_char(p_horario, 'HH24:MI'),
    p_origem_lat,
    p_origem_lng,
    p_destino_lat,
    p_destino_lng,
    p_duracao_minutos
  );

  loop
    v_codigo := 'JEM-' || (1000 + floor(random() * 9000)::int)::text;
    exit when not exists (select 1 from public.trips t where t.codigo = v_codigo);
  end loop;

  if v_modalidade = 'hourly' then
    v_inicio := (
      (p_data_viagem::text || ' ' || p_horario::text || ':00')::timestamp
      at time zone 'America/Los_Angeles'
    );
    v_fim := v_inicio + make_interval(mins => p_duracao_minutos);
    select coalesce(nullif(valor, '')::int, 5) into v_paradas
    from public.platform_settings where chave = 'hourly_paradas_por_bloco';
    v_paradas := coalesce(v_paradas, 5);
  end if;

  insert into public.trips (
    id,
    codigo,
    cliente_id,
    categoria_id,
    modalidade,
    origem,
    destino,
    origem_lat,
    origem_lng,
    destino_lat,
    destino_lng,
    origem_place_id,
    destino_place_id,
    data_viagem,
    horario,
    duracao_contratada_minutos,
    inicio_agendado,
    fim_agendado,
    franquia_milhas,
    paradas_liberadas,
    paradas,
    passageiros,
    malas,
    numero_voo,
    nome_passageiro,
    observacoes,
    distancia_km,
    preco_base,
    taxas,
    preco_total,
    comissao_percentual,
    valor_plataforma,
    valor_empresa,
    status,
    payment_status,
    version,
    created_at,
    updated_at
  ) values (
    v_id,
    v_codigo,
    uid,
    p_categoria_id,
    v_modalidade,
    trim(p_origem),
    trim(p_destino),
    p_origem_lat,
    p_origem_lng,
    p_destino_lat,
    p_destino_lng,
    p_origem_place_id,
    p_destino_place_id,
    p_data_viagem,
    p_horario,
    case when v_modalidade = 'hourly' then p_duracao_minutos else null end,
    v_inicio,
    v_fim,
    v_calc.franquia_milhas,
    coalesce(v_paradas, 0),
    '[]'::jsonb,
    p_passageiros,
    p_malas,
    nullif(trim(coalesce(p_numero_voo, '')), ''),
    nullif(trim(coalesce(p_nome_passageiro, '')), ''),
    nullif(trim(coalesce(p_observacoes, '')), ''),
    v_calc.distancia_km,
    v_calc.preco_base,
    v_calc.taxas,
    v_calc.preco_total,
    v_calc.comissao_percentual,
    v_calc.valor_plataforma,
    v_calc.valor_empresa,
    'pending_payment'::public.status_viagem,
    'pending_payment',
    1,
    v_agora,
    v_agora
  )
  returning * into v_linha;

  return v_linha;
end;
$$;

revoke all on function public.criar_viagem(
  uuid, text, text, text, date, time, integer,
  double precision, double precision, double precision, double precision,
  text, text, integer, integer, text, text, text, uuid
) from public, anon;
grant execute on function public.criar_viagem(
  uuid, text, text, text, date, time, integer,
  double precision, double precision, double precision, double precision,
  text, text, integer, integer, text, text, text, uuid
) to authenticated;

comment on function public.criar_viagem is
  'Cria reserva do cliente com preço calculado no servidor (não confia no valor do app).';
