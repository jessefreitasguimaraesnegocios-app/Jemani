const apiLocal = () => {
  const local = import.meta.env.VITE_STRIPE_API_URL as string | undefined
  return local?.replace(/\/$/, '') || ''
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
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: cabecalhos(),
    body: JSON.stringify(corpo),
  })
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
    app_url: window.location.origin,
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
      app_url: window.location.origin,
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
