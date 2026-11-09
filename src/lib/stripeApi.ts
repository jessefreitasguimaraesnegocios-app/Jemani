import { Capacitor } from '@capacitor/core'
import { supabase } from '@/lib/supabase'

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
 * Padrão: Edge Functions no Supabase (sempre no ar).
 * Só usa servidor local se VITE_STRIPE_API_URL estiver setada de propósito
 * (ex.: npm run stripe:local). No APK, loopback é ignorado.
 */
const apiLocal = () => {
  const configurada = (import.meta.env.VITE_STRIPE_API_URL as string | undefined)?.trim()
  if (!configurada) return ''
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

const urlBaseSupabase = () => {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  if (!url) throw new Error('VITE_SUPABASE_URL não configurada')
  return url.replace(/\/$/, '')
}

async function cabecalhosAuth(permitirAnon = false): Promise<Record<string, string>> {
  const local = apiLocal()
  if (local) {
    return { 'Content-Type': 'application/json' }
  }
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (!anon) throw new Error('VITE_SUPABASE_ANON_KEY não configurada')

  let token: string | undefined
  if (supabase) {
    try {
      const { exigirSessaoAuthValida } = await import('@/services/sessaoAuth')
      const sessao = await exigirSessaoAuthValida()
      token = sessao.access_token
    } catch {
      if (!permitirAnon) {
        throw new Error('Faça login novamente para continuar o pagamento.')
      }
      const { data } = await supabase.auth.getSession()
      token = data.session?.access_token
    }
  }
  if (!token && !permitirAnon) {
    throw new Error('Faça login novamente para continuar o pagamento.')
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token || anon}`,
    apikey: anon,
  }
}

function noSitePublicado() {
  if (typeof window === 'undefined') return false
  const host = window.location.hostname
  return host === 'jemani.vercel.app' || host.endsWith('.vercel.app')
}

async function chamarFuncao<T>(
  nome: string,
  corpo: Record<string, unknown>,
  permitirAnon = false,
): Promise<T> {
  const local = apiLocal()
  // Criar Checkout na Vercel (secret sk_test). Confirmar sessão na Edge Function
  // do Supabase (service role marca pago + cria ofertas — o cliente não pode).
  const viaVercel = nome === 'stripe-criar-checkout'
  const endpoint = local
    ? `${local}/${nome}`
    : viaVercel
      ? noSitePublicado()
        ? `${window.location.origin}/api/${nome}`
        : 'https://jemani.vercel.app/api/' + nome
      : `${urlBaseSupabase()}/functions/v1/${nome}`
  let res: Response
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: await cabecalhosAuth(permitirAnon),
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
  if (res.status === 429) {
    throw new Error(data.erro ?? 'Muitas tentativas. Aguarde um momento.')
  }
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
  return chamarFuncao<{ session_id: string; url: string; amount?: number }>('stripe-criar-checkout', {
    viagem_id: dados.viagem_id,
    codigo: dados.codigo,
    email_cliente: dados.email_cliente,
    // No modo teste, se a corrida ainda não está no banco, o servidor usa estes valores.
    amount: dados.amount,
    platform_fee: dados.platform_fee,
    company_amount: dados.company_amount,
    app_url: Capacitor.isNativePlatform() ? 'https://jemani.vercel.app' : urlDoApp(),
  }, true)
}

export function verificarSessaoStripe(session_id: string, viagem_id: string) {
  return chamarFuncao<{
    pago: boolean
    session_id: string
    payment_intent: string | null
  }>('stripe-verificar-sessao', { session_id, viagem_id }, true)
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
      empresa_id: dados.empresa_id,
      app_url: Capacitor.isNativePlatform()
        ? 'https://jemani.vercel.app'
        : window.location.origin,
    },
  )
}

export async function marcarPagamentoSimulado(viagem_id: string) {
  return chamarFuncao<{ pago: boolean }>('pagamento-simulado', { viagem_id })
}

export function transferirParaEmpresa(dados: {
  stripe_account_id: string
  amount: number
  viagem_id: string
  codigo: string
}) {
  return chamarFuncao<{ transfer_id: string }>('stripe-transferir-empresa', {
    viagem_id: dados.viagem_id,
  })
}
