import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { CORS, json } from '../_shared/cors.ts'
import { criarClienteStripe, valorEmCentavos } from '../_shared/stripe.ts'
import { distribuirOfertasAposPagamento } from '../_shared/distribuirOfertas.ts'

/**
 * Webhook Stripe — confirma pagamento só se valor bater com a viagem (ou metadata).
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
    amount_total?: number | null
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
  const { data: viagem } = await admin
    .from('trips')
    .select('id,preco_total,payment_status')
    .eq('id', viagemId)
    .maybeSingle()

  if (!viagem) return json({ recebido: true, aviso: 'viagem ausente' })

  const esperado = valorEmCentavos(Number(viagem.preco_total))
  const meta = session.metadata?.preco_total
    ? valorEmCentavos(Number(session.metadata.preco_total))
    : null
  const alvo = meta ?? esperado
  const pagoCentavos = Number(session.amount_total ?? 0)
  if (Math.abs(pagoCentavos - alvo) > 1) {
    console.warn('webhook valor divergente', { viagemId, pagoCentavos, alvo })
    return json({ recebido: true, erro: 'valor_divergente', viagem_id: viagemId }, 200)
  }

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

  // Sempre distribui ofertas (idempotente se já pagou / já tem empresa).
  let distribuicao: { ofertas: number; status: string }
  try {
    distribuicao = await distribuirOfertasAposPagamento(
      admin,
      viagemId,
      'stripe_webhook',
    )
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : 'falha_distribuicao'
    return json({
      recebido: true,
      viagem_id: viagemId,
      payment_id: paymentId,
      erro_distribuicao: mensagem,
    }, 200)
  }

  return json({
    recebido: true,
    viagem_id: viagemId,
    payment_id: paymentId,
    ja_pago: viagem.payment_status === 'paid',
    ofertas: distribuicao.ofertas,
    status: distribuicao.status,
  })
})
