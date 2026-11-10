import { supabase, supabaseConfigurado } from '@/lib/supabase'
import type { ConviteOferta } from '@/types'

export type RespostaConsultaConvite = {
  ok: boolean
  erro?: string
  situacao?: string
  convite_id?: string
  viagem_id?: string
  expires_at?: string
  accepted_at?: string
  empresa_nome?: string
  codigo?: string
  origem?: string
  destino?: string
  data_viagem?: string
  horario?: string
  valor_empresa?: number | null
  passageiros?: number
}

export async function gravarConviteNuvem(convite: ConviteOferta): Promise<boolean> {
  if (!supabaseConfigurado || !supabase) return false
  const { error } = await supabase.from('trip_offer_invites').upsert(
    {
      id: convite.id,
      viagem_id: convite.viagem_id,
      empresa_id: convite.empresa_id,
      token_hash: convite.token_hash,
      expires_at: convite.expires_at,
      accepted_at: convite.accepted_at ?? null,
      revoked_at: convite.revoked_at ?? null,
      created_at: convite.created_at,
    },
    { onConflict: 'id' },
  )
  if (error) {
    console.error('[convite] falha ao gravar trip_offer_invites', error.message)
    return false
  }
  return true
}

/** Revoga convites abertos da mesma corrida/empresa antes de emitir um novo token. */
export async function revogarConvitesAbertosNuvem(
  viagemId: string,
  empresaId: string,
  excetoId?: string,
): Promise<void> {
  if (!supabaseConfigurado || !supabase) return
  let consulta = supabase
    .from('trip_offer_invites')
    .update({ revoked_at: new Date().toISOString() })
    .eq('viagem_id', viagemId)
    .eq('empresa_id', empresaId)
    .is('accepted_at', null)
    .is('revoked_at', null)
  if (excetoId) consulta = consulta.neq('id', excetoId)
  await consulta
}

async function chamarEdgeConvite(
  acao: 'consultar' | 'aceitar',
  token: string,
): Promise<RespostaConsultaConvite | null> {
  const base = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (!base || !anon) return null
  try {
    const resposta = await fetch(`${base.replace(/\/$/, '')}/functions/v1/convite-oferta`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anon,
        Authorization: `Bearer ${anon}`,
      },
      body: JSON.stringify({ acao, token }),
    })
    if (!resposta.ok) return null
    return (await resposta.json()) as RespostaConsultaConvite
  } catch {
    return null
  }
}

export async function consultarConviteNuvem(token: string): Promise<RespostaConsultaConvite | null> {
  if (!supabaseConfigurado || !supabase) return null
  const { data, error } = await supabase.rpc('consultar_convite_oferta', { p_token: token })
  if (!error && data) return data as RespostaConsultaConvite
  return chamarEdgeConvite('consultar', token)
}

export async function aceitarConviteNuvem(token: string): Promise<RespostaConsultaConvite | null> {
  if (!supabaseConfigurado || !supabase) return null
  const { data, error } = await supabase.rpc('aceitar_convite_oferta', { p_token: token })
  if (!error && data) return data as RespostaConsultaConvite
  return chamarEdgeConvite('aceitar', token)
}
