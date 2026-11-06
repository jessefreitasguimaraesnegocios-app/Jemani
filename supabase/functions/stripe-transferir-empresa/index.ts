import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { CORS, json } from '../_shared/cors.ts'
import { exigirUsuario, ehAdmin, RespostaAuth } from '../_shared/auth.ts'
import { limitarTaxa, resposta429 } from '../_shared/rateLimit.ts'
import { criarClienteStripe, valorEmCentavos } from '../_shared/stripe.ts'

/**
 * Repasse Connect: só empresa dona da corrida (ou admin), viagem paga,
 * valor e conta lidos do banco.
 */
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ erro: 'Método não permitido' }, 405)

  try {
    const { user, perfil } = await exigirUsuario(req)
    const limite = await limitarTaxa({
      chave: `stripe-transferir-empresa:user:${user.id}`,
      limite: 20,
      janelaSegundos: 60,
    })
    if (!limite.ok) return resposta429(limite.retryAfterSegundos)

    const body = await req.json()
    const viagemId = String(body.viagem_id ?? '').trim()
    if (!viagemId) return json({ erro: 'viagem_id obrigatório' }, 400)

    const url = Deno.env.get('SUPABASE_URL')
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!url || !service) return json({ erro: 'Supabase admin não configurado' }, 500)
    const admin = createClient(url, service)

    const { data: viagem } = await admin
      .from('trips')
      .select('id,codigo,empresa_id,payment_status,valor_empresa,status')
      .eq('id', viagemId)
      .maybeSingle()

    if (!viagem) return json({ erro: 'Viagem não encontrada' }, 404)
    if (viagem.payment_status !== 'paid') {
      return json({ erro: 'Viagem ainda não paga' }, 409)
    }
    if (!viagem.empresa_id) {
      return json({ erro: 'Viagem sem empresa atribuída' }, 409)
    }

    const { data: empresa } = await admin
      .from('companies')
      .select('id,usuario_id,stripe_account_id')
      .eq('id', viagem.empresa_id)
      .maybeSingle()

    if (!empresa) return json({ erro: 'Empresa não encontrada' }, 404)

    const dono = empresa.usuario_id === user.id
    if (!ehAdmin(perfil) && !dono) {
      return json({ erro: 'Sem permissão para transferir' }, 403)
    }

    const stripeAccountId = String(empresa.stripe_account_id ?? '').trim()
    if (!stripeAccountId.startsWith('acct_')) {
      return json({ erro: 'Empresa sem conta Connect configurada' }, 400)
    }

    const amount = Number(viagem.valor_empresa)
    if (!Number.isFinite(amount) || amount <= 0) {
      return json({ erro: 'valor_empresa inválido' }, 400)
    }

    const { data: pagamentos } = await admin
      .from('payments')
      .select('id,stripe_transfer_id')
      .eq('booking_id', viagemId)
      .order('created_at', { ascending: false })
      .limit(1)
    const pagamento = pagamentos?.[0]

    if (pagamento?.stripe_transfer_id) {
      return json({
        transfer_id: pagamento.stripe_transfer_id,
        ja_transferido: true,
      })
    }

    const stripe = criarClienteStripe()
    const transfer = await stripe.transfers.create({
      amount: valorEmCentavos(amount),
      currency: 'usd',
      destination: stripeAccountId,
      transfer_group: viagemId,
      metadata: {
        viagem_id: viagemId,
        codigo: String(viagem.codigo ?? ''),
        solicitado_por: user.id,
      },
    })

    if (pagamento?.id) {
      await admin
        .from('payments')
        .update({
          stripe_transfer_id: transfer.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', pagamento.id)
    }

    return json({
      transfer_id: transfer.id,
      amount: transfer.amount,
      destination: transfer.destination,
    })
  } catch (err) {
    if (err instanceof RespostaAuth) return json({ erro: err.message }, err.status)
    const mensagem = err instanceof Error ? err.message : 'Erro ao transferir'
    return json({ erro: mensagem }, 500)
  }
})
