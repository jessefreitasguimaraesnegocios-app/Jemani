# Stripe — ambiente de teste (Jemani)

## Como funciona agora (padrão)

O pagamento de **teste** usa as **Edge Functions do Supabase**. Elas ficam ligadas na nuvem — **não precisa** rodar `npm run stripe:local` no dia a dia.

1. Cliente paga a plataforma via Stripe Checkout (`sk_test_...` / cartão `4242…`).
2. Após pagamento, a corrida é distribuída às empresas.
3. Quando a empresa aceita, se tiver `stripe_account_id`, a plataforma faz Transfer Connect.
4. A comissão da Jemani fica na conta da plataforma.

## Caminho rápido (recomendado)

1. Secrets no Supabase (uma vez):

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set APP_URL=https://jemani.vercel.app
```

2. Functions publicadas (uma vez / quando mudar código):

```bash
supabase functions deploy stripe-criar-checkout
supabase functions deploy stripe-verificar-sessao
supabase functions deploy stripe-webhook
supabase functions deploy stripe-connect-onboarding
supabase functions deploy stripe-transferir-empresa
```

3. No `.env` do Vite:

```env
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_STRIPE_ENABLED=true
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
# NÃO defina VITE_STRIPE_API_URL — assim o app usa o Supabase
```

4. `npm run dev` (ou o APK) e pague com `4242 4242 4242 4242`.

## Servidor local (opcional)

Só se quiser depurar sem bater nas functions:

1. `STRIPE_SECRET_KEY=sk_test_...` em `supabase/functions/.env`
2. No `.env`: `VITE_STRIPE_API_URL=http://127.0.0.1:8787`
3. `npm run stripe:local`
4. Lembre de **apagar** `VITE_STRIPE_API_URL` depois — no celular o `127.0.0.1` não funciona.

O APK **nunca** embute `VITE_STRIPE_API_URL` (o script `android:apk` zera essa variável).

## Cartões de teste

- Sucesso: `4242 4242 4242 4242`
- Data futura, CVC e CEP quaisquer

## Dashboard Stripe (teste)

1. Connect ativo no **modo teste**
2. Chaves **Test** (`pk_test_` / `sk_test_`)
3. Empresa: Perfil → Conectar Stripe (teste)

---

## ⚠️ ANTES DE PRODUÇÃO REAL — NÃO ESQUECER

Quando for ao ar de verdade (dinheiro real), faça esta lista:

1. **Trocar chaves Stripe** de `sk_test_` / `pk_test_` para **`sk_live_` / `pk_live_`**
   - Secret: `supabase secrets set STRIPE_SECRET_KEY=sk_live_...`
   - Frontend: `VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...` (Vercel + `.env` de build do APK)
2. **Webhook de produção** no Dashboard Stripe apontando para  
   `https://SEU_PROJETO.supabase.co/functions/v1/stripe-webhook`  
   e atualizar `STRIPE_WEBHOOK_SECRET=whsec_...` (o do endpoint live).
3. **`APP_URL`** = domínio real (ex.: `https://jemani.vercel.app` ou o domínio final).
4. **Republicar** as Edge Functions depois de mudar secrets.
5. **Connect em modo live** — empresas precisam completar onboarding de novo no live se só tinham conta de teste.
6. **Remover / não usar** `VITE_STRIPE_API_URL` e o `npm run stripe:local` em produção.
7. Revisar se `VITE_ALLOW_DEV_PAYMENT` está **off** no build de produção (o `android:apk` já força `false`).
8. Testar um pagamento live pequeno e um Transfer Connect antes de liberar clientes.

Detalhes extras: ver também `docs/STRIPE_PRODUCAO.md`.
