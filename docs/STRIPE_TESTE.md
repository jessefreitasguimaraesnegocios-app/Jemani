# Stripe Connect — ambiente de teste (Jemani)

## Fluxo

1. **Cliente paga** a plataforma via Stripe Checkout (`sk_test_...`).
2. Após pagamento, a corrida é distribuída às empresas (como hoje).
3. Quando a **empresa aceita**, se ela tiver `stripe_account_id`, a plataforma faz um **Transfer** Connect com o valor da empresa.
4. A comissão da Jemani permanece na conta da plataforma (já cobrada no Checkout).

Isso é o padrão marketplace com cobrança antes do matching (separate charge + transfer posterior).

## Caminho rápido (local)

1. Coloque `STRIPE_SECRET_KEY=sk_test_...` em `supabase/functions/.env` (gitignored).
2. No `.env` do Vite: `VITE_STRIPE_ENABLED=true`, `VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...`, `VITE_STRIPE_API_URL=http://127.0.0.1:8787`.
3. Em um terminal: `npm run stripe:local`
4. Em outro: `npm run dev`
5. Pague a viagem com cartão `4242 4242 4242 4242`.

## Variáveis

### Frontend (`.env`)

```env
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_STRIPE_ENABLED=true
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_STRIPE_API_URL=http://127.0.0.1:8787
VITE_ALLOW_DEV_PAYMENT=true
```

### Secrets Supabase (Edge Functions)

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set APP_URL=http://localhost:5173
```

`SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_URL` já existem no runtime das functions.

## Deploy das functions

```bash
supabase functions deploy stripe-criar-checkout
supabase functions deploy stripe-verificar-sessao
supabase functions deploy stripe-webhook
supabase functions deploy stripe-connect-onboarding
supabase functions deploy stripe-transferir-empresa
```

## Webhook local (opcional)

```bash
stripe listen --forward-to http://127.0.0.1:54321/functions/v1/stripe-webhook
```

No DEMO, a confirmação principal é o retorno do Checkout (`session_id` + `stripe-verificar-sessao`).

## Cartões de teste

- Sucesso: `4242 4242 4242 4242`
- Qualquer data futura, CVC qualquer, CEP qualquer

## Dashboard Stripe

1. Ative **Connect** no modo teste.
2. Use chaves **Test** (`pk_test_` / `sk_test_`).
3. Empresas: Perfil → **Conectar Stripe (teste)** (onboarding Express / Accounts v2 recipient).

## Migration

```bash
supabase db push
# ou aplique supabase/migrations/20261001210000_stripe_connect.sql
```
