import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { CORS, json } from '../_shared/cors.ts'
import { exigirUsuario, RespostaAuth } from '../_shared/auth.ts'
import { limitarTaxa, resposta429 } from '../_shared/rateLimit.ts'
import { criarClienteStripe, valorEmCentavos } from '../_shared/stripe.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

function urlRetorno(bruta: string) {
  try {
    const url = new URL(bruta)
    const noComputador =
      url.protocol === 'http:' &&
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '::1')
    if (noComputador || (url.protocol === 'https:' && url.hostname !== 'localhost')) {
      return url.origin
    }
  } catch {
    /* segue para o site público */
  }
  return 'https://jemani.vercel.app'
}

/**
 * Cria Checkout Session com valor lido da viagem no banco (não confia no amount do cliente).
 */
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ erro: 'Método não permitido' }, 405)

  try {
    const chaveStripe = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
    const modoTeste = chaveStripe.startsWith('sk_test_')

    let userId: string | null = null
    let ehPerfilAdmin = false
    try {
      const auth = await exigirUsuario(req)
      userId = auth.user.id
      ehPerfilAdmin = auth.perfil.tipo === 'admin'
    } catch (err) {
      if (!modoTeste) {
        if (err instanceof RespostaAuth) return json({ erro: err.message }, err.status)
        return json({ erro: 'Não autenticado' }, 401)
      }
    }

    const body = await req.json()
    const viagemId = String(body.viagem_id ?? '').trim()
    if (!viagemId) return json({ erro: 'viagem_id obrigatório' }, 400)

    const limite = await limitarTaxa({
      chave: `stripe-criar-checkout:${userId ?? viagemId}`,
      limite: 10,
      janelaSegundos: 60,
    })
    if (!limite.ok) return resposta429(limite.retryAfterSegundos)

    const url = Deno.env.get('SUPABASE_URL')
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const admin = url && service ? createClient(url, service) : null

    const { data: viagem } = admin
      ? await admin
          .from('trips')
          .select(
            'id,codigo,cliente_id,preco_total,valor_plataforma,valor_empresa,payment_status,status',
          )
          .eq('id', viagemId)
          .maybeSingle()
      : { data: null }

    if (viagem) {
      if (userId && !ehPerfilAdmin && viagem.cliente_id !== userId) {
        return json({ erro: 'Sem permissão para pagar esta viagem' }, 403)
      }
      if (viagem.payment_status === 'paid') {
        return json({ erro: 'Viagem já paga' }, 409)
      }
    } else if (!modoTeste) {
      return json({ erro: 'Viagem não encontrada' }, 404)
    }

    const amount = viagem ? Number(viagem.preco_total) : Number(body.amount)
    const platformFee = viagem
      ? Number(viagem.valor_plataforma ?? 0)
      : Number(body.platform_fee ?? 0)
    const companyAmount = viagem
      ? Number(viagem.valor_empresa ?? 0)
      : Number(body.company_amount ?? 0)
    if (!Number.isFinite(amount) || amount <= 0) {
      return json({ erro: 'Preço da viagem inválido' }, 400)
    }

    const codigo = String(viagem?.codigo ?? body.codigo ?? 'Jemani').trim()
    const appUrl = urlRetorno(
      String(body.app_url ?? Deno.env.get('APP_URL') ?? 'http://localhost:5173'),
    )
    const emailCliente = body.email_cliente ? String(body.email_cliente).trim() : undefined

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
        preco_total: String(amount),
        cliente_id: userId ?? '',
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
      amount,
    })
  } catch (err) {
    if (err instanceof RespostaAuth) return json({ erro: err.message }, err.status)
    const mensagem = err instanceof Error ? err.message : 'Erro ao criar checkout'
    return json({ erro: mensagem }, 500)
  }
})
