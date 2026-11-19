-- Disparo automático de push no INSERT de notifications (pg_net + vault).
-- Secret no Vault: jemani_push_webhook_secret (mesmo valor de PUSH_WEBHOOK_SECRET).

create schema if not exists jemani_private;

create or replace function jemani_private.enviar_push_on_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform net.http_post(
    url := 'https://qdiocaeoevxhdsrtcahn.supabase.co/functions/v1/enviar-push',
    headers := pg_catalog.jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-secret', (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'jemani_push_webhook_secret'
      )
    ),
    body := pg_catalog.jsonb_build_object(
      'type', 'INSERT',
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'record', pg_catalog.to_jsonb(NEW),
      'old_record', null
    ),
    timeout_milliseconds := 5000
  );
  return NEW;
exception when others then
  raise warning 'Falha ao enfileirar webhook de push (%)', SQLSTATE;
  return NEW;
end;
$$;

drop trigger if exists jemani_enviar_push on public.notifications;
create trigger jemani_enviar_push
  after insert on public.notifications
  for each row
  execute function jemani_private.enviar_push_on_notification();
