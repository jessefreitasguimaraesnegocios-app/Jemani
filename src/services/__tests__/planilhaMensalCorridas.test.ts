import { describe, expect, it } from 'vitest'
import {
  contarEmpresasDoMes,
  contarMesesDoAno,
  filtrarViagensDoMes,
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
  ]
  const empresas = [
    { id: 'e1', nome_comercial: 'LA Premier' },
    { id: 'e2', nome_comercial: 'Pacific' },
  ] as Empresa[]

  it('conta os 12 meses do ano', () => {
    const meses = contarMesesDoAno(viagens, 2026)
    expect(meses).toHaveLength(12)
    expect(meses[10].quantidade).toBe(2)
    expect(meses[9].quantidade).toBe(1)
  })

  it('filtra por mês e empresa', () => {
    const linhas = filtrarViagensDoMes(viagens, 2026, 11, 'e1')
    expect(linhas.map((item) => item.id)).toEqual(['1', '2'])
  })

  it('agrupa empresas do mês', () => {
    const lista = contarEmpresasDoMes(viagens, 2026, 11, empresas)
    expect(lista).toHaveLength(1)
    expect(lista[0].nome).toBe('LA Premier')
    expect(lista[0].quantidade).toBe(2)
    expect(lista[0].valorEmpresa).toBe(270)
  })
})
