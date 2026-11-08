import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Avaliacao } from '@/types'

type LinhaAvaliacao = {
  id: string
  viagem_id: string
  cliente_id: string
  empresa_id: string
  motorista_id?: string | null
  nota_empresa: number
  nota_motorista: number
  nota_servico: number
  comentario?: string | null
  created_at: string
}

function banco() {
  return supabase
}

function daLinha(linha: LinhaAvaliacao): Avaliacao {
  return {
    id: linha.id,
    viagem_id: linha.viagem_id,
    cliente_id: linha.cliente_id,
    empresa_id: linha.empresa_id,
    motorista_id: linha.motorista_id ?? undefined,
    nota_empresa: Number(linha.nota_empresa),
    nota_motorista: Number(linha.nota_motorista),
    nota_servico: Number(linha.nota_servico),
    comentario: linha.comentario ?? undefined,
    created_at: linha.created_at,
  }
}

function paraLinha(item: Avaliacao) {
  return {
    id: item.id,
    viagem_id: item.viagem_id,
    cliente_id: item.cliente_id,
    empresa_id: item.empresa_id,
    motorista_id: item.motorista_id ?? null,
    nota_empresa: item.nota_empresa,
    nota_motorista: item.nota_motorista,
    nota_servico: item.nota_servico,
    comentario: item.comentario ?? null,
    created_at: item.created_at,
  }
}

export async function listarAvaliacoesNuvem(): Promise<Avaliacao[]> {
  const db = banco()
  if (!db) return []
  const { data, error } = await db
    .from('reviews')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(300)
  if (error || !data) {
    if (error) console.warn('Falha ao listar avaliações', error.message)
    return []
  }
  return (data as LinhaAvaliacao[]).map(daLinha)
}

export async function gravarAvaliacaoNuvem(item: Avaliacao): Promise<Avaliacao> {
  const db = banco()
  if (!db) throw new Error('Supabase não configurado')
  const { data, error } = await db
    .from('reviews')
    .upsert(paraLinha(item), { onConflict: 'viagem_id,cliente_id' })
    .select('*')
    .single()
  if (error || !data) {
    throw new Error(error?.message ?? 'Não foi possível salvar a avaliação no Supabase.')
  }
  return daLinha(data as LinhaAvaliacao)
}

export function assinarAvaliacoesNuvem(aoMudar: (item: Avaliacao) => void) {
  const db = banco()
  if (!db) return null
  const canal: RealtimeChannel = db
    .channel('avaliacoes-jemani')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'reviews' },
      (payload) => {
        if (payload.eventType === 'DELETE') return
        const linha = payload.new as LinhaAvaliacao
        if (linha?.id) aoMudar(daLinha(linha))
      },
    )
    .subscribe()
  return canal
}
