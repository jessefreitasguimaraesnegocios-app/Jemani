import { supabase } from '@/lib/supabase'
import type { Motorista, Perfil } from '@/types'

function perfilDaLinha(linha: {
  id: string
  email: string
  nome: string
  telefone?: string | null
  tipo: Perfil['tipo']
  avatar_url?: string | null
  ativo: boolean
  created_at: string
  updated_at: string
}): Perfil {
  return {
    id: linha.id,
    email: linha.email,
    nome: linha.nome,
    telefone: linha.telefone ?? undefined,
    tipo: linha.tipo,
    avatar_url: linha.avatar_url ?? undefined,
    ativo: linha.ativo,
    created_at: linha.created_at,
    updated_at: linha.updated_at,
  }
}

function motoristaDaLinha(linha: Motorista): Motorista {
  return {
    ...linha,
    telefone: linha.telefone ?? '',
    cnh: linha.cnh ?? '',
    categoria_cnh: linha.categoria_cnh ?? 'B',
    experiencia_anos: Number(linha.experiencia_anos ?? 0),
    disponivel: linha.disponivel ?? true,
    avaliacao_media: Number(linha.avaliacao_media ?? 5),
    foto_url: linha.foto_url ?? undefined,
  }
}

export async function buscarPerfisNuvem(ids: string[]): Promise<Perfil[]> {
  const db = supabase
  const unicos = [...new Set(ids.filter(Boolean))]
  if (!db || unicos.length === 0) return []
  const { data, error } = await db.from('profiles').select('*').in('id', unicos)
  if (error || !data) return []
  return data.map((linha) => perfilDaLinha(linha as Perfil))
}

export async function buscarClientesNuvem(): Promise<Perfil[]> {
  const db = supabase
  if (!db) return []
  const { data, error } = await db.from('profiles').select('*').eq('tipo', 'cliente')
  if (error || !data) return []
  return data.map((linha) => perfilDaLinha(linha as Perfil))
}

export async function buscarMotoristasNuvem(opcoes?: {
  empresaId?: string
  ids?: string[]
}): Promise<Motorista[]> {
  const db = supabase
  if (!db) return []
  let consulta = db.from('drivers').select('*')
  if (opcoes?.empresaId) consulta = consulta.eq('empresa_id', opcoes.empresaId)
  if (opcoes?.ids?.length) consulta = consulta.in('id', [...new Set(opcoes.ids)])
  const { data, error } = await consulta
  if (error || !data) return []
  return data.map((linha) => motoristaDaLinha(linha as Motorista))
}

export async function gravarFotoMotoristaNuvem(
  motoristaId: string,
  fotoUrl?: string | null,
): Promise<boolean> {
  const db = supabase
  if (!db || !motoristaId) return false
  const { error } = await db
    .from('drivers')
    .update({
      foto_url: fotoUrl?.trim() ? fotoUrl : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', motoristaId)
  return !error
}

export async function refrescarMeuPerfilNuvem(usuarioId: string): Promise<Perfil | null> {
  const lista = await buscarPerfisNuvem([usuarioId])
  return lista[0] ?? null
}
