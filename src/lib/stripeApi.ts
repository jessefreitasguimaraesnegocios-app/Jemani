import { Capacitor } from '@capacitor/core'

function urlDoApp() {
  try {
    const url = new URL(window.location.origin)
    const noComputador =
      url.protocol === 'http:' &&
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '::1')
    if (noComputador || (url.protocol === 'https:' && url.hostname !== 'localhost')) {
      return url.origin
    }
  } catch {
    /* origem inválida */
  }
  return 'https://jemani.vercel.app'
}

function hostEhLoopback(host: string) {
  return !host || host === 'localhost' || host === '127.0.0.1' || host === '::1'
}

/**
 * Servidor Stripe de teste (npm run stripe:local).
 * No APK/celular, 127.0.0.1 é o próprio aparelho — aí usamos as Edge Functions.
 */
const apiLocal = () => {
  const configurada = (import.meta.env.VITE_STRIPE_API_URL as string | undefined)?.trim()
  if (configurada) {
    try {
      const url = new URL(configurada)
      if (Capacitor.isNativePlatform() && hostEhLoopback(url.hostname)) {
        return ''
      }
      return configurada.replace(/\/$/, '')
    } catch {
      return ''
    }
  }
  if (
    import.meta.env.DEV &&
    import.meta.env.VITE_STRIPE_ENABLED === 'true' &&
    typeof window !== 'undefined'
  ) {
    const host = window.location.hostname
    if (hostEhLoopback(host)) return 'http://127.0.0.1:8787'
    return `${window.location.origin}/api-stripe`
  }
  return ''
}

const urlBaseSupabase = () => {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  if (!url) throw new Error('VITE_SUPABASE_URL não configurada')
  return url.replace(/\/$/, '')
}

const cabecalhos = (): Record<string, string> => {
  const local = apiLocal()
  if (local) {
    return { 'Content-Type': 'application/json' }
  }
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (!anon) throw new Error('VITE_SUPABASE_ANON_KEY não configurada')
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${anon}`,
    apikey: anon,
  }
}

async function chamarFuncao<T>(nome: string, corpo: Record<string, unknown>): Promise<T> {
  const local = apiLocal()
  const endpoint = local
    ? `${local}/${nome}`
    : `${urlBaseSupabase()}/functions/v1/${nome}`
  let res: Response
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: cabecalhos(),
      body: JSON.stringify(corpo),
    })
  } catch {
    throw new Error(
      local
        ? 'Não consegui falar com o Stripe de teste neste aparelho. No celular, use a mesma rede do computador e deixe o servidor de teste ligado — ou use o APK publicado, que fala com o Supabase.'
        : 'Não foi possível falar com o Stripe.',
    )
  }
  const data = (await res.json()) as T & { erro?: string }
  if (!res.ok || data.erro) {
    throw new Error(data.erro ?? `Falha em ${nome}`)
  }
  return data
}

export function stripeCheckoutDisponivel(): boolean {
  if (import.meta.env.VITE_STRIPE_ENABLED !== 'true') return false
  if (apiLocal()) return true
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
}

export function criarCheckoutStripe(dados: {
  viagem_id: string
  codigo: string
  amount: number
  platform_fee: number
  company_amount: number
  email_cliente?: string
}) {
  return chamarFuncao<{ session_id: string; url: string }>('stripe-criar-checkout', {
    ...dados,
    app_url: Capacitor.isNativePlatform() ? 'https://jemani.vercel.app' : urlDoApp(),
  })
}

export function verificarSessaoStripe(session_id: string, viagem_id: string) {
  return chamarFuncao<{
    pago: boolean
    session_id: string
    payment_intent: string | null
  }>('stripe-verificar-sessao', { session_id, viagem_id })
}

export function iniciarOnboardingConnect(dados: {
  empresa_id: string
  email: string
  nome: string
  stripe_account_id?: string
}) {
  return chamarFuncao<{ stripe_account_id: string; onboarding_url: string }>(
    'stripe-connect-onboarding',
    {
      ...dados,
      app_url: Capacitor.isNativePlatform()
        ? 'https://jemani.vercel.app'
        : window.location.origin,
    },
  )
}

export function transferirParaEmpresa(dados: {
  stripe_account_id: string
  amount: number
  viagem_id: string
  codigo: string
}) {
  return chamarFuncao<{ transfer_id: string }>('stripe-transferir-empresa', dados)
}
