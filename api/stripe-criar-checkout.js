import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

function origemValida(bruta) {
  try {
    const url = new URL(String(bruta || ''))
    const noComputador =
      url.protocol === 'http:' &&
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '::1')
    if (noComputador || (url.protocol === 'https:' && url.hostname !== 'localhost')) {
      return url.origin
    }
  } catch {
    /* site público */
  }
  return 'https://jemani.vercel.app'
}

function liberarCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type, apikey, x-client-info')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
}

export default async function handler(req, res) {
  liberarCors(res)
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  if (req.method !== 'POST') {
    res.status(405).json({ erro: 'Método não permitido' })
    return
  }

  const chave = process.env.STRIPE_SECRET_KEY || ''
  if (!chave.startsWith('sk_test_')) {
    res.status(503).json({ erro: 'Checkout de teste indisponível' })
    return
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
    const viagemId = String(body.viagem_id ?? '').trim()
    if (!viagemId) {
      res.status(400).json({ erro: 'viagem_id obrigatório' })
      return
    }

    let amount = Number(body.amount)
    let platformFee = Number(body.platform_fee ?? 0)
    let companyAmount = Number(body.company_amount ?? 0)
    let codigo = String(body.codigo ?? 'Jemani').trim()

    // Prefere preço do banco (evita underpay com amount enviado pelo cliente).
    const url =
      process.env.SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      'https://qdiocaeoevxhdsrtcahn.supabase.co'
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    if (service) {
      const admin = createClient(url, service)
      const { data: viagem } = await admin
        .from('trips')
        .select('codigo,preco_total,valor_plataforma,valor_empresa')
        .eq('id', viagemId)
        .maybeSingle()
      if (viagem) {
        amount = Number(viagem.preco_total)
        platformFee = Number(viagem.valor_plataforma ?? 0)
        companyAmount = Number(viagem.valor_empresa ?? 0)
        if (viagem.codigo) codigo = String(viagem.codigo)
      }
    }

    if (!Number.isFinite(amount) || amount <= 0 || amount > 200000) {
      res.status(400).json({ erro: 'viagem_id e amount válidos são obrigatórios' })
      return
    }

    const appUrl = origemValida(body.app_url)
    const stripe = new Stripe(chave)
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: body.email_cliente ? String(body.email_cliente).trim() : undefined,
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
        platform_fee: String(platformFee),
        company_amount: String(companyAmount),
        preco_total: String(amount),
        ambiente: 'teste',
      },
    })

    if (!session.url) {
      res.status(500).json({ erro: 'Stripe não retornou URL do Checkout' })
      return
    }

    res.status(200).json({
      session_id: session.id,
      url: session.url,
      amount,
    })
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : 'Erro ao criar checkout'
    res.status(500).json({ erro: mensagem })
  }
}
