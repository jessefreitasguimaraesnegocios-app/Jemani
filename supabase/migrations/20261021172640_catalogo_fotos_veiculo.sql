-- Catálogo de fotos de veículos: admin sobe; empresas só leem e associam ao veículo.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'veiculos-catalogo',
  'veiculos-catalogo',
  true,
  1500000,
  array['image/jpeg', 'image/webp', 'image/png']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.catalogo_fotos_veiculo (
  id uuid primary key default gen_random_uuid(),
  marca text not null,
  modelo text not null,
  ano int not null,
  nome text not null,
  url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_catalogo_fotos_busca
  on public.catalogo_fotos_veiculo (marca, modelo, ano);

drop trigger if exists trg_catalogo_fotos_veiculo_updated on public.catalogo_fotos_veiculo;
create trigger trg_catalogo_fotos_veiculo_updated
  before update on public.catalogo_fotos_veiculo
  for each row execute function public.set_updated_at();

alter table public.catalogo_fotos_veiculo enable row level security;

drop policy if exists catalogo_fotos_leitura on public.catalogo_fotos_veiculo;
create policy catalogo_fotos_leitura on public.catalogo_fotos_veiculo
  for select to authenticated
  using (true);

drop policy if exists catalogo_fotos_admin_write on public.catalogo_fotos_veiculo;
create policy catalogo_fotos_admin_write on public.catalogo_fotos_veiculo
  for all to authenticated
  using (public.eh_admin())
  with check (public.eh_admin());

drop policy if exists veiculos_catalogo_leitura on storage.objects;
create policy veiculos_catalogo_leitura on storage.objects
  for select
  using (bucket_id = 'veiculos-catalogo');

drop policy if exists veiculos_catalogo_admin_insert on storage.objects;
create policy veiculos_catalogo_admin_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'veiculos-catalogo'
    and public.eh_admin()
  );

drop policy if exists veiculos_catalogo_admin_update on storage.objects;
create policy veiculos_catalogo_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'veiculos-catalogo' and public.eh_admin())
  with check (bucket_id = 'veiculos-catalogo' and public.eh_admin());

drop policy if exists veiculos_catalogo_admin_delete on storage.objects;
create policy veiculos_catalogo_admin_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'veiculos-catalogo'
    and public.eh_admin()
  );
