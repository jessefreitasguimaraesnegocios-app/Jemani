import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { modoDemoAtivo, nuvemAtiva } from '@/lib/nuvemAtiva'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Nuvem ligada sempre que houver URL+chave. Demo local é opt-in (VITE_DEMO_MODE=true). */
export const supabaseConfigurado = nuvemAtiva() && !modoDemoAtivo()

export const supabase: SupabaseClient | null =
  url && anon
    ? createClient(url, anon, {
        auth: { persistSession: true, autoRefreshToken: true },
      })
    : null
