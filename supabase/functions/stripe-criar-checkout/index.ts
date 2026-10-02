import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { CORS, json } from '../_shared/cors.ts'
import { criarClienteStripe, valorEmCentavos } from '../_shared/stripe.ts'

/**
 * Cria Checkout Session (modo payment) na conta da plataforma.
 * O cliente paga a Jemani; o repasse Connect à empresa ocorre depois
 * (quando a empresa aceita / finaliza — ver stripe-transferir-empresa).
 */
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ erro: 'Método não permitido' }, 405)

  try {
    const body = await req.json()
    const viagemId = String(body.viagem_id ?? '').trim()
    const codigo = String(body.codigo ?? 'Jemani').trim()
    const amount = Number(body.amount)
    const platformFee = Number(body.platform_fee ?? 0)
    const companyAmount = Number(body.company_amount ?? 0)
    const appUrl = String(body.app_url ?? Deno.env.get('APP_URL') ?? 'http://localhost:5173').replace(
      /\/$/,
      '',
    )
    const emailCliente = body.email_cliente ? String(body.email_cliente).trim() : undefined

    if (!viagemId || !Number.isFinite(amount) || amount <= 0) {
      return json({ erro: 'viagem_id e amount válidos são obrigatórios' }, 400)
    }

    const stripe = criarClienteStripe()
    const centavos = valorEmCentavos(amount)

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: emailCliente,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: centavos,
            product_data: {
              name: `Viagem Jemani ${codigo}`,
              description: 'Transporte executivo — reserva Jemani',
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
        ambiente: 'teste',
      },
      payment_intent_data: {
        metadata: {
          viagem_id: viagemId,
          codigo,
        },
      },
    })

    if (!session.url) {
      return json({ erro: 'Stripe não retornou URL do Checkout' }, 500)
    }

    return json({
      session_id: session.id,
      url: session.url,
      modo: 'payment',
      connect: 'repasse_apos_aceite',
    })
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : 'Erro ao criar checkout'
    return json({ erro: mensagem }, 500)
  }
})
