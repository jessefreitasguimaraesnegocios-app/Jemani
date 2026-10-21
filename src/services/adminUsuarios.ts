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
    const texto = (error.message || '').toLowerCase()
    // Fantasma no aparelho (seed/localStorage) sem linha em profiles/auth.
    if (texto.includes('encontrado') || texto.includes('not found')) {
      return {
        ok: true,
        usuario_id: usuarioId,
        email: '',
        tipo: 'cliente',
        viagens_apagadas: 0,
      }
    }
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

export type ResultadoExclusaoEmpresa = {
  ok: boolean
  empresa_id: string
  nome_comercial: string
  email: string
  usuario_id?: string | null
}

export async function excluirEmpresaAdmin(empresaId: string): Promise<ResultadoExclusaoEmpresa> {
  const db = supabase
  if (!db) throw new Error('Supabase não configurado')
  if (!empresaId) throw new Error('Empresa inválida')

  const { data: sessao } = await db.auth.getSession()
  if (!sessao.session) {
    throw new Error('Faça login como admin na nuvem para excluir empresas.')
  }

  const { data, error } = await db.rpc('admin_excluir_empresa', {
    p_empresa_id: empresaId,
  })

  if (error) {
    const texto = (error.message || '').toLowerCase()
    if (texto.includes('encontrado') || texto.includes('not found')) {
      return {
        ok: true,
        empresa_id: empresaId,
        nome_comercial: '',
        email: '',
        usuario_id: null,
      }
    }
    throw new Error(error.message || 'Falha ao excluir empresa')
  }

  const resultado = data as ResultadoExclusaoEmpresa | null
  if (!resultado?.ok) {
    throw new Error('Falha ao excluir empresa')
  }

  return {
    ok: true,
    empresa_id: resultado.empresa_id,
    nome_comercial: resultado.nome_comercial,
    email: resultado.email,
    usuario_id: resultado.usuario_id,
  }
}
