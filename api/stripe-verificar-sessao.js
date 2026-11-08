import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

function liberarCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type, apikey, x-client-info')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
}

function distanciaKm(lat1, lng1, lat2, lng2) {
  const r = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return Math.round(r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 100) / 100
}

async function distribuirOfertasAposPagamento(admin, viagemId, motivo) {
  const { data: viagem, error: erroViagem } = await admin
    .from('trips')
    .select('id,categoria_id,origem_lat,origem_lng,payment_status,status,empresa_id,version')
    .eq('id', viagemId)
    .maybeSingle()

  if (erroViagem) throw new Error(erroViagem.message)
  if (!viagem) throw new Error('Viagem não encontrada')
  if (viagem.empresa_id) {
    return { ofertas: 0, status: String(viagem.status) }
  }

  const agora = new Date().toISOString()

  if (viagem.payment_status !== 'paid') {
    const { error } = await admin
      .from('trips')
      .update({
        status: 'paid',
        payment_status: 'paid',
        updated_at: agora,
        version: Number(viagem.version ?? 1) + 1,
      })
      .eq('id', viagemId)
    if (error) throw new Error(error.message)
  }

  const { data: empresas, error: erroEmpresas } = await admin.rpc('empresas_para_distribuicao', {
    p_categoria_id: viagem.categoria_id,
  })
  if (erroEmpresas) throw new Error(erroEmpresas.message)

  const origemLat = viagem.origem_lat != null ? Number(viagem.origem_lat) : NaN
  const origemLng = viagem.origem_lng != null ? Number(viagem.origem_lng) : NaN
  const lista = Array.isArray(empresas) ? empresas : []
  const ofertas = lista.map((empresa) => {
    const lat = empresa.latitude != null ? Number(empresa.latitude) : NaN
    const lng = empresa.longitude != null ? Number(empresa.longitude) : NaN
    const km =
      Number.isFinite(origemLat) &&
      Number.isFinite(origemLng) &&
      Number.isFinite(lat) &&
      Number.isFinite(lng)
        ? distanciaKm(origemLat, origemLng, lat, lng)
        : null
    return {
      viagem_id: viagemId,
      empresa_id: String(empresa.id),
      status: 'oferecida',
      motivo,
      distancia_km: km,
      created_at: agora,
    }
  })

  if (ofertas.length > 0) {
    const { error: erroOfertas } = await admin.from('trip_assignments').upsert(ofertas, {
      onConflict: 'viagem_id,empresa_id',
    })
    if (erroOfertas) throw new Error(erroOfertas.message)
  }

  const { data: atual } = await admin
    .from('trips')
    .select('version')
    .eq('id', viagemId)
    .maybeSingle()

  const { error: erroStatus } = await admin
    .from('trips')
    .update({
      status: 'aguardando_empresa',
      payment_status: 'paid',
      updated_at: agora,
      version: Number(atual?.version ?? viagem.version ?? 1) + 1,
    })
    .eq('id', viagemId)
  if (erroStatus) throw new Error(erroStatus.message)

  return { ofertas: ofertas.length, status: 'aguardando_empresa' }
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
    const paymentIntent =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id ?? null

    let ofertas = 0
    let statusViagem = null
    if (pago) {
      const url =
        process.env.SUPABASE_URL ||
        process.env.VITE_SUPABASE_URL ||
        'https://qdiocaeoevxhdsrtcahn.supabase.co'
      const service = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
      if (service) {
        const admin = createClient(url, service)
        const agora = new Date().toISOString()
        await admin
          .from('payments')
          .update({
            payment_id: paymentIntent ?? session.id,
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
            'stripe_verificar_sessao_vercel',
          )
          ofertas = dist.ofertas
          statusViagem = dist.status
        } catch (err) {
          console.warn('distribuicao falhou', err)
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
      } else {
        // Sem service role na Vercel: delega à Edge Function (tem o secret no Supabase).
        const anon = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
        const auth = req.headers.authorization || (anon ? `Bearer ${anon}` : '')
        if (anon) {
          try {
            const resp = await fetch(`${url}/functions/v1/stripe-verificar-sessao`, {
              method: 'POST',
              headers: {
                Authorization: auth,
                apikey: anon,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ session_id: sessionId, viagem_id: viagemId }),
            })
            const data = await resp.json().catch(() => ({}))
            if (resp.ok) {
              ofertas = Number(data.ofertas ?? 0)
              statusViagem = data.status_viagem ?? data.status ?? null
            }
          } catch (err) {
            console.warn('fallback edge stripe-verificar-sessao falhou', err)
          }
        }
      }
    }

    res.status(200).json({
      pago,
      session_id: session.id,
      payment_intent: paymentIntent,
      payment_status: session.payment_status,
      status: session.status,
      ofertas,
      status_viagem: statusViagem,
    })
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : 'Erro ao verificar sessão'
    res.status(500).json({ erro: mensagem })
  }
}
