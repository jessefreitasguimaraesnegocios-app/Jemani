import { supabase } from '@/lib/supabase'

export type ResultadoExclusaoUsuario = {
  ok: boolean
  usuario_id: string
  email: string
  tipo: string
  viagens_apagadas: number
}

export async function excluirUsuarioAdmin(usuarioId: string): Promise<ResultadoExclusaoUsuario> {
  const db = supabase
  if (!db) throw new Error('Supabase não configurado')
  if (!usuarioId) throw new Error('Usuário inválido')

  const { data: sessao } = await db.auth.getSession()
  if (!sessao.session) {
    throw new Error('Faça login como admin na nuvem para excluir usuários.')
  }

  const { data, error } = await db.rpc('admin_excluir_usuario', {
    p_usuario_id: usuarioId,
  })

  if (error) {
    throw new Error(error.message || 'Falha ao excluir usuário')
  }

  const resultado = data as ResultadoExclusaoUsuario | null
  if (!resultado?.ok) {
    throw new Error('Falha ao excluir usuário')
  }

  return {
    ok: true,
    usuario_id: resultado.usuario_id,
    email: resultado.email,
    tipo: resultado.tipo,
    viagens_apagadas: Number(resultado.viagens_apagadas ?? 0),
  }
}
