create or replace function public.empresa_do_motorista()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select empresa_id from public.drivers where usuario_id = auth.uid() limit 1;
$$;

alter table public.trips
  add column if not exists finalizado_em timestamptz,
  add column if not exists finalizado_por uuid;

create table if not exists public.mensagens_empresa (
  id uuid primary key,
  empresa_id uuid not null references public.companies (id) on delete cascade,
  motorista_id uuid not null references public.drivers (id) on delete cascade,
  autor text not null check (autor in ('empresa', 'motorista')),
  texto text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.turnos_motorista (
  id uuid primary key,
  motorista_id uuid not null references public.drivers (id) on delete cascade,
  empresa_id uuid not null references public.companies (id) on delete cascade,
  veiculo_id uuid,
  inicio timestamptz not null,
  fim timestamptz,
  online boolean not null default true,
  latitude numeric(10, 7),
  longitude numeric(10, 7)
);

create table if not exists public.agendamentos_veiculo (
  id uuid primary key,
  veiculo_id uuid not null,
  empresa_id uuid not null references public.companies (id) on delete cascade,
  motorista_id uuid references public.drivers (id) on delete set null,
  tipo text not null check (tipo in ('mecanica', 'lava_jato')),
  data date not null,
  horario time not null,
  observacao text,
  created_at timestamptz not null default now()
);

create index if not exists idx_mensagens_empresa on public.mensagens_empresa (empresa_id, motorista_id, created_at);
create index if not exists idx_turnos_motorista on public.turnos_motorista (empresa_id, motorista_id);
create index if not exists idx_agendamentos_veiculo on public.agendamentos_veiculo (empresa_id, data);

alter table public.mensagens_empresa enable row level security;
alter table public.turnos_motorista enable row level security;
alter table public.agendamentos_veiculo enable row level security;

drop policy if exists mensagens_empresa_acesso on public.mensagens_empresa;
create policy mensagens_empresa_acesso on public.mensagens_empresa
  for all to authenticated
  using (
    public.eh_admin()
    or empresa_id = public.minha_empresa_id()
    or (
      empresa_id = public.empresa_do_motorista()
      and motorista_id = public.meu_motorista_id()
    )
  )
  with check (
    public.eh_admin()
    or empresa_id = public.minha_empresa_id()
    or (
      empresa_id = public.empresa_do_motorista()
      and motorista_id = public.meu_motorista_id()
    )
  );

drop policy if exists turnos_motorista_acesso on public.turnos_motorista;
create policy turnos_motorista_acesso on public.turnos_motorista
  for all to authenticated
  using (
    public.eh_admin()
    or empresa_id = public.minha_empresa_id()
    or (
      empresa_id = public.empresa_do_motorista()
      and motorista_id = public.meu_motorista_id()
    )
  )
  with check (
    public.eh_admin()
    or empresa_id = public.minha_empresa_id()
    or (
      empresa_id = public.empresa_do_motorista()
      and motorista_id = public.meu_motorista_id()
    )
  );

drop policy if exists agendamentos_veiculo_acesso on public.agendamentos_veiculo;
create policy agendamentos_veiculo_acesso on public.agendamentos_veiculo
  for all to authenticated
  using (
    public.eh_admin()
    or empresa_id = public.minha_empresa_id()
    or empresa_id = public.empresa_do_motorista()
  )
  with check (
    public.eh_admin()
    or empresa_id = public.minha_empresa_id()
    or (
      empresa_id = public.empresa_do_motorista()
      and (motorista_id is null or motorista_id = public.meu_motorista_id())
    )
  );

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'mensagens_empresa'
  ) then
    alter publication supabase_realtime add table public.mensagens_empresa;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'turnos_motorista'
  ) then
    alter publication supabase_realtime add table public.turnos_motorista;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'agendamentos_veiculo'
  ) then
    alter publication supabase_realtime add table public.agendamentos_veiculo;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'trip_status_history'
  ) then
    alter publication supabase_realtime add table public.trip_status_history;
  end if;
end $$;
