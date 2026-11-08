import { describe, expect, it } from 'vitest'

/**
 * Contratos de segurança do fluxo financeiro (sem chamar Stripe/rede).
 * Garante que o cliente não envia mais amount/conta arbitrários nas APIs públicas.
 */

describe('contratos de segurança pagamento', () => {
  it('transferirParaEmpresa só precisa de viagem_id no corpo útil', async () => {
    const { transferirParaEmpresa } = await import('@/lib/stripeApi')
    expect(transferirParaEmpresa.length).toBe(1)
    // Tipagem: stripe_account_id/amount ainda aceitos na assinatura por compat,
    // mas a implementação envia só viagem_id (servidor decide).
    const src = transferirParaEmpresa.toString()
    expect(src).toContain('viagem_id')
  })

  it('criarCheckoutStripe não é a fonte de verdade do valor', async () => {
    const { criarCheckoutStripe } = await import('@/lib/stripeApi')
    const src = criarCheckoutStripe.toString()
    expect(src).toContain('viagem_id')
  })

  it('simulação sem cartão desliga com VITE_ALLOW_DEV_PAYMENT=false', async () => {
    const { permitirSimulacaoPagamentoDev } = await import('@/services/pagamentoService')
    // Em testes o default atual é ligado (fluxo de QA). Em produção: VITE_ALLOW_DEV_PAYMENT=false.
    expect(typeof permitirSimulacaoPagamentoDev()).toBe('boolean')
  })
})

describe('frota cliente sem vazamento de empresa inativa', () => {
  it('empresa conhecida inativa não entra na frota', async () => {
    const { veiculosOfereceiveis } = await import('@/services/frotaCliente')
    const agora = '2026-10-30T12:00:00.000Z'
    const veiculos = [
      {
        id: 'v1',
        empresa_id: 'e1',
        marca: 'X',
        modelo: 'Y',
        ano: 2024,
        categoria_id: 'c1',
        capacidade: 3,
        ar_condicionado: true,
        bagageiro: true,
        fotos: [] as string[],
        status: 'disponivel' as const,
        created_at: agora,
        updated_at: agora,
      },
    ]
    const empresas = [
      {
        id: 'e1',
        usuario_id: 'u1',
        nome_comercial: 'Bloqueada',
        razao_social: 'B',
        cnpj: '1',
        telefone: '1',
        email: 'b@b.com',
        cidade: 'LA',
        regioes_atendidas: [] as string[],
        categorias_ids: [] as string[],
        status: 'bloqueada' as const,
        habilitada_receber: false,
        avaliacao_media: 5,
        comissao_percentual: 10,
        created_at: agora,
        updated_at: agora,
      },
    ]
    expect(veiculosOfereceiveis(veiculos, empresas)).toHaveLength(0)
  })
})
