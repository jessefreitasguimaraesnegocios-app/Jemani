import { Capacitor } from '@capacitor/core'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { chaveStorageAuthSupabase, obterIdAbaSessao } from '@/lib/idAbaSessao'
import { modoDemoAtivo, nuvemAtiva } from '@/lib/nuvemAtiva'
import { storageAuthNativo } from '@/lib/storageAuthNativo'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Nuvem ligada sempre que houver URL+chave. Demo local é opt-in (VITE_DEMO_MODE=true). */
export const supabaseConfigurado = nuvemAtiva() && !modoDemoAtivo()

const nativo = Capacitor.isNativePlatform()

// Garante id da aba antes do client (storageKey único → sem sync entre abas).
if (!nativo) obterIdAbaSessao()

export const supabase: SupabaseClient | null =
  url && anon
    ? createClient(url, anon, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          // No app nativo a URL não traz token OAuth; evita limpar sessão ao abrir.
          detectSessionInUrl: !nativo,
          // Chave por aba: isola JWT e o BroadcastChannel interno do GoTrue.
          storageKey: nativo ? 'jemani-auth-nativo' : chaveStorageAuthSupabase(),
          storage: storageAuthNativo,
        },
      })
    : null
