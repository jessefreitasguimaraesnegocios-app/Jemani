import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { CORS, json } from '../_shared/cors.ts'
import { criarClienteStripe } from '../_shared/stripe.ts'

async function criarContaConnectV2(chave: string, email: string, nome: string) {
  const res = await fetch('https://api.stripe.com/v2/core/accounts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${chave}`,
      'Content-Type': 'application/json',
      'Stripe-Version': '2025-04-30.preview',
    },
    body: JSON.stringify({
      contact_email: email,
      display_name: nome,
      dashboard: 'express',
      defaults: {
        responsibilities: {
          fees_collector: 'application',
          losses_collector: 'application',
        },
      },
      identity: { country: 'us' },
      configuration: {
        recipient: {
          capabilities: {
            stripe_balance: {
              stripe_transfers: { requested: true },
            },
          },
        },
      },
      include: ['configuration.recipient', 'identity', 'requirements'],
    }),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data?.error?.message ?? data?.message ?? 'Falha ao criar conta Connect v2')
  }
  if (!data?.id) throw new Error('Conta Connect sem id')
  return String(data.id)
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ erro: 'Método não permitido' }, 405)

  try {
    const body = await req.json()
    const empresaId = String(body.empresa_id ?? '').trim()
    const email = String(body.email ?? '').trim().toLowerCase()
    const nome = String(body.nome ?? 'Empresa Jemani').trim()
    const contaExistente = body.stripe_account_id
      ? String(body.stripe_account_id).trim()
      : ''
    const appUrl = String(body.app_url ?? Deno.env.get('APP_URL') ?? 'http://localhost:5173').replace(
      /\/$/,
      '',
    )

    if (!empresaId || !email) {
      return json({ erro: 'empresa_id e email são obrigatórios' }, 400)
    }

    const chave = Deno.env.get('STRIPE_SECRET_KEY')
    if (!chave) return json({ erro: 'STRIPE_SECRET_KEY não configurada' }, 500)

    const stripe = criarClienteStripe()
    const accountId = contaExistente || (await criarContaConnectV2(chave, email, nome))

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${appUrl}/empresa/perfil?connect=refresh`,
      return_url: `${appUrl}/empresa/perfil?connect=ok`,
      type: 'account_onboarding',
    })

    const url = Deno.env.get('SUPABASE_URL')
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (url && service) {
      const admin = createClient(url, service)
      await admin.from('companies').update({ stripe_account_id: accountId }).eq('id', empresaId)
    }

    return json({
      stripe_account_id: accountId,
      onboarding_url: link.url,
      modo: 'teste_connect_recipient',
    })
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : 'Erro no onboarding Connect'
    return json({ erro: mensagem }, 500)
  }
})
