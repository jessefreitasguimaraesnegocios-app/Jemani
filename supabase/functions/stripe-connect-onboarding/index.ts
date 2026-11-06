import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { CORS, json } from '../_shared/cors.ts'
import { exigirUsuario, ehAdmin, RespostaAuth } from '../_shared/auth.ts'
import { limitarTaxa, resposta429 } from '../_shared/rateLimit.ts'
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
    const { user, perfil } = await exigirUsuario(req)
    const limite = await limitarTaxa({
      chave: `stripe-connect-onboarding:user:${user.id}`,
      limite: 5,
      janelaSegundos: 300,
    })
    if (!limite.ok) return resposta429(limite.retryAfterSegundos)

    const body = await req.json()
    const empresaId = String(body.empresa_id ?? '').trim()
    const appUrl = String(body.app_url ?? Deno.env.get('APP_URL') ?? 'http://localhost:5173').replace(
      /\/$/,
      '',
    )

    if (!empresaId) return json({ erro: 'empresa_id obrigatório' }, 400)

    const url = Deno.env.get('SUPABASE_URL')
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const chave = Deno.env.get('STRIPE_SECRET_KEY')
    if (!url || !service) return json({ erro: 'Supabase admin não configurado' }, 500)
    if (!chave) return json({ erro: 'STRIPE_SECRET_KEY não configurada' }, 500)

    const admin = createClient(url, service)
    const { data: empresa } = await admin
      .from('companies')
      .select('id,usuario_id,email,nome_comercial,stripe_account_id')
      .eq('id', empresaId)
      .maybeSingle()

    if (!empresa) return json({ erro: 'Empresa não encontrada' }, 404)
    if (!ehAdmin(perfil) && empresa.usuario_id !== user.id) {
      return json({ erro: 'Sem permissão para esta empresa' }, 403)
    }

    const email = String(empresa.email ?? body.email ?? '').trim().toLowerCase()
    const nome = String(empresa.nome_comercial ?? body.nome ?? 'Empresa Jemani').trim()
    if (!email) return json({ erro: 'Empresa sem e-mail' }, 400)

    const stripe = criarClienteStripe()
    const accountId =
      String(empresa.stripe_account_id ?? '').trim() ||
      (await criarContaConnectV2(chave, email, nome))

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${appUrl}/empresa/perfil?connect=refresh`,
      return_url: `${appUrl}/empresa/perfil?connect=ok`,
      type: 'account_onboarding',
    })

    await admin.from('companies').update({ stripe_account_id: accountId }).eq('id', empresaId)

    return json({
      stripe_account_id: accountId,
      onboarding_url: link.url,
      modo: 'teste_connect_recipient',
    })
  } catch (err) {
    if (err instanceof RespostaAuth) return json({ erro: err.message }, err.status)
    const mensagem = err instanceof Error ? err.message : 'Erro no onboarding Connect'
    return json({ erro: mensagem }, 500)
  }
})
