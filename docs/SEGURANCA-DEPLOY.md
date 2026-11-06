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
```

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
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` (em geral o runtime já injeta)

Não cole secrets em chat, commit ou `.md`.

## 4) Depois do deploy

1. Login como **cliente** → reservar → pagar (Stripe teste).
2. Login como **empresa** → Connect / aceite (repasse).
3. Login como **admin** → cadastrar empresa (agora exige admin).
4. Autocomplete de endereço logado (places-proxy).

Se `401 Sessão de usuário obrigatória`: o app precisa estar com `VITE_DEMO_MODE=false` e sessão Auth real (não só store local).
