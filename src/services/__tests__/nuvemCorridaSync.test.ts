import { describe, expect, it } from 'vitest'
import {
  COLUNAS_OFERTA,
  COLUNAS_VIAGEM,
  INTERVALO_SEGURANCA_NUVEM_MS,
  linhaOfertaUsavel,
  linhaViagemUsavel,
  viagemDaLinha,
} from '@/services/nuvemCorrida'

describe('sincronização de corridas', () => {
  it('usa poll de segurança entre 20 e 30 segundos', () => {
    expect(INTERVALO_SEGURANCA_NUVEM_MS).toBeGreaterThanOrEqual(20_000)
    expect(INTERVALO_SEGURANCA_NUVEM_MS).toBeLessThanOrEqual(30_000)
  })

  it('lista colunas explícitas em vez de select genérico vazio', () => {
    expect(COLUNAS_VIAGEM).toContain('id')
    expect(COLUNAS_VIAGEM).toContain('updated_at')
    expect(COLUNAS_VIAGEM).not.toBe('*')
    expect(COLUNAS_OFERTA).toContain('viagem_id')
    expect(COLUNAS_OFERTA).not.toBe('*')
  })

  it('reconhece payload completo do Realtime sem REST extra', () => {
    const linha = {
      id: 'v1',
      codigo: 'JEM-1',
      cliente_id: 'c1',
      empresa_id: null,
      motorista_id: null,
      categoria_id: 'cat',
      origem: 'A',
      destino: 'B',
      origem_lat: null,
      origem_lng: null,
      destino_lat: null,
      destino_lng: null,
      origem_place_id: null,
      destino_place_id: null,
      data_viagem: '2026-10-21',
      horario: '10:00',
      passageiros: 2,
      malas: null,
      numero_voo: null,
      nome_passageiro: null,
      observacoes: null,
      distancia_km: null,
      preco_base: 100,
      taxas: 0,
      preco_total: 100,
      comissao_percentual: 10,
      valor_plataforma: 10,
      valor_empresa: 90,
      status: 'aguardando_empresa' as const,
      payment_status: 'paid',
      motorista_lat: null,
      motorista_lng: null,
      finalizado_em: null,
      finalizado_por: null,
      version: 2,
      created_at: '2026-10-21T00:00:00.000Z',
      updated_at: '2026-10-21T00:00:00.000Z',
    }
    expect(linhaViagemUsavel(linha)).toBe(true)
    expect(linhaViagemUsavel({ id: 'v1' })).toBe(false)
    const viagem = viagemDaLinha(linha)
    expect(viagem.codigo).toBe('JEM-1')
    expect(linhaOfertaUsavel({
      id: 'o1',
      viagem_id: 'v1',
      empresa_id: 'e1',
      status: 'oferecida',
      distancia_km: 1,
      motivo: null,
      respondido_em: null,
      created_at: '2026-10-21T00:00:00.000Z',
    })).toBe(true)
    expect(linhaOfertaUsavel({ id: 'o1' })).toBe(false)
  })
})
