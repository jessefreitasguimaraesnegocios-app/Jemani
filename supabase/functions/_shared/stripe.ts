import Stripe from 'npm:stripe@18.5.0'

export function criarClienteStripe() {
  const chave = Deno.env.get('STRIPE_SECRET_KEY')
  if (!chave) throw new Error('STRIPE_SECRET_KEY não configurada')
  return new Stripe(chave, {
    httpClient: Stripe.createFetchHttpClient(),
  })
}

export function valorEmCentavos(valor: number) {
  return Math.round(Number(valor) * 100)
}
