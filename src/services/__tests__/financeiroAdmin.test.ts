import { describe, expect, it } from 'vitest'
import {
  filtrarLancamentos,
  montarLancamentosFinanceiros,
  montarResumoFinanceiro,
} from '@/services/financeiroAdmin'
import type { Empresa, Pagamento, Viagem } from '@/types'

function viagemFake(
  parcial: Partial<Viagem> & Pick<Viagem, 'id' | 'data_viagem' | 'empresa_id'>,
): Viagem {
  return {
    codigo: `JEM-${parcial.id}`,
    cliente_id: 'c1',
    categoria_id: 'cat',
    modalidade: 'one_way',
    origem: 'A',
    destino: 'B',
    horario: '10:00',
    passageiros: 2,
    preco_base: 100,
    taxas: 0,
    preco_total: 100,
    comissao_percentual: 10,
    valor_plataforma: 10,
    valor_empresa: 90,
    status: 'viagem_finalizada',
    payment_status: 'paid',
    version: 1,
    created_at: '2026-11-01T00:00:00.000Z',
    updated_at: '2026-11-01T00:00:00.000Z',
    ...parcial,
  }
}

const empresas = [
  { id: 'e1', nome_comercial: 'LA Premier' },
  { id: 'e2', nome_comercial: 'Pacific' },
] as Empresa[]

describe('financeiro admin', () => {
  const viagens = [
    viagemFake({ id: '1', data_viagem: '2026-11-05', empresa_id: 'e1', preco_total: 100, valor_plataforma: 10, valor_empresa: 90 }),
    viagemFake({ id: '2', data_viagem: '2026-11-20', empresa_id: 'e2', preco_total: 200, valor_plataforma: 20, valor_empresa: 180 }),
    viagemFake({ id: '3', data_viagem: '2026-10-02', empresa_id: 'e1', preco_total: 50, valor_plataforma: 5, valor_empresa: 45 }),
    viagemFake({
      id: '4',
      data_viagem: '2026-11-08',
      empresa_id: 'e1',
      status: 'cancelada',
      preco_total: 999,
      valor_plataforma: 99,
      valor_empresa: 900,
    }),
    viagemFake({
      id: '5',
      data_viagem: '2026-11-03',
      empresa_id: 'e2',
      status: 'pending_payment',
      payment_status: 'pending_payment',
      preco_total: 80,
    }),
  ]

  it('soma o volume de todas as empresas no período, sem pagamento gravado', () => {
    const lancamentos = montarLancamentosFinanceiros([], viagens, empresas, [], [])
    const doMes = filtrarLancamentos(lancamentos, {
      empresaId: '',
      tipo: 'todos',
      categoriaId: '',
      busca: '',
      ano: 2026,
      mes: 11,
      quinzena: 'todas',
    })
    const resumo = montarResumoFinanceiro(doMes)
    expect(doMes.map((item) => item.viagem?.id).sort()).toEqual(['1', '2'])
    expect(resumo.volume).toBe(300)
    expect(resumo.comissao).toBe(30)
    expect(resumo.valorEmpresa).toBe(270)
    expect(resumo.quantidade).toBe(2)
  })

  it('filtra o resumo pela empresa escolhida', () => {
    const lancamentos = montarLancamentosFinanceiros([], viagens, empresas, [], [])
    const daEmpresa = filtrarLancamentos(lancamentos, {
      empresaId: 'e2',
      tipo: 'todos',
      categoriaId: '',
      busca: '',
      ano: 2026,
      mes: 11,
      quinzena: 'todas',
    })
    const resumo = montarResumoFinanceiro(daEmpresa)
    expect(daEmpresa).toHaveLength(1)
    expect(resumo.volume).toBe(200)
    expect(resumo.comissao).toBe(20)
    expect(resumo.valorEmpresa).toBe(180)
  })

  it('respeita a quinzena e não duplica corrida que já tem pagamento', () => {
    const pagamento: Pagamento = {
      id: 'pag-1',
      booking_id: '1',
      amount: 100,
      platform_fee: 10,
      company_amount: 90,
      status: 'pago',
      payment_method: 'card',
      provider: 'stripe',
      created_at: '2026-11-05T12:00:00.000Z',
      updated_at: '2026-11-05T12:00:00.000Z',
    }
    const lancamentos = montarLancamentosFinanceiros([pagamento], viagens, empresas, [], [])
    const primeiraQuinzena = filtrarLancamentos(lancamentos, {
      empresaId: '',
      tipo: 'todos',
      categoriaId: '',
      busca: '',
      ano: 2026,
      mes: 11,
      quinzena: 'q1',
    })
    expect(primeiraQuinzena.map((item) => item.viagem?.id)).toEqual(['1'])
    expect(primeiraQuinzena[0]?.daCorrida).toBe(false)
    expect(montarResumoFinanceiro(primeiraQuinzena).volume).toBe(100)
  })
})
