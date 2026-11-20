-- O prazo é salvo na oferta para manter a validade informada no e-mail em caso de retentativa.
alter table public.offer_email_automation
  add column wait_minutes integer not null default 15 check (wait_minutes between 1 and 1440);

alter table public.offer_email_jobs
  add column wait_minutes integer not null default 15 check (wait_minutes between 1 and 1440);

grant update (wait_minutes) on public.offer_email_automation to authenticated;

create or replace function public.reservar_email_oferta()
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
  update public.offer_email_jobs j set state = 'failed', payload = '{}'::jsonb
  where j.state = 'pending' and (
    j.created_at <= now() - interval '20 hours' or j.expires_at <= now()
    or (j.attempts >= 3 and j.next_attempt_at <= now())
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
    update public.offer_email_jobs set next_attempt_at = now() + interval '5 minutes', attempts = attempts + 1
    where id = job.id;
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
    and not exists (
      select from public.offer_email_jobs j where j.trip_id = t.id
        and (j.state = 'pending' or j.sent_at > now() - make_interval(mins => j.wait_minutes))
    )
    and not exists (
      select from public.offer_email_jobs j where j.trip_id = t.id and j.company_id = c.id
        and (j.state <> 'failed' or j.provider_status is null
          or (j.provider_status = 403 and j.next_attempt_at > now())
          or j.provider_status in (400, 422))
    )
    and not exists (
      select from public.trip_offer_invites i where i.viagem_id = t.id
        and i.revoked_at is null and i.expires_at > now()
        and (i.empresa_id = c.id or i.created_at > now() - interval '15 minutes')
    )
    and not exists (
      select from public.trip_assignments a where a.viagem_id = t.id
        and ((a.email_enviado_em > now() - interval '15 minutes' and not exists (
          select from public.offer_email_jobs sent where sent.trip_id = a.viagem_id
            and sent.company_id = a.empresa_id and sent.state = 'sent'
        ))
          or (a.empresa_id = c.id and (a.email_enviado_em is not null or a.status = 'recusada')))
    )
    and not exists (
      select from public.audit_logs a where a.entidade_id = t.id and a.acao = 'email_oferta_enviado'
        and (a.created_at > now() - interval '15 minutes' or a.metadados->>'empresa_id' = c.id::text)
    )
    and c.status = 'ativa' and c.habilitada_receber and position('@' in c.email) > 1
    and (coalesce(cardinality(c.categorias_ids), 0) = 0 or t.categoria_id = any(c.categorias_ids))
    and (
      not exists (select from public.vehicles v where v.empresa_id = c.id and v.status <> 'inativo')
      or exists (select from public.vehicles v where v.empresa_id = c.id and v.status <> 'inativo' and v.categoria_id = t.categoria_id)
    )
    and coalesce(u.used, 0) < case when rule.value->>'quota' ~ '^[0-9]{1,5}$'
      then least((rule.value->>'quota')::integer, 10000) else config.default_quota end
  order by exists (
    select from public.offer_email_jobs j where j.trip_id = t.id and j.company_id = c.id
  ), case when rule.value->>'priority' = 'true' then rule.ordinality end nulls last,
    distance nulls last, t.created_at, t.id, c.id
  limit 1 for update of t skip locked;

  if not found then return; end if;
  token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.offer_email_jobs (trip_id, company_id, cycle, payload, expires_at, next_attempt_at, attempts, wait_minutes)
  values (candidate.trip_id, candidate.company_id, config.cycle,
    to_jsonb(candidate) || jsonb_build_object('token', token, 'janela_minutos', config.wait_minutes),
    candidate.expires_at, now() + interval '5 minutes', 1, config.wait_minutes)
  returning * into job;

  insert into public.trip_offer_invites (id, viagem_id, empresa_id, token_hash, expires_at)
  values (job.id, job.trip_id, job.company_id, public.hash_token_convite(token),
    least(job.expires_at, now() + make_interval(mins => job.wait_minutes)));
  return next job;
end;
$$;

create or replace function public.concluir_email_oferta(p_id uuid)
returns void language plpgsql set search_path = ''
as $$
declare
  job public.offer_email_jobs;
  previous_status public.status_viagem;
begin
  update public.offer_email_jobs set state = 'sent', payload = '{}'::jsonb, sent_at = now()
  where id = p_id and state = 'pending' returning * into job;
  if not found then return; end if;

  update public.trip_offer_invites
  set expires_at = least(job.expires_at, job.sent_at + make_interval(mins => job.wait_minutes))
  where id = job.id and accepted_at is null and revoked_at is null;

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
