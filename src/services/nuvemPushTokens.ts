import { Capacitor } from '@capacitor/core'
import { supabase } from '@/lib/supabase'

export type PlataformaPush = 'android' | 'ios' | 'web'

export function plataformaPushAtual(): PlataformaPush {
  const plataforma = Capacitor.getPlatform()
  if (plataforma === 'ios') return 'ios'
  if (plataforma === 'android') return 'android'
  return 'web'
}

export async function registrarTokenPushNuvem(token: string) {
  const db = supabase
  if (!db || !token.trim()) return false
  const sessao = await db.auth.getSession()
  const uid = sessao.data.session?.user.id
  if (!uid) return false

  const { error } = await db.from('device_push_tokens').upsert(
    {
      usuario_id: uid,
      token: token.trim(),
      plataforma: plataformaPushAtual(),
      ativo: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'usuario_id,token' },
  )
  if (error) {
    console.warn('Falha ao registrar token push', error.message)
    return false
  }
  return true
}

export async function desativarTokensPushNuvem(tokenAtual?: string | null) {
  const db = supabase
  if (!db) return
  const sessao = await db.auth.getSession()
  const uid = sessao.data.session?.user.id
  if (!uid) return

  let consulta = db
    .from('device_push_tokens')
    .update({ ativo: false, updated_at: new Date().toISOString() })
    .eq('usuario_id', uid)
    .eq('ativo', true)

  if (tokenAtual?.trim()) {
    consulta = consulta.eq('token', tokenAtual.trim())
  }

  const { error } = await consulta
  if (error) console.warn('Falha ao desativar token push', error.message)
}

export async function removerTokenPushInvalido(token: string) {
  const db = supabase
  if (!db || !token.trim()) return
  const { error } = await db
    .from('device_push_tokens')
    .update({ ativo: false, updated_at: new Date().toISOString() })
    .eq('token', token.trim())
  if (error) console.warn('Falha ao invalidar token push', error.message)
}
