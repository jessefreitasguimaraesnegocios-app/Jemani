-- Contagem diária de aceites automáticos (fuso Los Angeles), para o painel da empresa.

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
    and x.dia_operacional = hoje;

  return coalesce(total, 0);
end;
$$;

revoke all on function public.contar_aceites_automaticos_hoje(uuid)
  from public, anon, authenticated;
grant execute on function public.contar_aceites_automaticos_hoje(uuid) to authenticated;
