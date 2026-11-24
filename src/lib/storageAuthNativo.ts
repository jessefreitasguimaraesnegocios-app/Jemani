import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

/**
 * Storage da sessão Supabase.
 * - Nativo: Preferences (persiste ao matar o app).
 * - Web: sessionStorage (por aba; a chave já inclui o id da aba no createClient).
 */
export const storageAuthNativo = {
  async getItem(key: string): Promise<string | null> {
    if (!Capacitor.isNativePlatform()) {
      if (typeof sessionStorage === 'undefined') return null
      const atual = sessionStorage.getItem(key)
      if (atual != null) return atual
      // Migra uma vez a sessão antiga compartilhada (localStorage) para esta aba.
      if (typeof localStorage !== 'undefined') {
        const legado = encontrarLegadoSupabaseLocal()
        if (legado) {
          sessionStorage.setItem(key, legado)
          limparLegadosSupabaseLocal()
          return legado
        }
      }
      return null
    }
    const { value } = await Preferences.get({ key })
    if (value != null) return value
    if (typeof localStorage !== 'undefined') {
      const legado = localStorage.getItem(key)
      if (legado) {
        await Preferences.set({ key, value: legado })
        return legado
      }
    }
    return null
  },
  async setItem(key: string, value: string): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(key, value)
      return
    }
    await Preferences.set({ key, value })
  },
  async removeItem(key: string): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(key)
      return
    }
    await Preferences.remove({ key })
  },
}

function chavesLegadoSupabaseLocal(): string[] {
  if (typeof localStorage === 'undefined') return []
  const chaves: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const chave = localStorage.key(i)
    if (!chave) continue
    if (chave.includes('-auth-token') || chave.startsWith('sb-')) chaves.push(chave)
  }
  return chaves
}

function encontrarLegadoSupabaseLocal(): string | null {
  for (const chave of chavesLegadoSupabaseLocal()) {
    const valor = localStorage.getItem(chave)
    if (valor && valor.includes('access_token')) return valor
  }
  return null
}

function limparLegadosSupabaseLocal() {
  for (const chave of chavesLegadoSupabaseLocal()) {
    localStorage.removeItem(chave)
  }
}
