# Aplicar segurança Jemani (SQL + Edge Functions)

Não execute deploy/DNS sem autorização explícita. Este guia é para você rodar.

## 1) SQL (obrigatório)

1. Abra o [SQL Editor](https://supabase.com/dashboard) do projeto Jemani.
2. Cole e rode o arquivo [`SEGURANCA-APLICAR.sql`](./SEGURANCA-APLICAR.sql).
3. Confirme `Success`. Se alguma policy/função já existir, o script é idempotente.

Smoke rápido (opcional):

```sql
select proname from pg_proc
where proname in ('edge_rate_limit', 'empresas_marketplace', 'proteger_pagamento_viagem');

select tablename, policyname from pg_policies
where tablename in ('trips', 'companies', 'vehicles', 'trip_extensions', 'edge_rate_limits')
order by 1, 2;
```

## 2) Deploy das Edge Functions (PowerShell)

Na pasta do repo (`main`):

```powershell
# Login uma vez (abre o browser)
npx supabase login

# Vincular ao projeto Jemani (ref do projeto)
npx supabase link --project-ref qdiocaeoevxhdsrtcahn

# Publicar functions atualizadas
npx supabase functions deploy stripe-criar-checkout --no-verify-jwt
npx supabase functions deploy stripe-verificar-sessao --no-verify-jwt
npx supabase functions deploy stripe-transferir-empresa --no-verify-jwt
npx supabase functions deploy stripe-connect-onboarding --no-verify-jwt
npx supabase functions deploy stripe-webhook --no-verify-jwt
npx supabase functions deploy criar-empresa --no-verify-jwt
npx supabase functions deploy places-proxy --no-verify-jwt
npx supabase functions deploy convite-oferta --no-verify-jwt
npx supabase functions deploy enviar-oferta-email --no-verify-jwt
npx supabase functions deploy enviar-push --no-verify-jwt
```

Secrets de e-mail (envio automático da oferta):

```powershell
npx supabase secrets set RESEND_API_KEY=re_xxxx --project-ref qdiocaeoevxhdsrtcahn
npx supabase secrets set EMAIL_FROM="Jemani <corridas@ofertas.shoppingdelrey.com>" --project-ref qdiocaeoevxhdsrtcahn
```

### Push nativo (FCM)

1. SQL: rode `supabase/migrations/20261119180000_device_push_tokens.sql` (ou `npx supabase db query --linked -f ...`).
2. Secrets (não commit):

```powershell
npx supabase secrets set FCM_SERVICE_ACCOUNT_JSON="$(Get-Content -Raw .\fcm-service-account.json)" --project-ref qdiocaeoevxhdsrtcahn
npx supabase secrets set PUSH_WEBHOOK_SECRET="gere-um-segredo-longo" --project-ref qdiocaeoevxhdsrtcahn
```

3. Deploy: `npx supabase functions deploy enviar-push --no-verify-jwt`
4. Disparo: trigger `jemani_enviar_push` + Vault `jemani_push_webhook_secret` (SQL em `20261119183000_trigger_enviar_push.sql`). Alternativa: Database Webhook INSERT → mesma URL com header `x-push-secret`.
5. APK local: coloque `android/app/google-services.json` (gitignored) com package `com.jemani.executivemobility` e rode `npm run android:apk`.
6. iOS (Mac): Xcode → Push Notifications capability + APNs no Firebase; o código do app já registra token.

Guia curto: [`docs/PUSH-NATIVO.md`](./PUSH-NATIVO.md).

### Preço no servidor / criar_viagem (obrigatório no SQL Editor)

No projeto `qdiocaeoevxhdsrtcahn`, abra **SQL Editor** e execute:

`supabase/migrations/20261119160000_criar_viagem_preco_servidor.sql`

(guia curto: `docs/CRIAR-VIAGEM-PRECO-SERVIDOR.sql`)

### Convite / Parceiros externos (obrigatório no SQL Editor)

No projeto `qdiocaeoevxhdsrtcahn`, abra **SQL Editor** e execute o arquivo:

`supabase/sql/aplicar_convite_parceiro_externo.sql`

Isso cria o status `parceiro_externo`, a tabela `trip_offer_invites` e as RPCs `consultar_convite_oferta` / `aceitar_convite_oferta` (com notificação aos admins no aceite).

Notas:

- `--no-verify-jwt` no gateway: a autenticação de usuário fica **dentro** da function (`exigirUsuario`). O webhook Stripe continua sem JWT de usuário (usa assinatura Stripe).
- Alternativa em lote (mesmas functions):

```powershell
npx supabase functions deploy stripe-criar-checkout --no-verify-jwt; `
npx supabase functions deploy stripe-verificar-sessao --no-verify-jwt; `
npx supabase functions deploy stripe-transferir-empresa --no-verify-jwt; `
npx supabase functions deploy stripe-connect-onboarding --no-verify-jwt; `
npx supabase functions deploy stripe-webhook --no-verify-jwt; `
npx supabase functions deploy criar-empresa --no-verify-jwt; `
npx supabase functions deploy places-proxy --no-verify-jwt
```

## 3) Secrets (já devem existir — só conferir)

No Dashboard → Edge Functions → Secrets:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `MAPBOX_ACCESS_TOKEN`
- `FCM_SERVICE_ACCOUNT_JSON` / `PUSH_WEBHOOK_SECRET` (push nativo)
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` (em geral o runtime já injeta)

Não cole secrets em chat, commit ou `.md`.

## 4) Vercel (web)

- Deploy automático do branch `main` → projeto **`jemani`** (`https://jemani.vercel.app`).
- Confira env vars **só** nesse projeto (Supabase, Stripe publishable, Mapbox, `VITE_DEMO_MODE`, etc.).
- Após push: `/robots.txt`, `/llms.txt` e `/ai-catalog.json` devem ser texto/JSON (não a landing HTML).

## 5) Depois do deploy

1. Login como **cliente** → reservar → pagar (Stripe teste).
2. Login como **empresa** → Connect / aceite (repasse).
3. Login como **admin** → cadastrar empresa (agora exige admin).
4. Autocomplete de endereço logado (places-proxy).

Se `401 Sessão de usuário obrigatória`: o app precisa estar com `VITE_DEMO_MODE=false` e sessão Auth real (não só store local).

### Automação de e-mails de Novas solicitações

A configuração de produção, a publicação das migrations e o diagnóstico de envio estão no [guia de e-mails de ofertas](./EMAILS-OFERTAS.md).

Aplique `supabase/migrations/20261119200000_offer_email_automation.sql` antes de publicar o frontend. A migration cria a configuração pausada e agenda a execução a cada minuto.

No Vault, configure `jemani_offer_email_endpoint` com a URL completa da Edge Function `automatizar-ofertas-email` no mesmo projeto. Gere um segredo exclusivo e use o mesmo valor em `jemani_offer_email_cron_secret` no Vault e em `OFFER_EMAIL_CRON_SECRET` nos secrets da Edge Function. A função também usa os secrets existentes do Resend.

Publique com `npx supabase functions deploy automatizar-ofertas-email --no-verify-jwt`. A função autentica o agendamento com seu segredo dedicado.

No painel **Admin → Novas solicitações → ⋯**, salve as cotas, o intervalo entre ofertas e a ordem de prioridade. A fila considera viagens pagas futuras sem empresa confirmada. Depois de um envio, aguarda o prazo da oferta antes de acionar a próxima empresa elegível. O padrão é 15 minutos. A ordem respeita as prioridades e, em seguida, a proximidade. Uma empresa que já recebeu a corrida fica fora das próximas etapas. Reiniciar as cotas abre um novo ciclo.

Para enviar ofertas aos parceiros, configure `EMAIL_FROM` com um remetente de um domínio verificado na conta Resend correspondente a `RESEND_API_KEY`. O endereço de teste `onboarding@resend.dev` é restrito e pode retornar HTTP 403 para destinatários externos.
