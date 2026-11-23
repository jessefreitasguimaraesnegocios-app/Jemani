import { supabase } from '@/lib/supabase'

export type RegraAceiteAutomatico = {
  empresa_id: string
  liberada: boolean
  ligada: boolean
  valor_minimo_usd: number
  limite_diario: number | null
}

export async function buscarRegraAceite(empresaId: string) {
  if (!supabase) throw new Error('Supabase indisponível')
  const { data, error } = await supabase
    .from('company_auto_accept_settings')
    .select('empresa_id,liberada,ligada,valor_minimo_usd,limite_diario')
    .eq('empresa_id', empresaId)
    .maybeSingle<RegraAceiteAutomatico>()

  if (error) throw error
  return data
}

export async function liberarAceiteAutomatico(empresaId: string, liberada: boolean) {
  if (!supabase) throw new Error('Supabase indisponível')
  const { data, error } = await supabase.rpc('liberar_aceite_automatico', {
    p_empresa_id: empresaId,
    p_liberada: liberada,
  }).single<RegraAceiteAutomatico>()

  if (error) throw error
  return data
}

export async function salvarRegraAceite(regra: RegraAceiteAutomatico) {
  if (!supabase) throw new Error('Supabase indisponível')
  const { data, error } = await supabase.rpc('configurar_aceite_automatico', {
    p_empresa_id: regra.empresa_id,
    p_ligada: regra.ligada,
    p_valor_minimo_usd: regra.valor_minimo_usd,
    p_limite_diario: regra.limite_diario,
  }).single<RegraAceiteAutomatico>()

  if (error) throw error
  return data
}

export async function contarAceitesAutomaticosHoje(empresaId: string) {
  if (!supabase) throw new Error('Supabase indisponível')
  const { data, error } = await supabase.rpc('contar_aceites_automaticos_hoje', {
    p_empresa_id: empresaId,
  })
  if (error) throw error
  return Number(data ?? 0)
}
