/** True quando o app tem URL/chave do Supabase (fonte da verdade entre aparelhos). */
export function nuvemAtiva() {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY,
  )
}

/** Demo local só se marcado explicitamente — produção/APK usam nuvem. */
export function modoDemoAtivo() {
  return import.meta.env.VITE_DEMO_MODE === 'true'
}

/** Corridas, empresas e catálogo vêm do Supabase (não do Zustand persistido). */
export function usarNuvemComoFonte() {
  return nuvemAtiva() && !modoDemoAtivo()
}
