import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'

/**
 * Valida a sessão com o servidor (não confia só no JWT em cache).
 * Renova com refresh token quando o access token expirou.
 */
export async function obterSessaoAuthValida(): Promise<Session | null> {
  const db = supabase
  if (!db) return null

  const { data: local } = await db.auth.getSession()
  const atual = local.session

  // Confirma o access token no Auth (detecta JWT expirado/revogado).
  const { data: usuario, error: erroUsuario } = await db.auth.getUser()
  if (!erroUsuario && usuario.user && atual?.access_token) {
    return atual
  }

  // Tenta renovar com o refresh token persistido.
  const { data: renovada, error: erroRefresh } = await db.auth.refreshSession()
  if (!erroRefresh && renovada.session) {
    const checagem = await db.auth.getUser()
    if (!checagem.error && checagem.data.user) return renovada.session
  }

  return null
}

/** Garante JWT válido para consultas RLS e Edge Functions. */
export async function exigirSessaoAuthValida(): Promise<Session> {
  const sessao = await obterSessaoAuthValida()
  if (!sessao?.access_token) {
    throw new Error('Sessão expirada. Saia e entre de novo para continuar.')
  }
  return sessao
}

/**
 * Alinha a sessão Auth ao e-mail da conta local.
 * Se o JWT estiver inválido e houver senha, refaz o login.
 */
export async function assegurarSessaoParaEmail(
  email: string,
  senha?: string,
): Promise<boolean> {
  const db = supabase
  if (!db || !email) return false
  const emailLimpo = email.trim().toLowerCase()

  const valida = await obterSessaoAuthValida()
  if (valida?.user.email?.toLowerCase() === emailLimpo) return true

  if (senha) {
    const { data, error } = await db.auth.signInWithPassword({
      email: emailLimpo,
      password: senha,
    })
    return !error && Boolean(data.session)
  }

  // Sessão de outro usuário ou inválida sem senha para reentrar.
  if (valida && valida.user.email?.toLowerCase() !== emailLimpo) {
    await db.auth.signOut()
  }
  return false
}
