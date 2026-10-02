-- Stripe Connect / Checkout (teste e produção)
alter table public.companies
  add column if not exists stripe_account_id text;

alter table public.payments
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_transfer_id text;

create index if not exists idx_companies_stripe_account
  on public.companies (stripe_account_id)
  where stripe_account_id is not null;

create index if not exists idx_payments_checkout_session
  on public.payments (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;
