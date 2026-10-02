/**
 * Servidor local só para teste Stripe (não usar em produção).
 * Lê STRIPE_SECRET_KEY de supabase/functions/.env
 */
import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import Stripe from 'stripe'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '../supabase/functions/.env')

function carregarEnv(caminho) {
  if (!existsSync(caminho)) return {}
  const mapa = {}
  for (const linha of readFileSync(caminho, 'utf8').split(/\r?\n/)) {
    const t = linha.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    mapa[t.slice(0, i).trim()] = t.slice(i + 1).trim()
  }
  return mapa
}

const env = carregarEnv(envPath)
const secret = env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY
if (!secret?.startsWith('sk_')) {
  console.error('Defina STRIPE_SECRET_KEY em supabase/functions/.env')
  process.exit(1)
}

const stripe = new Stripe(secret)
const PORT = Number(process.env.STRIPE_LOCAL_PORT || 8787)

function json(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  })
  res.end(JSON.stringify(body))
}

async function lerBody(req) {
  const chunks = []
  for await (const c of req) chunks.push(c)
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    return json(res, 200, { ok: true })
  }
  if (req.method !== 'POST') {
    return json(res, 405, { erro: 'Método não permitido' })
  }

  const caminho = (req.url || '').split('?')[0]
  try {
    const body = await lerBody(req)

    if (caminho === '/stripe-criar-checkout') {
      const viagemId = String(body.viagem_id ?? '').trim()
      const codigo = String(body.codigo ?? 'Jemani').trim()
      const amount = Number(body.amount)
      const appUrl = String(body.app_url ?? env.APP_URL ?? 'http://localhost:5173').replace(/\/$/, '')
      if (!viagemId || !Number.isFinite(amount) || amount <= 0) {
        return json(res, 400, { erro: 'viagem_id e amount válidos são obrigatórios' })
      }
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: body.email_cliente ? String(body.email_cliente) : undefined,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'usd',
              unit_amount: Math.round(amount * 100),
              product_data: {
                name: `Viagem Jemani ${codigo}`,
                description: 'Transporte executivo — reserva Jemani (teste)',
              },
            },
          },
        ],
        success_url: `${appUrl}/app/viagens/${viagemId}?pagamento=ok&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/app/viagens/${viagemId}?pagamento=cancelado`,
        metadata: {
          viagem_id: viagemId,
          codigo,
          platform_fee: String(body.platform_fee ?? 0),
          company_amount: String(body.company_amount ?? 0),
          ambiente: 'teste_local',
        },
      })
      return json(res, 200, { session_id: session.id, url: session.url })
    }

    if (caminho === '/stripe-verificar-sessao') {
      const sessionId = String(body.session_id ?? '').trim()
      const viagemId = String(body.viagem_id ?? '').trim()
      if (!sessionId.startsWith('cs_')) {
        return json(res, 400, { erro: 'session_id inválido' })
      }
      const session = await stripe.checkout.sessions.retrieve(sessionId)
      if (viagemId && session.metadata?.viagem_id && session.metadata.viagem_id !== viagemId) {
        return json(res, 400, { erro: 'Sessão não corresponde a esta viagem' })
      }
      return json(res, 200, {
        pago: session.payment_status === 'paid' || session.status === 'complete',
        session_id: session.id,
        payment_intent:
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id ?? null,
        payment_status: session.payment_status,
        status: session.status,
        viagem_id: session.metadata?.viagem_id ?? null,
      })
    }

    if (caminho === '/stripe-connect-onboarding') {
      const email = String(body.email ?? '').trim().toLowerCase()
      const nome = String(body.nome ?? 'Empresa Jemani').trim()
      const appUrl = String(body.app_url ?? env.APP_URL ?? 'http://localhost:5173').replace(/\/$/, '')
      let accountId = body.stripe_account_id ? String(body.stripe_account_id).trim() : ''
      if (!accountId) {
        const conta = await stripe.accounts.create({
          type: 'express',
          country: 'US',
          email,
          capabilities: {
            transfers: { requested: true },
          },
          business_profile: { name: nome },
        })
        accountId = conta.id
      }
      const link = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${appUrl}/empresa/perfil?connect=refresh`,
        return_url: `${appUrl}/empresa/perfil?connect=ok`,
        type: 'account_onboarding',
      })
      return json(res, 200, {
        stripe_account_id: accountId,
        onboarding_url: link.url,
        modo: 'teste_local_express',
      })
    }

    if (caminho === '/stripe-transferir-empresa') {
      const stripeAccountId = String(body.stripe_account_id ?? '').trim()
      const amount = Number(body.amount)
      if (!stripeAccountId.startsWith('acct_') || !Number.isFinite(amount) || amount <= 0) {
        return json(res, 400, { erro: 'dados inválidos' })
      }
      const transfer = await stripe.transfers.create({
        amount: Math.round(amount * 100),
        currency: 'usd',
        destination: stripeAccountId,
        transfer_group: body.viagem_id ? String(body.viagem_id) : undefined,
        metadata: {
          viagem_id: String(body.viagem_id ?? ''),
          codigo: String(body.codigo ?? ''),
        },
      })
      return json(res, 200, { transfer_id: transfer.id })
    }

    return json(res, 404, { erro: 'Rota não encontrada' })
  } catch (err) {
    return json(res, 500, { erro: err instanceof Error ? err.message : 'Erro Stripe' })
  }
})

server.listen(PORT, () => {
  console.log(`Stripe local teste em http://127.0.0.1:${PORT}`)
})
