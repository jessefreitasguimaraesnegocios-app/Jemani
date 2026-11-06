import Stripe from 'stripe'

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
    const sessionId = String(body.session_id ?? '').trim()
    const viagemId = String(body.viagem_id ?? '').trim()
    if (!sessionId.startsWith('cs_')) {
      res.status(400).json({ erro: 'session_id inválido' })
      return
    }
    if (!viagemId) {
      res.status(400).json({ erro: 'viagem_id obrigatório' })
      return
    }

    const stripe = new Stripe(chave)
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    if (session.metadata?.viagem_id && session.metadata.viagem_id !== viagemId) {
      res.status(400).json({ erro: 'Sessão não corresponde a esta viagem' })
      return
    }

    const pago = session.payment_status === 'paid' || session.status === 'complete'
    res.status(200).json({
      pago,
      session_id: session.id,
      payment_intent:
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id ?? null,
      payment_status: session.payment_status,
      status: session.status,
    })
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : 'Erro ao verificar sessão'
    res.status(500).json({ erro: mensagem })
  }
}
