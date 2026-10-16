-- A empresa aceita a corrida e o kanban precisa gravar o novo status.
-- Sem USING (true). A empresa só mexe na própria oferta, ou nas ofertas
-- que já existem depois que a viagem ficou com ela.

drop policy if exists trips_aceite_empresa on public.trips;
create policy trips_aceite_empresa on public.trips
  for update to authenticated
  using (
    public.meu_tipo() = 'empresa'::public.tipo_usuario
    and empresa_id is null
    and payment_status = 'paid'
    and status in (
      'aguardando_empresa'::public.status_viagem,
      'oferta_enviada'::public.status_viagem,
      'paid'::public.status_viagem
    )
  )
  with check (
    empresa_id = public.minha_empresa_id()
    and status = 'empresa_confirmada'::public.status_viagem
    and cliente_id is not distinct from (
      select v.cliente_id from public.viagem_campos_identidade(id) v
    )
    and motorista_id is not distinct from (
      select v.motorista_id from public.viagem_campos_identidade(id) v
    )
  );

create or replace function public.pode_atualizar_oferta(p_viagem_id uuid, p_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.eh_admin()
    or public.pode_gravar_oferta(p_viagem_id, p_empresa_id)
    or (
      p_empresa_id = public.minha_empresa_id()
      and exists (
        select 1
        from public.trips t
        where t.id = p_viagem_id
          and t.payment_status = 'paid'
          and t.empresa_id is null
          and t.status in ('aguardando_empresa', 'oferta_enviada', 'paid')
      )
    )
    or (
      public.minha_empresa_id() is not null
      and exists (
        select 1
        from public.trips t
        where t.id = p_viagem_id
          and t.empresa_id = public.minha_empresa_id()
      )
      and exists (
        select 1
        from public.trip_assignments a
        where a.viagem_id = p_viagem_id
          and a.empresa_id = p_empresa_id
      )
    );
$$;

revoke all on function public.pode_atualizar_oferta(uuid, uuid) from public, anon;
grant execute on function public.pode_atualizar_oferta(uuid, uuid) to authenticated;

create or replace function public.expirar_ofertas_perdedoras()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.empresa_id is not null
     and old.empresa_id is distinct from new.empresa_id
     and new.status = 'empresa_confirmada' then
    update public.trip_assignments
      set status = 'aceita', respondido_em = coalesce(respondido_em, now())
      where viagem_id = new.id
        and empresa_id = new.empresa_id
        and status = 'oferecida';

    update public.trip_assignments
      set status = 'expirada', respondido_em = now()
      where viagem_id = new.id
        and empresa_id is distinct from new.empresa_id
        and status = 'oferecida';
  end if;
  return new;
end;
$$;

revoke all on function public.expirar_ofertas_perdedoras() from public, anon;
grant execute on function public.expirar_ofertas_perdedoras() to authenticated;

drop trigger if exists trg_expirar_ofertas_perdedoras on public.trips;
create trigger trg_expirar_ofertas_perdedoras
  after update of empresa_id, status on public.trips
  for each row
  execute function public.expirar_ofertas_perdedoras();
