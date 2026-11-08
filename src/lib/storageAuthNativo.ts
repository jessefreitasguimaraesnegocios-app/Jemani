import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

/**
 * Storage da sessão Supabase no app nativo (APK/iOS).
 * localStorage do WebView pode sumir ao matar o app; Preferences persiste.
 */
export const storageAuthNativo = {
  async getItem(key: string): Promise<string | null> {
    if (!Capacitor.isNativePlatform()) {
      return typeof localStorage === 'undefined' ? null : localStorage.getItem(key)
    }
    const { value } = await Preferences.get({ key })
    if (value != null) return value
    // Migra sessão antiga do WebView (localStorage) para Preferences.
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
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, value)
      return
    }
    await Preferences.set({ key, value })
  },
  async removeItem(key: string): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(key)
      return
    }
    await Preferences.remove({ key })
  },
}
