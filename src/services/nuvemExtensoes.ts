import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { ExtensaoViagem } from '@/types'

type LinhaExtensao = {
  id: string
  viagem_id: string
  minutos: number
  preco_adicional: number | string
  valor_plataforma: number | string
  valor_empresa: number | string
  payment_id?: string | null
  status: ExtensaoViagem['status']
  idempotency_key: string
  fim_anterior?: string | null
  fim_novo?: string | null
  solicitado_por?: string | null
  motivo_recusa?: string | null
  created_at: string
  confirmed_at?: string | null
}

function banco() {
  return supabase
}

function daLinha(linha: LinhaExtensao): ExtensaoViagem {
  return {
    id: linha.id,
    viagem_id: linha.viagem_id,
    minutos: Number(linha.minutos),
    preco_adicional: Number(linha.preco_adicional),
    valor_plataforma: Number(linha.valor_plataforma),
    valor_empresa: Number(linha.valor_empresa),
    payment_id: linha.payment_id ?? undefined,
    status: linha.status,
    idempotency_key: linha.idempotency_key,
    fim_anterior: linha.fim_anterior ?? undefined,
    fim_novo: linha.fim_novo ?? undefined,
    solicitado_por: linha.solicitado_por ?? undefined,
    motivo_recusa: linha.motivo_recusa ?? undefined,
    created_at: linha.created_at,
    confirmed_at: linha.confirmed_at ?? undefined,
  }
}

function paraLinha(item: ExtensaoViagem) {
  return {
    id: item.id,
    viagem_id: item.viagem_id,
    minutos: item.minutos,
    preco_adicional: item.preco_adicional,
    valor_plataforma: item.valor_plataforma,
    valor_empresa: item.valor_empresa,
    payment_id: item.payment_id ?? null,
    status: item.status,
    idempotency_key: item.idempotency_key,
    fim_anterior: item.fim_anterior ?? null,
    fim_novo: item.fim_novo ?? null,
    solicitado_por: item.solicitado_por ?? null,
    motivo_recusa: item.motivo_recusa ?? null,
    created_at: item.created_at,
    confirmed_at: item.confirmed_at ?? null,
  }
}

export async function listarExtensoesNuvem(): Promise<ExtensaoViagem[]> {
  const db = banco()
  if (!db) return []
  const { data, error } = await db
    .from('trip_extensions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(300)
  if (error || !data) {
    if (error) console.warn('Falha ao listar extensões', error.message)
    return []
  }
  return (data as LinhaExtensao[]).map(daLinha)
}

export async function gravarExtensaoNuvem(item: ExtensaoViagem): Promise<ExtensaoViagem> {
  const db = banco()
  if (!db) throw new Error('Supabase não configurado')
  // Cliente só pode INSERT (update de status pago é via RPC/edge).
  const { data, error } = await db
    .from('trip_extensions')
    .insert(paraLinha({ ...item, status: 'pendente', payment_id: undefined, confirmed_at: undefined }))
    .select('*')
    .single()
  if (!error && data) return daLinha(data as LinhaExtensao)

  // Idempotência: já existe a mesma chave.
  const { data: existente } = await db
    .from('trip_extensions')
    .select('*')
    .eq('viagem_id', item.viagem_id)
    .eq('idempotency_key', item.idempotency_key)
    .maybeSingle()
  if (existente) return daLinha(existente as LinhaExtensao)

  throw new Error(error?.message ?? 'Não foi possível salvar a extensão no Supabase.')
}

export async function confirmarExtensaoNaNuvem(dados: {
  extensaoId: string
  provider: 'stripe' | 'dev_simulado'
  sessionId?: string
}): Promise<{ extensao: ExtensaoViagem; viagem?: Record<string, unknown> }> {
  const db = banco()
  if (!db) throw new Error('Supabase não configurado')
  const base = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (!base || !anon) throw new Error('Supabase não configurado')

  const sessao = (await db.auth.getSession()).data.session
  if (!sessao?.access_token) throw new Error('Faça login novamente para confirmar a extensão.')

  const resp = await fetch(`${base.replace(/\/$/, '')}/functions/v1/confirmar-extensao`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessao.access_token}`,
      apikey: anon,
    },
    body: JSON.stringify({
      extensao_id: dados.extensaoId,
      provider: dados.provider,
      session_id: dados.sessionId,
    }),
  })
  const data = (await resp.json()) as {
    extensao?: LinhaExtensao
    viagem?: Record<string, unknown>
    erro?: string
  }
  if (!resp.ok || !data.extensao) {
    throw new Error(data.erro ?? `Falha ao confirmar extensão (${resp.status})`)
  }
  return { extensao: daLinha(data.extensao), viagem: data.viagem }
}

export function assinarExtensoesNuvem(aoMudar: (item: ExtensaoViagem) => void) {
  const db = banco()
  if (!db) return null
  const canal: RealtimeChannel = db
    .channel('extensoes-jemani')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'trip_extensions' },
      (payload) => {
        if (payload.eventType === 'DELETE') return
        const linha = payload.new as LinhaExtensao
        if (linha?.id) aoMudar(daLinha(linha))
      },
    )
    .subscribe()
  return canal
}
