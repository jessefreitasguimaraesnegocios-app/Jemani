# Segurança Jemani — auditoria e proteções

Documento gerado na auditoria de segurança. **Não contém secrets.**

## A. Proteções implementadas no código

- Edge Functions Stripe / empresa / places exigem **JWT de usuário** (não aceitam só anon key).
- `stripe-criar-checkout` lê `preco_total` / fees da viagem no banco.
- `stripe-verificar-sessao` confere valor e marca `paid` via service role.
- `stripe-transferir-empresa` valida dono da empresa, viagem paga, conta Connect e valor no banco; idempotência via `stripe_transfer_id`.
- `stripe-connect-onboarding` só dono da empresa ou admin.
- `criar-empresa` só admin + senha mínima 8.
- `places-proxy` autenticado + rate limit 60/min por usuário (Postgres).
- Cliente Stripe/API passa `access_token` da sessão.
- Autocomplete de endereço prefere o proxy autenticado.
- Simulação DEV de pagamento permanece desligada.

## B. Proteções no banco (migrations)

Arquivos:

- `supabase/migrations/20261030210000_empresas_leitura_cliente.sql` — frota/vehicles para cliente.
- `supabase/migrations/20261030220000_seguranca_critica.sql` — rate limit Edge, trigger anti `payment_status` forjado, RPC extensão hourly autenticada, marketplace sem PII, trava update de extensões, `distribution_insert` só admin.

**Aplicar no SQL Editor do projeto Jemani** (MCP local não tem acesso a esse projeto). Depois publicar as Edge Functions.

## C. Proteções na infraestrutura (não resolvem DDoS sozinhas)

| Camada | O que já ajuda | Limite |
|--------|----------------|--------|
| Vercel | Proteção DDoS de plataforma no plano | Não substitui WAF custom |
| Supabase | Auth, RLS, quotas | Abuse de anon key ainda gera custo |
| Stripe | Assinatura de webhook | Secrets só no server |

DDoS volumétrico exige borda (Cloudflare / WAF). Rate limit em Edge Function **não** é proteção absoluta.

## D. Configurações manuais pendentes (não alterar DNS/produção sem autorização)

### Supabase

1. Rodar migrations `20261030210000` e `20261030220000`.
2. Deploy das Edge Functions atualizadas (`stripe-*`, `criar-empresa`, `places-proxy`).
3. Confirmar secrets: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `MAPBOX_ACCESS_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY` (nunca no frontend).
4. Auth: rate limit de login no painel Auth (built-in), MFA para admins se disponível.
5. Desativar confirmação de e-mail frouxa em produção se aplicável.

### Vercel

1. `VITE_DEMO_MODE=false` em Production.
2. Não definir `VITE_ALLOW_DEV_PAYMENT`.
3. Remover `VITE_AVIATIONSTACK_KEY` do frontend quando possível (mover para Edge Function).
4. Restringir `VITE_MAPBOX_ACCESS_TOKEN` no painel Mapbox (URL/app) **ou** remover e usar só proxy.
5. Ativar Deployment Protection / WAF se o plano permitir.
6. Source maps: não expor em produção pública se configurável.

### Stripe

1. Webhook só com signing secret.
2. Restringir chaves de teste vs live.
3. Monitorar Transfers e Dispute.

### Mapbox

1. Token público: restrito por URL / bundle ID.
2. Token secreto só em `MAPBOX_ACCESS_TOKEN` (Supabase secrets).
3. Alertas de cota.

### Cloudflare (recomendado, opcional)

1. Proxy laranja no DNS (só com sua autorização).
2. Bot Fight / WAF managed rules.
3. Rate limit na borda para `/functions/v1/*` e Auth.

## E. Proteções que dependem de plano pago / recurso específico

- WAF avançado Vercel/Cloudflare.
- Redis global (hoje rate limit é Postgres `edge_rate_limits` — adequado, mas custos crescem com abuso).
- MFA obrigatório Supabase.
- Capacidade anti-DDoS de rede (upstream ISP/CDN).

## Riscos restantes (aceitos / próximos passos)

1. Preço da viagem ainda é gravado no INSERT pelo cliente — checkout usa o valor no DB; atacante pode criar viagem barata. **Próximo:** RPC `criar_viagem` recalculando preço no servidor.
2. Token Mapbox / AviationStack ainda podem existir no bundle se configurados.
3. CORS `*` nas Edge Functions — comum em mobile; mitiga-se com JWT + rate limit.
4. Polling 25s + Realtime — custo sob abuso de contas; monitorar.
5. Claim atômico de corrida / auth motorista cloud — gaps operacionais já conhecidos.
6. Extensão hourly ainda confirma no store local após Stripe; RPC no banco exige payment pago ou admin.

## Plano de contingência (resumo)

1. **Detectar:** picos 429/401/5xx no Supabase/Vercel; Transfers Stripe anômalos; crescimento `edge_rate_limits`.
2. **Mitigar:** baixar limites RPC; pausar função abusada no dashboard; modo Attack Cloudflare.
3. **Preservar:** não derrubar webhook Stripe; não pausar Auth globalmente.
4. **Recuperar:** reprocessar webhooks; auditar `trips.payment_status` vs Stripe.
5. **Revisar:** logs sem PII/tokens; post-mortem.

## Monitoramento sugerido (sem serviço pago novo)

- Supabase Dashboard: API requests, Auth, DB CPU.
- Vercel Analytics / logs de funções.
- Stripe Dashboard: failed payments, transfers.
- Alertas manuais: revisão diária de `edge_rate_limits` com contagem alta.
