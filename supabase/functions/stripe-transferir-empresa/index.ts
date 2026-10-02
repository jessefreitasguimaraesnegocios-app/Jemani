import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { CORS, json } from '../_shared/cors.ts'
import { criarClienteStripe, valorEmCentavos } from '../_shared/stripe.ts'

/**
 * Transfere o valor da empresa (após aceite/serviço) para a conta Connect.
 * A plataforma já cobrou o cliente no Checkout; este passo faz o repasse.
 */
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ erro: 'Método não permitido' }, 405)

  try {
    const body = await req.json()
    const stripeAccountId = String(body.stripe_account_id ?? '').trim()
    const amount = Number(body.amount)
    const viagemId = String(body.viagem_id ?? '').trim()
    const codigo = String(body.codigo ?? '').trim()

    if (!stripeAccountId.startsWith('acct_')) {
      return json({ erro: 'stripe_account_id inválido' }, 400)
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return json({ erro: 'amount inválido' }, 400)
    }

    const stripe = criarClienteStripe()
    const transfer = await stripe.transfers.create({
      amount: valorEmCentavos(amount),
      currency: 'usd',
      destination: stripeAccountId,
      transfer_group: viagemId || undefined,
      metadata: {
        viagem_id: viagemId,
        codigo,
      },
    })

    return json({
      transfer_id: transfer.id,
      amount: transfer.amount,
      destination: transfer.destination,
    })
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : 'Erro ao transferir'
    return json({ erro: mensagem }, 500)
  }
})
