import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigurado = Boolean(url && anon && import.meta.env.VITE_DEMO_MODE === 'false')

export const supabase: SupabaseClient | null = supabaseConfigurado
  ? createClient(url!, anon!)
  : null
