-- Automation starts paused. The scheduler requires a project-local Vault URL and secret.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;
create extension if not exists pgcrypto with schema extensions;

create table public.offer_email_automation (
  id boolean primary key default true check (id),
  enabled boolean not null default false,
  default_quota integer not null default 3 check (default_quota between 0 and 10000),
  rules jsonb not null default '[]' check (jsonb_typeof(rules) = 'array'),
  cycle uuid not null default gen_random_uuid()
);
insert into public.offer_email_automation default values;

alter table public.offer_email_automation enable row level security;
revoke all on public.offer_email_automation from anon, authenticated;
grant select, update (enabled, default_quota, rules, cycle) on public.offer_email_automation to authenticated;
create policy offer_email_automation_admin on public.offer_email_automation
  for all to authenticated using (public.eh_admin()) with check (public.eh_admin());

create table public.offer_email_jobs (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid unique references public.trips on delete set null,
  company_id uuid not null references public.companies on delete cascade,
  cycle uuid not null,
  state text not null default 'pending' check (state in ('pending', 'sent', 'failed')),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  next_attempt_at timestamptz not null default now()
);
create index offer_email_jobs_quota on public.offer_email_jobs (cycle, company_id, state);
alter table public.offer_email_jobs enable row level security;
revoke all on public.offer_email_jobs from anon, authenticated;
grant select (company_id, cycle, state) on public.offer_email_jobs to authenticated;
create policy offer_email_jobs_admin on public.offer_email_jobs
  for select to authenticated using (public.eh_admin());

alter table public.trip_assignments add column if not exists email_enviado_em timestamptz;

create function public.reservar_email_oferta()
returns setof public.offer_email_jobs
language plpgsql
set search_path = ''
as $$
declare
  config public.offer_email_automation;
  job public.offer_email_jobs;
  candidate record;
  token text;
begin
  select * into config from public.offer_email_automation where id for update;
  if not config.enabled then return; end if;

  -- Retry inside Resend's 24-hour idempotency window.
  update public.offer_email_jobs j set state = 'failed'
  where j.state = 'pending' and (
    j.created_at <= now() - interval '20 hours' or j.expires_at <= now()
    or not exists (
      select from public.trips t where t.id = j.trip_id and t.empresa_id is null
        and t.payment_status = 'paid' and t.status in ('paid', 'aguardando_empresa', 'oferta_enviada')
    )
    or not exists (
      select from public.companies c where c.id = j.company_id and c.status = 'ativa'
        and c.habilitada_receber and lower(btrim(c.email)) = j.payload->>'email'
    )
    or not exists (select from public.trip_offer_invites i where i.id = j.id and i.revoked_at is null)
  );

  select * into job from public.offer_email_jobs
  where state = 'pending' and next_attempt_at <= now()
  order by next_attempt_at, id limit 1;
  if found then
    update public.offer_email_jobs set next_attempt_at = now() + interval '5 minutes' where id = job.id;
    return next job;
    return;
  end if;

  with usage as (
    select company_id, count(*) as used
    from public.offer_email_jobs where cycle = config.cycle and state in ('sent', 'pending')
    group by company_id
  )
  select t.id as trip_id, t.codigo, t.origem, t.destino, t.data_viagem, t.horario,
    t.passageiros, t.valor_empresa, c.id as company_id, c.nome_comercial,
    lower(btrim(c.email)) as email,
    coalesce(t.inicio_agendado, (t.data_viagem + t.horario) at time zone 'America/Los_Angeles') as expires_at,
    case when c.latitude is not null and c.longitude is not null
      and t.origem_lat is not null and t.origem_lng is not null
      then round(public.distancia_km_haversine(t.origem_lat, t.origem_lng, c.latitude, c.longitude)::numeric, 2)
    end as distance
  into candidate
  from public.trips t
  cross join public.companies c
  left join usage u on u.company_id = c.id
  left join lateral (
    select r.value, r.ordinality from jsonb_array_elements(config.rules) with ordinality r
    where r.value->>'company_id' = c.id::text order by r.ordinality limit 1
  ) rule on true
  where t.payment_status = 'paid' and t.empresa_id is null
    and t.status in ('paid', 'aguardando_empresa', 'oferta_enviada')
    and coalesce(t.inicio_agendado, (t.data_viagem + t.horario) at time zone 'America/Los_Angeles') > now()
    and not exists (select from public.offer_email_jobs j where j.trip_id = t.id)
    and not exists (select from public.trip_offer_invites i where i.viagem_id = t.id and i.revoked_at is null and i.expires_at > now())
    and not exists (select from public.trip_assignments a where a.viagem_id = t.id and a.email_enviado_em is not null)
    and not exists (select from public.audit_logs a where a.entidade_id = t.id and a.acao = 'email_oferta_enviado')
    and c.status = 'ativa' and c.habilitada_receber and position('@' in c.email) > 1
    and (coalesce(cardinality(c.categorias_ids), 0) = 0 or t.categoria_id = any(c.categorias_ids))
    and (
      not exists (select from public.vehicles v where v.empresa_id = c.id and v.status <> 'inativo')
      or exists (select from public.vehicles v where v.empresa_id = c.id and v.status <> 'inativo' and v.categoria_id = t.categoria_id)
    )
    and coalesce(u.used, 0) < case when rule.value->>'quota' ~ '^[0-9]{1,5}$'
      then least((rule.value->>'quota')::integer, 10000) else config.default_quota end
  order by case when rule.value->>'priority' = 'true' then rule.ordinality end nulls last,
    coalesce(u.used, 0), distance nulls last, t.created_at, t.id, c.id
  limit 1 for update of t skip locked;

  if not found then return; end if;
  token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.offer_email_jobs (trip_id, company_id, cycle, payload, expires_at, next_attempt_at)
  values (candidate.trip_id, candidate.company_id, config.cycle,
    to_jsonb(candidate) || jsonb_build_object('token', token), candidate.expires_at, now() + interval '5 minutes')
  returning * into job;

  insert into public.trip_offer_invites (id, viagem_id, empresa_id, token_hash, expires_at)
  values (job.id, job.trip_id, job.company_id, public.hash_token_convite(token), job.expires_at);
  return next job;
end;
$$;

create function public.concluir_email_oferta(p_id uuid)
returns void language plpgsql set search_path = ''
as $$
declare
  job public.offer_email_jobs;
  previous_status public.status_viagem;
begin
  update public.offer_email_jobs set state = 'sent', payload = '{}'::jsonb
  where id = p_id and state <> 'sent' returning * into job;
  if not found then return; end if;

  select status into previous_status from public.trips where id = job.trip_id for update;
  if previous_status in ('paid', 'aguardando_empresa', 'oferta_enviada') then
    update public.trips set status = 'oferta_enviada', version = version + 1
    where id = job.trip_id and status <> 'oferta_enviada' and empresa_id is null;
    if found then
      insert into public.trip_status_history (viagem_id, status_anterior, status_novo, observacao)
      values (job.trip_id, previous_status, 'oferta_enviada', 'Oferta enviada pela automação de e-mail');
    end if;
  end if;

  if job.trip_id is not null then
    insert into public.trip_assignments (viagem_id, empresa_id, email_enviado_em, motivo)
    values (job.trip_id, job.company_id, now(), 'email_oferta_automacao')
    on conflict (viagem_id, empresa_id) do update set
      email_enviado_em = excluded.email_enviado_em;
  end if;
end;
$$;

revoke all on function public.reservar_email_oferta(), public.concluir_email_oferta(uuid) from public, anon, authenticated;
grant execute on function public.reservar_email_oferta(), public.concluir_email_oferta(uuid) to service_role;

select cron.schedule('jemani-offer-email-automation', '* * * * *', $cron$
  select net.http_post(
    url := endpoint.decrypted_secret,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-offer-cron-secret', secret.decrypted_secret),
    body := '{}'::jsonb, timeout_milliseconds := 50000
  )
  from vault.decrypted_secrets endpoint, vault.decrypted_secrets secret
  where endpoint.name = 'jemani_offer_email_endpoint'
    and secret.name = 'jemani_offer_email_cron_secret'
    and exists (select from public.offer_email_automation where id and enabled)
$cron$);

create function public.progresso_email_oferta(p_cycle uuid)
returns table (company_id uuid, sent bigint, pending bigint, failed bigint)
language sql stable set search_path = ''
as $$
  select j.company_id, count(*) filter (where state = 'sent'),
    count(*) filter (where state = 'pending'), count(*) filter (where state = 'failed')
  from public.offer_email_jobs j where cycle = p_cycle and public.eh_admin()
  group by j.company_id;
$$;
revoke all on function public.progresso_email_oferta(uuid) from public, anon;
grant execute on function public.progresso_email_oferta(uuid) to authenticated;

grant select, update on public.offer_email_automation to service_role;
grant select, insert, update on public.offer_email_jobs to service_role;
