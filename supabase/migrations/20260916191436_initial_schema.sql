-- Jemani — schema inicial do marketplace de transporte executivo (Los Angeles)

create extension if not exists "pgcrypto";

create type public.tipo_usuario as enum ('cliente', 'empresa', 'motorista', 'admin');
create type public.status_viagem as enum (
  'solicitada',
  'aguardando_empresa',
  'empresa_confirmada',
  'motorista_atribuido',
  'motorista_a_caminho',
  'motorista_chegou',
  'passageiro_embarcou',
  'viagem_em_andamento',
  'viagem_finalizada',
  'cancelada'
);
create type public.status_empresa as enum ('pendente', 'aprovada', 'ativa', 'inativa', 'bloqueada');
create type public.status_pagamento as enum ('pendente', 'pago', 'falhou', 'reembolsado', 'teste');
create type public.status_entidade as enum ('disponivel', 'ocupado', 'inativo');
create type public.status_atribuicao as enum ('oferecida', 'aceita', 'recusada', 'expirada');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  nome text not null,
  telefone text,
  tipo public.tipo_usuario not null default 'cliente',
  avatar_url text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vehicle_categories (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text not null unique,
  descricao text,
  capacidade_min int not null default 1,
  capacidade_max int not null default 4,
  adicional_preco numeric(12,2) not null default 0,
  ativo boolean not null default true,
  ordem int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.profiles (id),
  nome_comercial text not null,
  razao_social text not null,
  cnpj text not null unique,
  telefone text not null,
  email text not null,
  cidade text not null,
  regioes_atendidas text[] not null default '{}',
  categorias_ids uuid[] not null default '{}',
  status public.status_empresa not null default 'pendente',
  habilitada_receber boolean not null default false,
  avaliacao_media numeric(3,2) not null default 5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.company_users (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  papel text not null default 'gestor',
  created_at timestamptz not null default now(),
  unique (company_id, user_id)
);

create table public.drivers (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.companies (id) on delete cascade,
  usuario_id uuid references public.profiles (id),
  nome text not null,
  foto_url text,
  telefone text not null,
  cnh text not null,
  categoria_cnh text not null default 'B',
  experiencia_anos int not null default 0,
  status public.status_entidade not null default 'disponivel',
  disponivel boolean not null default true,
  avaliacao_media numeric(3,2) not null default 5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.companies (id) on delete cascade,
  marca text not null,
  modelo text not null,
  ano int not null,
  categoria_id uuid not null references public.vehicle_categories (id),
  capacidade int not null,
  ar_condicionado boolean not null default true,
  bagageiro boolean not null default true,
  fotos text[] not null default '{}',
  placa text,
  status public.status_entidade not null default 'disponivel',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.platform_settings (
  id uuid primary key default gen_random_uuid(),
  chave text not null unique,
  valor text not null,
  descricao text,
  updated_at timestamptz not null default now()
);

create table public.price_rules (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  preco_base numeric(12,2) not null,
  preco_por_km numeric(12,2) not null,
  preco_minimo numeric(12,2) not null,
  adicional_horario_noturno numeric(12,2) not null default 0,
  horario_noturno_inicio time not null default '22:00',
  horario_noturno_fim time not null default '06:00',
  distancia_padrao_km numeric(10,2) not null default 40,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pickup_locations (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  endereco text not null,
  cidade text not null,
  latitude numeric(10,7),
  longitude numeric(10,7),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  cliente_id uuid not null references public.profiles (id),
  empresa_id uuid references public.companies (id),
  motorista_id uuid references public.drivers (id),
  veiculo_id uuid references public.vehicles (id),
  categoria_id uuid not null references public.vehicle_categories (id),
  origem text not null,
  destino text not null,
  data_viagem date not null,
  horario time not null,
  passageiros int not null,
  malas int,
  numero_voo text,
  nome_passageiro text,
  observacoes text,
  distancia_km numeric(10,2),
  preco_base numeric(12,2) not null,
  taxas numeric(12,2) not null default 0,
  preco_total numeric(12,2) not null,
  comissao_percentual numeric(5,2) not null,
  valor_plataforma numeric(12,2) not null,
  valor_empresa numeric(12,2) not null,
  status public.status_viagem not null default 'aguardando_empresa',
  cancelado_por uuid references public.profiles (id),
  motivo_cancelamento text,
  cancelado_em timestamptz,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.trip_status_history (
  id uuid primary key default gen_random_uuid(),
  viagem_id uuid not null references public.trips (id) on delete cascade,
  status_anterior public.status_viagem,
  status_novo public.status_viagem not null,
  usuario_id uuid references public.profiles (id),
  observacao text,
  created_at timestamptz not null default now()
);

create table public.trip_assignments (
  id uuid primary key default gen_random_uuid(),
  viagem_id uuid not null references public.trips (id) on delete cascade,
  empresa_id uuid not null references public.companies (id),
  status public.status_atribuicao not null default 'oferecida',
  respondido_em timestamptz,
  created_at timestamptz not null default now(),
  unique (viagem_id, empresa_id)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.trips (id),
  payment_id text,
  amount numeric(12,2) not null,
  platform_fee numeric(12,2) not null,
  company_amount numeric(12,2) not null,
  status public.status_pagamento not null default 'pendente',
  payment_method text not null default 'card',
  provider text not null default 'teste',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.commissions (
  id uuid primary key default gen_random_uuid(),
  viagem_id uuid not null references public.trips (id),
  empresa_id uuid not null references public.companies (id),
  valor_viagem numeric(12,2) not null,
  percentual numeric(5,2) not null,
  valor_plataforma numeric(12,2) not null,
  valor_empresa numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.profiles (id) on delete cascade,
  titulo text not null,
  mensagem text not null,
  tipo text not null,
  lida boolean not null default false,
  referencia_id uuid,
  created_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  viagem_id uuid not null references public.trips (id),
  cliente_id uuid not null references public.profiles (id),
  empresa_id uuid not null references public.companies (id),
  motorista_id uuid references public.drivers (id),
  nota_empresa int not null check (nota_empresa between 1 and 5),
  nota_motorista int not null check (nota_motorista between 1 and 5),
  nota_servico int not null check (nota_servico between 1 and 5),
  comentario text,
  created_at timestamptz not null default now(),
  unique (viagem_id, cliente_id)
);

-- Índices
create index idx_trips_cliente on public.trips (cliente_id);
create index idx_trips_empresa on public.trips (empresa_id);
create index idx_trips_status on public.trips (status);
create index idx_trips_data on public.trips (data_viagem);
create index idx_assignments_empresa_status on public.trip_assignments (empresa_id, status);
create index idx_notifications_usuario on public.notifications (usuario_id, lida);
create index idx_drivers_empresa on public.drivers (empresa_id);
create index idx_vehicles_empresa on public.vehicles (empresa_id);

-- Triggers updated_at
create trigger trg_profiles_updated before update on public.profiles
for each row execute function public.set_updated_at();
create trigger trg_companies_updated before update on public.companies
for each row execute function public.set_updated_at();
create trigger trg_drivers_updated before update on public.drivers
for each row execute function public.set_updated_at();
create trigger trg_vehicles_updated before update on public.vehicles
for each row execute function public.set_updated_at();
create trigger trg_trips_updated before update on public.trips
for each row execute function public.set_updated_at();
create trigger trg_payments_updated before update on public.payments
for each row execute function public.set_updated_at();
create trigger trg_categories_updated before update on public.vehicle_categories
for each row execute function public.set_updated_at();
create trigger trg_price_rules_updated before update on public.price_rules
for each row execute function public.set_updated_at();

-- Helpers de autorização (app_metadata / profiles — não usar user_metadata)
create or replace function public.meu_tipo()
returns public.tipo_usuario
language sql
stable
security definer
set search_path = public
as $$
  select tipo from public.profiles where id = auth.uid();
$$;

create or replace function public.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and tipo = 'admin'
  );
$$;

create or replace function public.minha_empresa_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.companies where usuario_id = auth.uid()
  union
  select company_id from public.company_users where user_id = auth.uid()
  limit 1;
$$;

create or replace function public.meu_motorista_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.drivers where usuario_id = auth.uid() limit 1;
$$;

-- Aceite atômico (protege contra double-accept)
create or replace function public.aceitar_viagem(p_viagem_id uuid, p_empresa_id uuid)
returns public.trips
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip public.trips;
begin
  if public.minha_empresa_id() is distinct from p_empresa_id and not public.eh_admin() then
    raise exception 'Empresa não autorizada';
  end if;

  update public.trips
  set
    empresa_id = p_empresa_id,
    status = 'empresa_confirmada',
    version = version + 1,
    updated_at = now()
  where id = p_viagem_id
    and status = 'aguardando_empresa'
    and empresa_id is null
  returning * into v_trip;

  if v_trip.id is null then
    raise exception 'Solicitação indisponível ou já aceita';
  end if;

  update public.trip_assignments
  set status = 'aceita', respondido_em = now()
  where viagem_id = p_viagem_id and empresa_id = p_empresa_id;

  update public.trip_assignments
  set status = 'expirada', respondido_em = now()
  where viagem_id = p_viagem_id and empresa_id <> p_empresa_id and status = 'oferecida';

  insert into public.trip_status_history (viagem_id, status_anterior, status_novo, usuario_id)
  values (p_viagem_id, 'aguardando_empresa', 'empresa_confirmada', auth.uid());

  return v_trip;
end;
$$;

-- RLS
alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.company_users enable row level security;
alter table public.drivers enable row level security;
alter table public.vehicles enable row level security;
alter table public.vehicle_categories enable row level security;
alter table public.trips enable row level security;
alter table public.trip_status_history enable row level security;
alter table public.trip_assignments enable row level security;
alter table public.payments enable row level security;
alter table public.commissions enable row level security;
alter table public.platform_settings enable row level security;
alter table public.price_rules enable row level security;
alter table public.pickup_locations enable row level security;
alter table public.notifications enable row level security;
alter table public.reviews enable row level security;

-- Profiles
create policy profiles_select_own_or_admin on public.profiles
  for select using (id = auth.uid() or public.eh_admin());
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid() or public.eh_admin());
create policy profiles_insert_own on public.profiles
  for insert with check (id = auth.uid() or public.eh_admin());

-- Categorias / preços / settings (leitura autenticada; escrita admin)
create policy categories_select on public.vehicle_categories for select to authenticated using (true);
create policy categories_admin on public.vehicle_categories for all using (public.eh_admin()) with check (public.eh_admin());
create policy price_rules_select on public.price_rules for select to authenticated using (true);
create policy price_rules_admin on public.price_rules for all using (public.eh_admin()) with check (public.eh_admin());
create policy settings_select on public.platform_settings for select to authenticated using (true);
create policy settings_admin on public.platform_settings for all using (public.eh_admin()) with check (public.eh_admin());
create policy pickup_select on public.pickup_locations for select to authenticated using (true);
create policy pickup_admin on public.pickup_locations for all using (public.eh_admin()) with check (public.eh_admin());

-- Companies
create policy companies_select on public.companies for select using (
  public.eh_admin() or usuario_id = auth.uid() or id = public.minha_empresa_id() or status = 'ativa'
);
create policy companies_admin_write on public.companies for all using (public.eh_admin()) with check (public.eh_admin());
create policy companies_update_own on public.companies for update using (usuario_id = auth.uid());

-- Drivers / vehicles
create policy drivers_select on public.drivers for select using (
  public.eh_admin() or empresa_id = public.minha_empresa_id() or usuario_id = auth.uid()
);
create policy drivers_write_empresa on public.drivers for all using (
  public.eh_admin() or empresa_id = public.minha_empresa_id()
) with check (public.eh_admin() or empresa_id = public.minha_empresa_id());

create policy vehicles_select on public.vehicles for select using (
  public.eh_admin() or empresa_id = public.minha_empresa_id()
);
create policy vehicles_write_empresa on public.vehicles for all using (
  public.eh_admin() or empresa_id = public.minha_empresa_id()
) with check (public.eh_admin() or empresa_id = public.minha_empresa_id());

-- Trips
create policy trips_select on public.trips for select using (
  public.eh_admin()
  or cliente_id = auth.uid()
  or empresa_id = public.minha_empresa_id()
  or motorista_id = public.meu_motorista_id()
  or exists (
    select 1 from public.trip_assignments a
    where a.viagem_id = trips.id
      and a.empresa_id = public.minha_empresa_id()
      and a.status = 'oferecida'
  )
);
create policy trips_insert_cliente on public.trips for insert with check (
  cliente_id = auth.uid() or public.eh_admin()
);
create policy trips_update on public.trips for update using (
  public.eh_admin()
  or cliente_id = auth.uid()
  or empresa_id = public.minha_empresa_id()
  or motorista_id = public.meu_motorista_id()
);

create policy history_select on public.trip_status_history for select using (
  exists (
    select 1 from public.trips t
    where t.id = viagem_id and (
      public.eh_admin() or t.cliente_id = auth.uid() or t.empresa_id = public.minha_empresa_id()
      or t.motorista_id = public.meu_motorista_id()
    )
  )
);
create policy history_insert on public.trip_status_history for insert with check (auth.uid() is not null);

create policy assignments_select on public.trip_assignments for select using (
  public.eh_admin() or empresa_id = public.minha_empresa_id()
);
create policy assignments_update on public.trip_assignments for update using (
  public.eh_admin() or empresa_id = public.minha_empresa_id()
);

create policy payments_select on public.payments for select using (
  public.eh_admin()
  or exists (select 1 from public.trips t where t.id = booking_id and t.cliente_id = auth.uid())
  or exists (select 1 from public.trips t where t.id = booking_id and t.empresa_id = public.minha_empresa_id())
);

create policy commissions_select on public.commissions for select using (
  public.eh_admin() or empresa_id = public.minha_empresa_id()
);

create policy notifications_own on public.notifications for all using (usuario_id = auth.uid() or public.eh_admin())
  with check (usuario_id = auth.uid() or public.eh_admin());

create policy reviews_select on public.reviews for select using (
  public.eh_admin() or cliente_id = auth.uid() or empresa_id = public.minha_empresa_id()
);
create policy reviews_insert on public.reviews for insert with check (cliente_id = auth.uid());

-- Seed de configuração padrão
insert into public.platform_settings (chave, valor, descricao) values
  ('comissao_percentual', '10', 'Comissão da plataforma (%)'),
  ('nome_plataforma', 'Jemani', 'Nome da plataforma'),
  ('taxa_servico', '0', 'Taxa de serviço adicional (USD)'),
  ('regiao_atuacao', 'Los Angeles e região metropolitana', 'Região de atuação');

insert into public.vehicle_categories (nome, slug, descricao, capacidade_min, capacidade_max, adicional_preco, ordem) values
  ('JEMANI EXECUTIVE', 'jemani-executive', 'Sedans executivos para viagens corporativas e aeroporto.', 1, 3, 0, 1),
  ('JEMANI BLACK', 'jemani-black', 'Carro premium com motorista, experiência mais exclusiva.', 1, 3, 95, 2),
  ('JEMANI SUV', 'jemani-suv', 'SUVs de luxo para famílias, grupos e bagagem.', 1, 6, 55, 3),
  ('JEMANI LUXE', 'jemani-luxe', 'Veículos de altíssimo padrão.', 1, 3, 140, 4),
  ('JEMANI LIMO', 'jemani-limo', 'Limousines tradicionais para eventos e ocasiões especiais.', 2, 10, 180, 5),
  ('JEMANI VAN', 'jemani-van', 'Vans executivas para grupos.', 4, 14, 85, 6);

insert into public.price_rules (
  nome, preco_base, preco_por_km, preco_minimo, adicional_horario_noturno, distancia_padrao_km, ativo
) values (
  'Regra padrão Los Angeles', 65, 3.5, 95, 25, 20, true
);
