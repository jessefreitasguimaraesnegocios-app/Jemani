import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { CORS, json } from '../_shared/cors.ts'
import { exigirUsuario, ehAdmin, RespostaAuth } from '../_shared/auth.ts'

/**
 * Marca a corrida como paga sem Stripe e abre ofertas às empresas elegíveis.
 * Só para teste (secret ALLOW_DEV_PAYMENT=true).
 */
function distanciaKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ erro: 'Método não permitido' }, 405)

  if (Deno.env.get('ALLOW_DEV_PAYMENT') !== 'true') {
    return json({ erro: 'Simulação de pagamento desligada no servidor' }, 403)
  }

  try {
    const { user, perfil } = await exigirUsuario(req)
    const body = await req.json()
    const viagemId = String(body.viagem_id ?? '').trim()
    if (!viagemId) return json({ erro: 'viagem_id obrigatório' }, 400)

    const url = Deno.env.get('SUPABASE_URL')
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!url || !service) return json({ erro: 'Supabase admin não configurado' }, 500)
    const admin = createClient(url, service)

    const { data: viagem, error: erroViagem } = await admin
      .from('trips')
      .select(
        'id,cliente_id,empresa_id,categoria_id,origem_lat,origem_lng,payment_status,status,version',
      )
      .eq('id', viagemId)
      .maybeSingle()

    if (erroViagem) return json({ erro: erroViagem.message }, 400)
    if (!viagem) return json({ erro: 'Viagem não encontrada' }, 404)
    if (!ehAdmin(perfil) && viagem.cliente_id !== user.id) {
      return json({ erro: 'Sem permissão' }, 403)
    }
    if (viagem.empresa_id) {
      return json({ pago: true, ja_atribuida: true, ofertas: 0 })
    }

    const agora = new Date().toISOString()
    const jaPago = viagem.payment_status === 'paid'

    if (!jaPago) {
      const { error } = await admin
        .from('trips')
        .update({
          status: 'paid',
          payment_status: 'paid',
          updated_at: agora,
          version: Number(viagem.version ?? 1) + 1,
        })
        .eq('id', viagemId)
      if (error) return json({ erro: error.message }, 400)
    }

    const { data: empresas, error: erroEmpresas } = await admin.rpc(
      'empresas_para_distribuicao',
      { p_categoria_id: viagem.categoria_id },
    )
    if (erroEmpresas) return json({ erro: erroEmpresas.message }, 400)

    const origemLat =
      viagem.origem_lat != null ? Number(viagem.origem_lat) : NaN
    const origemLng =
      viagem.origem_lng != null ? Number(viagem.origem_lng) : NaN
    const lista = Array.isArray(empresas) ? empresas : []
    const ofertas = lista.map((empresa: Record<string, unknown>) => {
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
        motivo: 'pagamento_simulado',
        distancia_km: km,
        created_at: agora,
      }
    })

    if (ofertas.length > 0) {
      const { error: erroOfertas } = await admin.from('trip_assignments').upsert(ofertas, {
        onConflict: 'viagem_id,empresa_id',
      })
      if (erroOfertas) return json({ erro: erroOfertas.message }, 400)
    }

    const { data: atual, error: erroAtual } = await admin
      .from('trips')
      .select('version')
      .eq('id', viagemId)
      .maybeSingle()
    if (erroAtual) return json({ erro: erroAtual.message }, 400)

    const { error: erroStatus } = await admin
      .from('trips')
      .update({
        status: 'aguardando_empresa',
        payment_status: 'paid',
        updated_at: agora,
        version: Number(atual?.version ?? viagem.version ?? 1) + 1,
      })
      .eq('id', viagemId)
    if (erroStatus) return json({ erro: erroStatus.message }, 400)

    return json({
      pago: true,
      ja_pago: jaPago,
      ofertas: ofertas.length,
      status: 'aguardando_empresa',
    })
  } catch (err) {
    if (err instanceof RespostaAuth) return json({ erro: err.message }, err.status)
    const mensagem = err instanceof Error ? err.message : 'Erro ao simular pagamento'
    return json({ erro: mensagem }, 500)
  }
})
