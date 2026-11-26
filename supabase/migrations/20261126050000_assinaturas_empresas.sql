-- Plano de acesso e mensalidade das empresas (painel vs só e-mail de ofertas).
alter table public.companies
  add column if not exists plano_acesso text not null default 'assinatura'
    check (plano_acesso in ('assinatura', 'repasse_email'));

alter table public.companies
  add column if not exists valor_mensalidade numeric(12, 2);

comment on column public.companies.plano_acesso is
  'assinatura = paga mensalidade e usa o painel; repasse_email = só recebe e-mails de ofertas';

comment on column public.companies.valor_mensalidade is
  'Valor mensal em USD; null usa a config mensalidade_padrao';

create table if not exists public.company_mensalidades (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.companies (id) on delete cascade,
  competencia text not null,
  valor numeric(12, 2) not null,
  status text not null default 'pendente'
    check (status in ('pendente', 'pago', 'atrasado', 'isento')),
  pago_em timestamptz,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, competencia)
);

create index if not exists company_mensalidades_competencia_idx
  on public.company_mensalidades (competencia);

alter table public.company_mensalidades enable row level security;

drop policy if exists company_mensalidades_admin_all on public.company_mensalidades;
create policy company_mensalidades_admin_all
  on public.company_mensalidades
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.tipo = 'admin' and p.ativo
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.tipo = 'admin' and p.ativo
    )
  );
