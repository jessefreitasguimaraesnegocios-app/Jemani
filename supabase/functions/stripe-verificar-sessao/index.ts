import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { CORS, json } from '../_shared/cors.ts'
import { exigirUsuario, RespostaAuth } from '../_shared/auth.ts'
import { limitarTaxa, resposta429 } from '../_shared/rateLimit.ts'
import { criarClienteStripe, valorEmCentavos } from '../_shared/stripe.ts'
import { distribuirOfertasAposPagamento } from '../_shared/distribuirOfertas.ts'

/** Confirma Checkout Session e marca a viagem como paga no banco (service role). */
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
    const sessionId = String(body.session_id ?? '').trim()
    const viagemId = String(body.viagem_id ?? '').trim()

    if (!sessionId.startsWith('cs_')) {
      return json({ erro: 'session_id inválido' }, 400)
    }
    if (!viagemId) return json({ erro: 'viagem_id obrigatório' }, 400)

    const limite = await limitarTaxa({
      chave: `stripe-verificar-sessao:${userId ?? sessionId}`,
      limite: 30,
      janelaSegundos: 60,
    })
    if (!limite.ok) return resposta429(limite.retryAfterSegundos)

    const url = Deno.env.get('SUPABASE_URL')
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const admin = url && service ? createClient(url, service) : null

    const { data: viagem } = admin
      ? await admin
          .from('trips')
          .select('id,cliente_id,preco_total,payment_status')
          .eq('id', viagemId)
          .maybeSingle()
      : { data: null }

    if (viagem && userId && !ehPerfilAdmin && viagem.cliente_id !== userId) {
      return json({ erro: 'Sem permissão' }, 403)
    }
    if (!viagem && !modoTeste) return json({ erro: 'Viagem não encontrada' }, 404)

    const stripe = criarClienteStripe()
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.metadata?.viagem_id && session.metadata.viagem_id !== viagemId) {
      return json({ erro: 'Sessão não corresponde a esta viagem' }, 400)
    }

    const pago =
      session.payment_status === 'paid' || session.status === 'complete'

    const pagoCentavos = Number(session.amount_total ?? 0)
    const metaPreco = session.metadata?.preco_total
      ? valorEmCentavos(Number(session.metadata.preco_total))
      : null
    const esperadoCentavos = viagem ? valorEmCentavos(Number(viagem.preco_total)) : null
    const alvo = metaPreco ?? esperadoCentavos
    const valorOk = !pago || alvo == null || Math.abs(pagoCentavos - alvo) <= 1

    if (pago && !valorOk) {
      return json({
        erro: 'Valor pago não confere com a viagem',
        pago: false,
      }, 409)
    }

    let ofertas = 0
    let statusViagem: string | null = viagem?.payment_status ?? null
    if (pago && valorOk && admin && viagem) {
      const agora = new Date().toISOString()
      const paymentId =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id ?? session.id

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

      try {
        const dist = await distribuirOfertasAposPagamento(
          admin,
          viagemId,
          'stripe_verificar_sessao',
        )
        ofertas = dist.ofertas
        statusViagem = dist.status
      } catch (err) {
        console.warn('distribuicao falhou', err)
        if (viagem.payment_status !== 'paid') {
          await admin
            .from('trips')
            .update({
              status: 'paid',
              payment_status: 'paid',
              updated_at: agora,
            })
            .eq('id', viagemId)
          statusViagem = 'paid'
        }
      }
    }

    return json({
      pago: pago && valorOk,
      session_id: session.id,
      payment_intent:
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id ?? null,
      payment_status: session.payment_status,
      status: session.status,
      status_viagem: statusViagem,
      ofertas,
      amount_total: session.amount_total,
      currency: session.currency,
      viagem_id: session.metadata?.viagem_id ?? null,
      platform_fee: session.metadata?.platform_fee ?? null,
      company_amount: session.metadata?.company_amount ?? null,
    })
  } catch (err) {
    if (err instanceof RespostaAuth) return json({ erro: err.message }, err.status)
    const mensagem = err instanceof Error ? err.message : 'Erro ao verificar sessão'
    return json({ erro: mensagem }, 500)
  }
})
