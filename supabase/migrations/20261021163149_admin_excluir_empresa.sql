-- Admin remove empresa e o login do gestor (mesmo fluxo do excluir cliente).

create or replace function public.admin_excluir_empresa(p_empresa_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_empresa public.companies%rowtype;
  v_admin_id uuid := auth.uid();
  v_usuario_id uuid;
  v_resultado jsonb;
begin
  if v_admin_id is null or not public.eh_admin() then
    raise exception 'Somente admin pode excluir empresas';
  end if;

  if p_empresa_id is null then
    raise exception 'Empresa inválida';
  end if;

  select * into v_empresa from public.companies where id = p_empresa_id;
  if v_empresa.id is null then
    raise exception 'Empresa não encontrada';
  end if;

  v_usuario_id := v_empresa.usuario_id;

  if v_usuario_id is not null and v_usuario_id = v_admin_id then
    raise exception 'Você não pode excluir a própria conta';
  end if;

  insert into public.audit_logs (acao, usuario_id, entidade_tipo, entidade_id, metadados)
  values (
    'admin_excluir_empresa',
    v_admin_id,
    'companies',
    p_empresa_id,
    jsonb_build_object(
      'nome_comercial', v_empresa.nome_comercial,
      'email', v_empresa.email,
      'usuario_id', v_usuario_id
    )
  );

  perform public.admin_apagar_empresa(p_empresa_id);

  if v_usuario_id is not null and exists (
    select 1 from public.profiles where id = v_usuario_id
  ) then
    v_resultado := public.admin_excluir_usuario(v_usuario_id);
  else
    v_resultado := jsonb_build_object('ok', true, 'usuario_id', v_usuario_id);
  end if;

  return jsonb_build_object(
    'ok', true,
    'empresa_id', p_empresa_id,
    'nome_comercial', v_empresa.nome_comercial,
    'email', v_empresa.email,
    'usuario_id', v_usuario_id,
    'usuario', v_resultado
  );
end;
$$;

revoke all on function public.admin_excluir_empresa(uuid) from public, anon;
grant execute on function public.admin_excluir_empresa(uuid) to authenticated;

comment on function public.admin_excluir_empresa(uuid) is
  'Admin: remove empresa, frota/ofertas ligadas e o login do gestor.';
