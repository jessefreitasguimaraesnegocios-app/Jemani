import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { CORS, json } from '../_shared/cors.ts'
import { criarClienteStripe } from '../_shared/stripe.ts'

/** Confirma se a Checkout Session foi paga (retorno do cliente no success_url). */
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ erro: 'Método não permitido' }, 405)

  try {
    const body = await req.json()
    const sessionId = String(body.session_id ?? '').trim()
    const viagemId = String(body.viagem_id ?? '').trim()

    if (!sessionId.startsWith('cs_')) {
      return json({ erro: 'session_id inválido' }, 400)
    }

    const stripe = criarClienteStripe()
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (viagemId && session.metadata?.viagem_id && session.metadata.viagem_id !== viagemId) {
      return json({ erro: 'Sessão não corresponde a esta viagem' }, 400)
    }

    const pago =
      session.payment_status === 'paid' ||
      session.status === 'complete'

    return json({
      pago,
      session_id: session.id,
      payment_intent:
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id ?? null,
      payment_status: session.payment_status,
      status: session.status,
      amount_total: session.amount_total,
      currency: session.currency,
      viagem_id: session.metadata?.viagem_id ?? null,
      platform_fee: session.metadata?.platform_fee ?? null,
      company_amount: session.metadata?.company_amount ?? null,
    })
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : 'Erro ao verificar sessão'
    return json({ erro: mensagem }, 500)
  }
})
