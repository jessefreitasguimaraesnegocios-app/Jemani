import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'

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

/**
 * Marca a viagem como aguardando_empresa e cria ofertas às empresas elegíveis.
 * Usa service role (admin client).
 */
export async function distribuirOfertasAposPagamento(
  admin: SupabaseClient,
  viagemId: string,
  motivo = 'pagamento_confirmado',
): Promise<{ ofertas: number; status: string }> {
  const { data: viagem, error: erroViagem } = await admin
    .from('trips')
    .select(
      'id,categoria_id,origem_lat,origem_lng,payment_status,status,empresa_id,version',
    )
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

  const { data: empresas, error: erroEmpresas } = await admin.rpc(
    'empresas_para_distribuicao',
    { p_categoria_id: viagem.categoria_id },
  )
  if (erroEmpresas) throw new Error(erroEmpresas.message)

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
