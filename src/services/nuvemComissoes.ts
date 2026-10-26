import { supabase } from '@/lib/supabase'
import type { Comissao } from '@/types'

export async function gravarComissaoNuvem(comissao: Comissao): Promise<void> {
  const db = supabase
  if (!db) return
  const { error } = await db.from('commissions').upsert(
    {
      id: comissao.id,
      viagem_id: comissao.viagem_id,
      empresa_id: comissao.empresa_id,
      valor_viagem: comissao.valor_viagem,
      percentual: comissao.percentual,
      valor_plataforma: comissao.valor_plataforma,
      valor_empresa: comissao.valor_empresa,
      created_at: comissao.created_at,
    },
    { onConflict: 'id' },
  )
  if (error) console.warn('Falha ao gravar comissão na nuvem', error.message)
}

export async function listarComissoesNuvem(): Promise<Comissao[]> {
  const db = supabase
  if (!db) return []
  const { data, error } = await db
    .from('commissions')
    .select(
      'id,viagem_id,empresa_id,valor_viagem,percentual,valor_plataforma,valor_empresa,created_at',
    )
    .order('created_at', { ascending: false })
    .limit(500)
  if (error || !data) {
    if (error) console.warn('Falha ao listar comissões', error.message)
    return []
  }
  return data.map((linha) => ({
    id: String(linha.id),
    viagem_id: String(linha.viagem_id),
    empresa_id: String(linha.empresa_id),
    valor_viagem: Number(linha.valor_viagem),
    percentual: Number(linha.percentual),
    valor_plataforma: Number(linha.valor_plataforma),
    valor_empresa: Number(linha.valor_empresa),
    created_at: String(linha.created_at),
  }))
}
