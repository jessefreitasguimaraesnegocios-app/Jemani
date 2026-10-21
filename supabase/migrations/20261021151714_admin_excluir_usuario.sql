-- Admin remove usuário com dependências (trips, empresa, etc.) e auth.users.
-- O delete no Dashboard falha em trips_cliente_id_fkey; esta RPC limpa na ordem certa.

create or replace function public.admin_apagar_viagens(p_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_ids is null or cardinality(p_ids) = 0 then
    return;
  end if;

  delete from public.payments where booking_id = any(p_ids);
  delete from public.commissions where viagem_id = any(p_ids);
  delete from public.reviews where viagem_id = any(p_ids);
  delete from public.distribution_attempts where viagem_id = any(p_ids);
  delete from public.trip_assignments where viagem_id = any(p_ids);
  delete from public.trip_status_history where viagem_id = any(p_ids);
  delete from public.trips where id = any(p_ids);
end;
$$;

revoke all on function public.admin_apagar_viagens(uuid[]) from public, anon, authenticated;

create or replace function public.admin_apagar_empresa(p_empresa_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  ids_motorista uuid[];
begin
  if p_empresa_id is null then
    return;
  end if;

  select array_agg(id) into ids_motorista
  from public.drivers
  where empresa_id = p_empresa_id;

  update public.trips
  set
    empresa_id = null,
    motorista_id = null,
    veiculo_id = null
  where empresa_id = p_empresa_id;

  if ids_motorista is not null then
    update public.trips
    set motorista_id = null
    where motorista_id = any(ids_motorista);

    update public.reviews
    set motorista_id = null
    where motorista_id = any(ids_motorista);
  end if;

  delete from public.trip_assignments where empresa_id = p_empresa_id;
  delete from public.distribution_attempts where empresa_id = p_empresa_id;
  delete from public.commissions where empresa_id = p_empresa_id;
  delete from public.reviews where empresa_id = p_empresa_id;

  -- viagens que eram só da operação desta empresa e ainda sem cliente "órfão" útil:
  -- já desvinculamos; não apagamos trips de clientes só porque a empresa saiu.

  delete from public.companies where id = p_empresa_id;
end;
$$;

revoke all on function public.admin_apagar_empresa(uuid) from public, anon, authenticated;

create or replace function public.admin_excluir_usuario(p_usuario_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_alvo public.profiles%rowtype;
  v_admin_id uuid := auth.uid();
  ids_cliente uuid[];
  ids_motorista uuid[];
  id_empresa uuid;
  qtd_viagens int := 0;
begin
  if v_admin_id is null or not public.eh_admin() then
    raise exception 'Somente admin pode excluir usuários';
  end if;

  if p_usuario_id is null then
    raise exception 'Usuário inválido';
  end if;

  if p_usuario_id = v_admin_id then
    raise exception 'Você não pode excluir a própria conta';
  end if;

  select * into v_alvo from public.profiles where id = p_usuario_id;
  if v_alvo.id is null then
    raise exception 'Usuário não encontrado';
  end if;

  if v_alvo.tipo = 'admin' then
    raise exception 'Não é permitido excluir outro admin';
  end if;

  insert into public.audit_logs (acao, usuario_id, entidade_tipo, entidade_id, metadados)
  values (
    'admin_excluir_usuario',
    v_admin_id,
    'profiles',
    p_usuario_id,
    jsonb_build_object(
      'email', v_alvo.email,
      'nome', v_alvo.nome,
      'tipo', v_alvo.tipo
    )
  );

  update public.trips set finalizado_por = null where finalizado_por = p_usuario_id;
  update public.trips set cancelado_por = null where cancelado_por = p_usuario_id;
  update public.trip_status_history set usuario_id = null where usuario_id = p_usuario_id;
  update public.audit_logs set usuario_id = null where usuario_id = p_usuario_id and entidade_id is distinct from p_usuario_id;

  select array_agg(id) into ids_cliente
  from public.trips
  where cliente_id = p_usuario_id;

  if ids_cliente is not null then
    qtd_viagens := cardinality(ids_cliente);
    perform public.admin_apagar_viagens(ids_cliente);
  end if;

  delete from public.reviews where cliente_id = p_usuario_id;
  delete from public.notifications where usuario_id = p_usuario_id;
  delete from public.company_users where user_id = p_usuario_id;

  select array_agg(id) into ids_motorista
  from public.drivers
  where usuario_id = p_usuario_id;

  if ids_motorista is not null then
    update public.trips
    set motorista_id = null
    where motorista_id = any(ids_motorista);

    update public.reviews
    set motorista_id = null
    where motorista_id = any(ids_motorista);

    update public.drivers
    set usuario_id = null
    where id = any(ids_motorista);
  end if;

  for id_empresa in
    select id from public.companies where usuario_id = p_usuario_id
  loop
    perform public.admin_apagar_empresa(id_empresa);
  end loop;

  delete from auth.users where id = p_usuario_id;

  if exists (select 1 from public.profiles where id = p_usuario_id) then
    delete from public.profiles where id = p_usuario_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'usuario_id', p_usuario_id,
    'email', v_alvo.email,
    'tipo', v_alvo.tipo,
    'viagens_apagadas', qtd_viagens
  );
end;
$$;

revoke all on function public.admin_excluir_usuario(uuid) from public, anon;
grant execute on function public.admin_excluir_usuario(uuid) to authenticated;

comment on function public.admin_excluir_usuario(uuid) is
  'Admin: remove dependências e apaga auth.users + profile. Bloqueia autoexclusão e exclusão de admin.';
