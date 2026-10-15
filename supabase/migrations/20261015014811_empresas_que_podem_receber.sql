create or replace function public.empresas_que_podem_receber()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.id
  from public.companies c
  where c.status = 'ativa'
    and c.habilitada_receber = true;
$$;

revoke all on function public.empresas_que_podem_receber() from public;
grant execute on function public.empresas_que_podem_receber() to authenticated;
