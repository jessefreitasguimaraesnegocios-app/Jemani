# Stripe — checklist de produção real (Jemani)

> Lembrete: hoje o app roda em **modo teste** via Edge Functions no Supabase.  
> Este arquivo é o guia para **não esquecer** o que mudar quando for dinheiro de verdade.

## Checklist

- [ ] Stripe Dashboard em **modo Live** (não Test)
- [ ] `STRIPE_SECRET_KEY=sk_live_...` nos secrets do Supabase
- [ ] `VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...` na Vercel e no build do APK
- [ ] Webhook live → `.../functions/v1/stripe-webhook` + novo `STRIPE_WEBHOOK_SECRET`
- [ ] `APP_URL` = URL pública real do app
- [ ] `supabase functions deploy` de todas as functions Stripe
- [ ] Connect Live ativo; empresas refazem onboarding se só tinham conta de teste
- [ ] Sem `VITE_STRIPE_API_URL` / sem `stripe:local` em produção
- [ ] `VITE_ALLOW_DEV_PAYMENT` desligado
- [ ] Pagamento live de teste + transfer para uma empresa parceira OK

## O que NÃO fazer

- Não deixar `sk_test_` / `pk_test_` no ar “só um pouquinho”
- Não apontar o APK para `127.0.0.1:8787`
- Não commitar secret keys no Git

## Referência do fluxo de teste

Ver `docs/STRIPE_TESTE.md`.
