import { supabase, supabaseConfigurado } from '@/lib/supabase'
import type { ConviteOferta } from '@/types'

export type RespostaConsultaConvite = {
  ok: boolean
  erro?: string
  situacao?: string
  convite_id?: string
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
  return !error
}

export async function consultarConviteNuvem(token: string): Promise<RespostaConsultaConvite | null> {
  if (!supabaseConfigurado || !supabase) return null
  const { data, error } = await supabase.rpc('consultar_convite_oferta', { p_token: token })
  if (error || !data) return null
  return data as RespostaConsultaConvite
}

export async function aceitarConviteNuvem(token: string): Promise<RespostaConsultaConvite | null> {
  if (!supabaseConfigurado || !supabase) return null
  const { data, error } = await supabase.rpc('aceitar_convite_oferta', { p_token: token })
  if (error || !data) return null
  return data as RespostaConsultaConvite
}
