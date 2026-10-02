/**
 * Camada de pagamento.
 * Segredos Stripe ficam só nas Edge Functions (STRIPE_SECRET_KEY).
 */

import {
  criarCheckoutStripe,
  stripeCheckoutDisponivel,
  verificarSessaoStripe,
} from '@/lib/stripeApi'

export type ProvedorPagamento = 'stripe' | 'asaas' | 'teste' | 'dev_simulado'

export interface IntencaoPagamento {
  bookingId: string
  amount: number
  platformFee: number
  companyAmount: number
  method?: string
  codigo?: string
  emailCliente?: string
}

export interface ResultadoPagamento {
  paymentId: string
  status: 'pendente' | 'pago' | 'falhou' | 'teste' | 'pending_payment'
  provider: ProvedorPagamento
  checkoutUrl?: string
  sessionId?: string
}

/** Em produção/teste Stripe: cria Checkout Session e devolve URL. */
export async function criarIntencaoPagamento(
  intencao: IntencaoPagamento,
): Promise<ResultadoPagamento> {
  if (stripeCheckoutDisponivel()) {
    const sessao = await criarCheckoutStripe({
      viagem_id: intencao.bookingId,
      codigo: intencao.codigo ?? intencao.bookingId.slice(0, 8),
      amount: intencao.amount,
      platform_fee: intencao.platformFee,
      company_amount: intencao.companyAmount,
      email_cliente: intencao.emailCliente,
    })
    return {
      paymentId: sessao.session_id,
      status: 'pending_payment',
      provider: 'stripe',
      checkoutUrl: sessao.url,
      sessionId: sessao.session_id,
    }
  }

  return {
    paymentId: `pending_${intencao.bookingId.slice(0, 8)}`,
    status: 'pending_payment',
    provider: 'teste',
  }
}

export function permitirSimulacaoPagamentoDev(): boolean {
  return import.meta.env.DEV === true && import.meta.env.VITE_ALLOW_DEV_PAYMENT === 'true'
}

export async function simularPagamentoDev(
  intencao: IntencaoPagamento,
): Promise<ResultadoPagamento> {
  if (!permitirSimulacaoPagamentoDev()) {
    throw new Error(
      'Simulação de pagamento disponível apenas em desenvolvimento com VITE_ALLOW_DEV_PAYMENT=true',
    )
  }

  return {
    paymentId: `dev_${intencao.bookingId.slice(0, 8)}_${Date.now()}`,
    status: 'pago',
    provider: 'dev_simulado',
  }
}

export async function confirmarSessaoCheckoutStripe(
  sessionId: string,
  viagemId: string,
): Promise<ResultadoPagamento> {
  const resultado = await verificarSessaoStripe(sessionId, viagemId)
  if (!resultado.pago) {
    throw new Error('Pagamento ainda não confirmado na Stripe')
  }
  return {
    paymentId: resultado.payment_intent ?? resultado.session_id,
    status: 'pago',
    provider: 'stripe',
    sessionId: resultado.session_id,
  }
}

/** @deprecated use criarIntencaoPagamento */
export async function criarPagamento(intencao: IntencaoPagamento): Promise<ResultadoPagamento> {
  return criarIntencaoPagamento(intencao)
}
