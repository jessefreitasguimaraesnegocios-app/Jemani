import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { CORS, json } from '../_shared/cors.ts'
import { exigirUsuario, ehAdmin, RespostaAuth } from '../_shared/auth.ts'
import { limitarTaxa, resposta429 } from '../_shared/rateLimit.ts'
import { criarClienteStripe, valorEmCentavos } from '../_shared/stripe.ts'

/**
 * Confirma extensão hourly após Stripe ou simulação:
 * cria payment (service role) + chama confirmar_extensao_hourly.
 */
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ erro: 'Método não permitido' }, 405)

  try {
    const { user, perfil, jwt } = await exigirUsuario(req)
    const limite = await limitarTaxa({
      chave: `confirmar-extensao:user:${user.id}`,
      limite: 40,
      janelaSegundos: 60,
    })
    if (!limite.ok) return resposta429(limite.retryAfterSegundos)

    let body: {
      extensao_id?: string
      provider?: string
      session_id?: string
    }
    try {
      body = await req.json()
    } catch {
      return json({ erro: 'JSON inválido' }, 400)
    }

    const extensaoId = String(body.extensao_id ?? '').trim()
    const provider = String(body.provider ?? '').trim()
    const sessionId = String(body.session_id ?? '').trim()
    if (!extensaoId) return json({ erro: 'extensao_id obrigatório' }, 400)

    const url = Deno.env.get('SUPABASE_URL')
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const anon = Deno.env.get('SUPABASE_ANON_KEY')
    if (!url || !service || !anon) return json({ erro: 'Supabase não configurado' }, 500)
    const admin = createClient(url, service)

    const { data: ext, error: extErro } = await admin
      .from('trip_extensions')
      .select('*')
      .eq('id', extensaoId)
      .maybeSingle()
    if (extErro) return json({ erro: extErro.message }, 400)
    if (!ext) return json({ erro: 'Extensão não encontrada' }, 404)
    if (ext.status === 'pago') return json({ extensao: ext, ja_confirmada: true })

    const { data: viagem, error: viagemErro } = await admin
      .from('trips')
      .select('id,cliente_id,preco_total')
      .eq('id', ext.viagem_id)
      .maybeSingle()
    if (viagemErro || !viagem) return json({ erro: 'Viagem não encontrada' }, 404)
    if (!ehAdmin(perfil) && viagem.cliente_id !== user.id) {
      return json({ erro: 'Sem permissão' }, 403)
    }

    const agora = new Date().toISOString()
    let paymentDbId: string | null = ext.payment_id ?? null
    let paymentExternal = `ext_${extensaoId.slice(0, 8)}_${Date.now()}`
    let metodo = 'card'
    let provedor = 'stripe'
    let checkoutSession: string | null = null

    if (provider === 'dev_simulado') {
      if (Deno.env.get('ALLOW_DEV_PAYMENT') !== 'true') {
        return json({ erro: 'Simulação de pagamento desligada no servidor' }, 403)
      }
      metodo = 'dev_simulado'
      provedor = 'dev_simulado'
      paymentExternal = `dev_ext_${extensaoId.slice(0, 8)}_${Date.now()}`
    } else if (provider === 'stripe' && sessionId.startsWith('cs_')) {
      const stripe = criarClienteStripe()
      const session = await stripe.checkout.sessions.retrieve(sessionId)
      const pago =
        session.payment_status === 'paid' || session.status === 'complete'
      if (!pago) return json({ erro: 'Pagamento Stripe ainda não confirmado', pago: false }, 409)
      const esperado = valorEmCentavos(Number(ext.preco_adicional))
      const pagoCentavos = Number(session.amount_total ?? 0)
      if (Math.abs(pagoCentavos - esperado) > 1) {
        return json({ erro: 'Valor pago não confere com a extensão' }, 409)
      }
      paymentExternal =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id ?? session.id
      checkoutSession = session.id
      metodo = 'stripe_checkout'
      provedor = 'stripe'
    } else {
      return json({ erro: 'Informe provider stripe (com session_id) ou dev_simulado' }, 400)
    }

    if (!paymentDbId) {
      const { data: pagamento, error: pagErro } = await admin
        .from('payments')
        .insert({
          booking_id: viagem.id,
          payment_id: paymentExternal,
          amount: Number(ext.preco_adicional),
          platform_fee: Number(ext.valor_plataforma),
          company_amount: Number(ext.valor_empresa),
          status: 'pago',
          payment_method: metodo,
          provider: provedor,
          stripe_checkout_session_id: checkoutSession,
          created_at: agora,
          updated_at: agora,
        })
        .select('id')
        .single()
      if (pagErro || !pagamento) {
        return json({ erro: pagErro?.message ?? 'Falha ao registrar pagamento' }, 400)
      }
      paymentDbId = pagamento.id
    }

    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    })
    const { data: confirmada, error: confErro } = await userClient.rpc('confirmar_extensao_hourly', {
      p_extensao_id: extensaoId,
      p_payment_id: paymentDbId,
    })
    if (confErro) return json({ erro: confErro.message }, 400)

    const { data: viagemAtual } = await admin
      .from('trips')
      .select('*')
      .eq('id', viagem.id)
      .maybeSingle()

    return json({
      extensao: confirmada,
      pagamento_id: paymentDbId,
      viagem: viagemAtual,
    })
  } catch (err) {
    if (err instanceof RespostaAuth) return json({ erro: err.message }, err.status)
    const mensagem = err instanceof Error ? err.message : 'Erro ao confirmar extensão'
    return json({ erro: mensagem }, 500)
  }
})
