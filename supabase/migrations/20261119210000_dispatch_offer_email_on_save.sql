create schema if not exists jemani_private;

create function jemani_private.disparar_email_oferta_ao_salvar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  endpoint text;
  cron_secret text;
begin
  select decrypted_secret into endpoint
  from vault.decrypted_secrets where name = 'jemani_offer_email_endpoint';

  select decrypted_secret into cron_secret
  from vault.decrypted_secrets where name = 'jemani_offer_email_cron_secret';

  if nullif(endpoint, '') is null or nullif(cron_secret, '') is null then
    raise exception 'Agendamento de e-mails ainda não configurado';
  end if;

  -- O pg_net inicia a requisição somente após o commit da configuração.
  perform net.http_post(
    url := endpoint,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-offer-cron-secret', cron_secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 50000
  );

  return new;
end;
$$;

revoke all on function jemani_private.disparar_email_oferta_ao_salvar()
  from public, anon, authenticated;

create trigger disparar_email_oferta_ao_salvar
after update on public.offer_email_automation
for each row when (new.enabled)
execute function jemani_private.disparar_email_oferta_ao_salvar();
