-- Oferta expirada não autoriza ler nem gravar o histórico da viagem.
-- Atualização do histórico não pode reescrever status, viagem ou autor.

create or replace function public.pode_registrar_viagem(p_viagem_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.eh_admin()
    or exists (
      select 1
      from public.trips t
      where t.id = p_viagem_id
        and (
          t.cliente_id = auth.uid()
          or t.empresa_id = public.minha_empresa_id()
          or t.motorista_id = public.meu_motorista_id()
        )
    )
    or exists (
      select 1
      from public.trip_assignments a
      where a.viagem_id = p_viagem_id
        and a.empresa_id = public.minha_empresa_id()
        and a.status in ('oferecida'::public.status_atribuicao, 'aceita'::public.status_atribuicao)
    );
$$;

create or replace function public.historico_inalterado(
  p_id uuid,
  p_viagem_id uuid,
  p_status_anterior public.status_viagem,
  p_status_novo public.status_viagem,
  p_usuario_id uuid,
  p_observacao text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trip_status_history h
    where h.id = p_id
      and h.viagem_id is not distinct from p_viagem_id
      and h.status_anterior is not distinct from p_status_anterior
      and h.status_novo is not distinct from p_status_novo
      and h.usuario_id is not distinct from p_usuario_id
      and h.observacao is not distinct from p_observacao
  );
$$;

revoke all on function public.historico_inalterado(uuid, uuid, public.status_viagem, public.status_viagem, uuid, text) from public, anon;
grant execute on function public.historico_inalterado(uuid, uuid, public.status_viagem, public.status_viagem, uuid, text) to authenticated;

drop policy if exists history_update on public.trip_status_history;
create policy history_update on public.trip_status_history
  for update to authenticated
  using (
    public.eh_admin()
    or (
      public.pode_registrar_viagem(viagem_id)
      and (usuario_id is null or usuario_id = (select auth.uid()))
    )
  )
  with check (
    public.eh_admin()
    or (
      public.pode_registrar_viagem(viagem_id)
      and (usuario_id is null or usuario_id = (select auth.uid()))
      and public.historico_inalterado(id, viagem_id, status_anterior, status_novo, usuario_id, observacao)
    )
  );
