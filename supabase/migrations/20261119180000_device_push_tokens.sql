-- Tokens FCM/APNs por dispositivo (push nativo Capacitor).

create table if not exists public.device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.profiles(id) on delete cascade,
  token text not null,
  plataforma text not null check (plataforma in ('android', 'ios', 'web')),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (usuario_id, token)
);

create index if not exists idx_device_push_tokens_usuario_ativo
  on public.device_push_tokens (usuario_id)
  where ativo;

alter table public.device_push_tokens enable row level security;

drop policy if exists device_push_tokens_own on public.device_push_tokens;
create policy device_push_tokens_own on public.device_push_tokens
  for all
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

create or replace function public.touch_device_push_token()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_device_push_token on public.device_push_tokens;
create trigger trg_touch_device_push_token
  before update on public.device_push_tokens
  for each row
  execute function public.touch_device_push_token();
