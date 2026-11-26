import { describe, expect, it } from 'vitest'
import {
  bateQuinzena,
  contarEmpresasDoMes,
  contarMesesDoAno,
  filtrarViagensDoMes,
  ID_PARCEIROS_EXTERNOS_PLANILHA,
} from '@/services/planilhaMensalCorridas'
import type { Empresa, Viagem } from '@/types'

function viagemFake(parcial: Partial<Viagem> & Pick<Viagem, 'id' | 'data_viagem' | 'empresa_id'>): Viagem {
  return {
    codigo: 'JEM-1',
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

describe('planilhaMensalCorridas', () => {
  const viagens = [
    viagemFake({ id: '1', data_viagem: '2026-11-05', empresa_id: 'e1' }),
    viagemFake({ id: '2', data_viagem: '2026-11-12', empresa_id: 'e1', preco_total: 200, valor_empresa: 180 }),
    viagemFake({ id: '3', data_viagem: '2026-10-01', empresa_id: 'e2' }),
    viagemFake({
      id: '4',
      data_viagem: '2026-11-18',
      empresa_id: 'e2',
      status: 'parceiro_externo',
      preco_total: 150,
      valor_empresa: 120,
      valor_plataforma: 30,
    }),
    viagemFake({
      id: '5',
      data_viagem: '2026-11-03',
      empresa_id: 'e2',
      status: 'parceiro_externo',
      preco_total: 80,
      valor_empresa: 64,
      valor_plataforma: 16,
    }),
  ]
  const empresas = [
    { id: 'e1', nome_comercial: 'LA Premier' },
    { id: 'e2', nome_comercial: 'Pacific' },
  ] as Empresa[]

  it('conta os 12 meses do ano', () => {
    const meses = contarMesesDoAno(viagens, 2026)
    expect(meses).toHaveLength(12)
    expect(meses[10].quantidade).toBe(4)
    expect(meses[9].quantidade).toBe(1)
  })

  it('filtra por mês e empresa', () => {
    const linhas = filtrarViagensDoMes(viagens, 2026, 11, 'e1')
    expect(linhas.map((item) => item.id)).toEqual(['1', '2'])
  })

  it('filtra parceiros externos e quinzena', () => {
    const parceiros = filtrarViagensDoMes(viagens, 2026, 11, {
      empresaId: ID_PARCEIROS_EXTERNOS_PLANILHA,
    })
    expect(parceiros.map((item) => item.id)).toEqual(['5', '4'])

    const q1 = filtrarViagensDoMes(viagens, 2026, 11, {
      empresaId: ID_PARCEIROS_EXTERNOS_PLANILHA,
      quinzena: 'q1',
    })
    expect(q1.map((item) => item.id)).toEqual(['5'])

    const q2 = filtrarViagensDoMes(viagens, 2026, 11, {
      empresaId: ID_PARCEIROS_EXTERNOS_PLANILHA,
      quinzena: 'q2',
    })
    expect(q2.map((item) => item.id)).toEqual(['4'])
  })

  it('agrupa empresas do mês com card de parceiros', () => {
    const lista = contarEmpresasDoMes(viagens, 2026, 11, empresas)
    expect(lista[0].empresaId).toBe(ID_PARCEIROS_EXTERNOS_PLANILHA)
    expect(lista[0].quantidade).toBe(2)
    expect(lista[0].valorEmpresa).toBe(184)
    expect(lista.some((item) => item.nome === 'LA Premier')).toBe(true)
  })

  it('bate quinzena pelo dia da corrida', () => {
    expect(bateQuinzena('2026-11-15', 'q1')).toBe(true)
    expect(bateQuinzena('2026-11-16', 'q1')).toBe(false)
    expect(bateQuinzena('2026-11-16', 'q2')).toBe(true)
    expect(bateQuinzena('2026-11-01', 'todas')).toBe(true)
  })
})
