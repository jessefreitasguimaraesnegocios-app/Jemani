-- Paradas sob demanda no Hourly Chauffeur (lista de endereços do cliente).

alter table public.trips
  add column if not exists paradas_liberadas integer not null default 5,
  add column if not exists paradas jsonb not null default '[]'::jsonb;

comment on column public.trips.paradas_liberadas is
  'Quantos endereços extras o cliente pode cadastrar neste bloco hourly.';
comment on column public.trips.paradas is
  'Lista JSON de paradas: id, ordem, endereco, lat/lng, status pendente|chegou.';

insert into public.platform_settings (chave, valor, descricao)
values
  ('hourly_paradas_por_bloco', '5', 'Endereços liberados por bloco hourly / extensão paga'),
  ('hourly_raio_paradas_km', '80', 'Raio máximo (km) das paradas a partir do embarque/base')
on conflict (chave) do nothing;
