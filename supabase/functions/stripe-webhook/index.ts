import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { CORS, json } from '../_shared/cors.ts'
import { criarClienteStripe } from '../_shared/stripe.ts'

/**
 * Webhook Stripe (teste/produção).
 * Em DEMO local o frontend confirma via stripe-verificar-sessao;
 * este webhook atualiza o Supabase quando VITE_DEMO_MODE=false.
 */
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ erro: 'Método não permitido' }, 405)

  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  if (!secret) return json({ erro: 'STRIPE_WEBHOOK_SECRET não configurada' }, 500)

  const assinatura = req.headers.get('stripe-signature')
  if (!assinatura) return json({ erro: 'Assinatura ausente' }, 400)

  const bruto = await req.text()
  const stripe = criarClienteStripe()

  let evento
  try {
    evento = await stripe.webhooks.constructEventAsync(bruto, assinatura, secret)
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : 'Assinatura inválida'
    return json({ erro: mensagem }, 400)
  }

  if (
    evento.type !== 'checkout.session.completed' &&
    evento.type !== 'checkout.session.async_payment_succeeded'
  ) {
    return json({ recebido: true, ignorado: evento.type })
  }

  const session = evento.data.object as {
    id: string
    payment_status?: string
    payment_intent?: string | { id?: string }
    metadata?: Record<string, string>
  }

  const viagemId = session.metadata?.viagem_id
  if (!viagemId) return json({ recebido: true, aviso: 'sem viagem_id' })

  const paymentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id ?? session.id

  const url = Deno.env.get('SUPABASE_URL')
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !service) {
    return json({ recebido: true, aviso: 'supabase admin ausente — só confirmação no cliente' })
  }

  const admin = createClient(url, service)
  const agora = new Date().toISOString()

  await admin
    .from('payments')
    .update({
      payment_id: paymentId,
      status: 'pago',
      provider: 'stripe',
      payment_method: 'stripe_checkout',
      updated_at: agora,
    })
    .eq('booking_id', viagemId)

  await admin
    .from('trips')
    .update({
      status: 'paid',
      payment_status: 'paid',
      updated_at: agora,
    })
    .eq('id', viagemId)

  return json({ recebido: true, viagem_id: viagemId, payment_id: paymentId })
})
