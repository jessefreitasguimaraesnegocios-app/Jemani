import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Notificacao } from '@/types'

type LinhaNotificacao = {
  id: string
  usuario_id: string
  titulo: string
  mensagem: string
  tipo: string
  lida: boolean
  referencia_id: string | null
  created_at: string
}

function banco() {
  return supabase
}

function daLinha(linha: LinhaNotificacao): Notificacao {
  return {
    id: linha.id,
    usuario_id: linha.usuario_id,
    titulo: linha.titulo,
    mensagem: linha.mensagem,
    tipo: linha.tipo,
    lida: linha.lida,
    referencia_id: linha.referencia_id ?? undefined,
    created_at: linha.created_at,
  }
}

function paraLinha(item: Notificacao) {
  return {
    id: item.id,
    usuario_id: item.usuario_id,
    titulo: item.titulo,
    mensagem: item.mensagem,
    tipo: item.tipo,
    lida: item.lida,
    referencia_id: item.referencia_id ?? null,
    created_at: item.created_at,
  }
}

export async function listarNotificacoesNuvem() {
  const db = banco()
  if (!db) return []
  const { data, error } = await db
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)
  if (error || !data) return []
  return (data as LinhaNotificacao[]).map(daLinha)
}

export async function gravarNotificacaoNuvem(item: Notificacao) {
  const db = banco()
  if (!db) return false
  const sessao = await db.auth.getSession()
  const uid = sessao.data.session?.user.id
  if (!uid || uid !== item.usuario_id) return false
  const { error } = await db.from('notifications').upsert(paraLinha(item), { onConflict: 'id' })
  if (error) {
    console.warn('Falha ao gravar notificação na nuvem', error.message)
    return false
  }
  return true
}

export async function gravarNotificacoesNuvem(lista: Notificacao[]) {
  const db = banco()
  if (!db || lista.length === 0) return
  const sessao = await db.auth.getSession()
  const uid = sessao.data.session?.user.id
  if (!uid) return
  const proprias = lista.filter((item) => item.usuario_id === uid)
  if (proprias.length === 0) return
  const { error } = await db.from('notifications').upsert(proprias.map(paraLinha), { onConflict: 'id' })
  if (error) console.warn('Falha ao gravar notificações na nuvem', error.message)
}

export async function marcarNotificacaoLidaNuvem(id: string) {
  const db = banco()
  if (!db) return
  const { error } = await db.from('notifications').update({ lida: true }).eq('id', id)
  if (error) console.warn('Falha ao marcar notificação lida na nuvem', error.message)
}

export async function apagarNotificacoesNuvem(ids: string[]) {
  const db = banco()
  if (!db || ids.length === 0) return
  const sessao = await db.auth.getSession()
  const uid = sessao.data.session?.user.id
  if (!uid) return
  const { error } = await db.from('notifications').delete().in('id', ids).eq('usuario_id', uid)
  if (error) console.warn('Falha ao apagar notificações na nuvem', error.message)
}

export function assinarNotificacoesNuvem(aoMudar: (item: Notificacao) => void) {
  const db = banco()
  if (!db) return null
  const canal: RealtimeChannel = db
    .channel('notificacoes-jemani')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'notifications' },
      (payload) => {
        const linha = payload.new as LinhaNotificacao
        if (linha?.id) aoMudar(daLinha(linha))
      },
    )
    .subscribe()
  return canal
}
