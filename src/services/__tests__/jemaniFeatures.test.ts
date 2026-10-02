import { describe, expect, it } from 'vitest'
import { calcularDistanciaKm } from '@/services/mapasService'
import {
  empresaElegivel,
  ordenarEmpresasPorProximidade,
} from '@/services/distribuicaoService'
import { permitirSimulacaoPagamentoDev } from '@/services/pagamentoService'
import {
  enderecoTemCoordenadas,
  listarHorariosDisponiveis,
  validarAntecedenciaMinima,
} from '@/services/reservaValidacao'
import {
  agruparCorridasPorCliente,
  agruparCorridasPorEmpresa,
  montarGruposHistorico,
  montarResumoHistorico,
} from '@/services/historicoCorridas'
import {
  calcularRepasseComissao,
  obterComissaoDaEmpresa,
} from '@/services/comissaoService'
import {
  agruparCorridasPorColuna,
  contarCorridasPorStatus,
  corridaCorrespondeBusca,
} from '@/services/quadroViagens'
import { normalizarIdioma } from '@/i18n/tipos'
import type { Empresa, Viagem } from '@/types'

describe('idioma', () => {
  it('normaliza valores conhecidos e cai em pt-BR', () => {
    expect(normalizarIdioma('en')).toBe('en')
    expect(normalizarIdioma('es')).toBe('es')
    expect(normalizarIdioma('pt')).toBe('pt-BR')
    expect(normalizarIdioma('xyz')).toBe('pt-BR')
  })
})
import { enderecoProntoParaReserva } from '@/utils/endereco'
import { montarUrlGmailCompose } from '@/utils/gmailCompose'

function empresaBase(partial: Partial<Empresa> & { id: string; latitude: number; longitude: number }): Empresa {
  return {
    usuario_id: 'u1',
    nome_comercial: 'Test',
    razao_social: 'Test LLC',
    cnpj: partial.id,
    telefone: '1',
    email: 't@t.com',
    cidade: 'Los Angeles',
    regioes_atendidas: ['Los Angeles'],
    categorias_ids: ['cat1'],
    status: 'ativa',
    habilitada_receber: true,
    avaliacao_media: 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...partial,
  }
}

describe('validarAntecedenciaMinima', () => {
  it('rejeita horário no passado', () => {
    const r = validarAntecedenciaMinima('2020-01-01', '10:00', new Date('2026-09-18T20:00:00Z'), 'UTC')
    expect(r.valido).toBe(false)
  })

  it('rejeita menos de 4 horas (3h59)', () => {
    const agora = new Date('2026-09-18T12:00:00.000Z')
    const r359 = validarAntecedenciaMinima('2026-09-18', '15:59', agora, 'UTC')
    expect(r359.valido).toBe(false)
  })

  it('aceita exatamente 4 horas', () => {
    const agora = new Date('2026-09-18T12:00:00.000Z')
    const r = validarAntecedenciaMinima('2026-09-18', '16:00', agora, 'UTC')
    expect(r.valido).toBe(true)
  })

  it('aceita mais de 4 horas (4h01)', () => {
    const agora = new Date('2026-09-18T12:00:00.000Z')
    const r = validarAntecedenciaMinima('2026-09-18', '16:01', agora, 'UTC')
    expect(r.valido).toBe(true)
  })
})

describe('listarHorariosDisponiveis', () => {
  it('no mesmo dia omite horários antes das 4h', () => {
    const agora = new Date('2026-09-18T12:00:00.000Z')
    const slots = listarHorariosDisponiveis('2026-09-18', agora, 'UTC', 15)
    expect(slots[0]).toBe('16:00')
    expect(slots.includes('15:45')).toBe(false)
    expect(slots.includes('12:00')).toBe(false)
  })

  it('em dia futuro libera a grade a partir da manhã', () => {
    const agora = new Date('2026-09-18T12:00:00.000Z')
    const slots = listarHorariosDisponiveis('2026-09-19', agora, 'UTC', 15)
    expect(slots[0]).toBe('00:00')
    expect(slots.includes('09:00')).toBe(true)
  })
})

describe('enderecoProntoParaReserva', () => {
  it('exige número fora de aeroporto', () => {
    const r = enderecoProntoParaReserva({
      formatted: 'Wilshire Blvd, Beverly Hills',
      rua: 'Wilshire Blvd',
      latitude: 34.06,
      longitude: -118.37,
      source: 'dev_fallback',
    })
    expect(r.ok).toBe(false)
  })

  it('aceita rua + número confirmado', () => {
    const r = enderecoProntoParaReserva({
      formatted: '8423 Wilshire Blvd, Beverly Hills, CA',
      rua: 'Wilshire Blvd',
      numero: '8423',
      numero_confirmado: true,
      latitude: 34.06,
      longitude: -118.37,
      source: 'dev_fallback',
    })
    expect(r.ok).toBe(true)
  })

  it('rejeita número ainda não confirmado', () => {
    const r = enderecoProntoParaReserva({
      formatted: '99999 Wilshire Blvd',
      rua: 'Wilshire Blvd',
      numero: '99999',
      numero_confirmado: false,
      latitude: 34.06,
      longitude: -118.37,
      source: 'dev_fallback',
    })
    expect(r.ok).toBe(false)
  })
})

describe('distribuicao por proximidade', () => {
  const origemLat = 33.9416
  const origemLng = -118.4085

  it('ordena da mais próxima para a mais distante', () => {
    const empresas = [
      empresaBase({ id: 'far', latitude: 34.1808, longitude: -118.309, nome_comercial: 'Burbank' }),
      empresaBase({ id: 'near', latitude: 33.95, longitude: -118.4, nome_comercial: 'Near LAX' }),
      empresaBase({ id: 'mid', latitude: 34.04, longitude: -118.25, nome_comercial: 'DTLA' }),
    ]
    const { ordenadas } = ordenarEmpresasPorProximidade(empresas, origemLat, origemLng, 'cat1')
    expect(ordenadas.map((o: { empresa: Empresa }) => o.empresa.id)).toEqual(['near', 'mid', 'far'])
  })

  it('pula empresa indisponível e continua', () => {
    const empresas = [
      empresaBase({
        id: 'off',
        latitude: 33.95,
        longitude: -118.4,
        habilitada_receber: false,
      }),
      empresaBase({ id: 'ok', latitude: 34.04, longitude: -118.25 }),
    ]
    const { ordenadas, historico } = ordenarEmpresasPorProximidade(
      empresas,
      origemLat,
      origemLng,
      'cat1',
    )
    expect(ordenadas).toHaveLength(1)
    expect(ordenadas[0].empresa.id).toBe('ok')
    expect(historico.some((h: { resultado: string }) => h.resultado === 'indisponivel')).toBe(true)
  })

  it('empresa sem coords é inelegível', () => {
    const e = empresaBase({ id: 'x', latitude: 1, longitude: 1 })
    delete (e as { latitude?: number }).latitude
    expect(empresaElegivel(e, 'cat1').ok).toBe(false)
  })
})

describe('haversine', () => {
  it('calcula distância LAX → DTLA > 0', () => {
    const km = calcularDistanciaKm(33.9416, -118.4085, 34.0407, -118.2468)
    expect(km).toBeGreaterThan(10)
    expect(km).toBeLessThan(40)
  })
})

describe('pagamento DEV', () => {
  it('flag de simulação é booleana', () => {
    expect(typeof permitirSimulacaoPagamentoDev()).toBe('boolean')
  })
})

describe('gmail compose', () => {
  it('monta URL sem API', () => {
    const url = montarUrlGmailCompose({
      para: 'empresa@test.com',
      assunto: 'Nova corrida disponível - Jemani',
      corpo: 'Olá',
    })
    expect(url).toContain('mail.google.com')
    expect(url).toContain('empresa%40test.com')
  })
})

describe('finalizacao regras', () => {
  it('apenas viagem_em_andamento é elegível para finalizar', () => {
    const podeFinalizar = (status: string) => status === 'viagem_em_andamento'
    expect(podeFinalizar('cancelada')).toBe(false)
    expect(podeFinalizar('viagem_finalizada')).toBe(false)
    expect(podeFinalizar('pending_payment')).toBe(false)
    expect(podeFinalizar('aguardando_empresa')).toBe(false)
    expect(podeFinalizar('viagem_em_andamento')).toBe(true)
  })
})

function viagemBase(partial: Partial<Viagem> & Pick<Viagem, 'id' | 'cliente_id' | 'status'>): Viagem {
  return {
    codigo: partial.id,
    categoria_id: 'cat1',
    origem: 'A',
    destino: 'B',
    data_viagem: '2026-09-20',
    horario: '10:00',
    passageiros: 1,
    preco_base: 90,
    taxas: 0,
    preco_total: 100,
    comissao_percentual: 10,
    valor_plataforma: 10,
    valor_empresa: 90,
    payment_status: 'paid',
    version: 1,
    created_at: '2026-09-20T10:00:00Z',
    updated_at: '2026-09-20T10:00:00Z',
    ...partial,
  }
}

describe('historico de corridas', () => {
  it('separa por cliente e por empresa sem misturar', () => {
    const lista = [
      viagemBase({ id: '1', cliente_id: 'c1', empresa_id: 'e1', status: 'viagem_finalizada' }),
      viagemBase({ id: '2', cliente_id: 'c1', empresa_id: 'e2', status: 'cancelada' }),
      viagemBase({ id: '3', cliente_id: 'c2', empresa_id: 'e1', status: 'viagem_em_andamento' }),
      viagemBase({ id: '4', cliente_id: 'c2', status: 'aguardando_empresa' }),
    ]
    const porCliente = agruparCorridasPorCliente(lista)
    const porEmpresa = agruparCorridasPorEmpresa(lista)
    expect(porCliente.get('c1')?.map((v) => v.id)).toEqual(['1', '2'])
    expect(porCliente.get('c2')?.map((v) => v.id)).toEqual(['3', '4'])
    expect(porEmpresa.get('e1')?.map((v) => v.id)).toEqual(['1', '3'])
    expect(porEmpresa.get('e2')?.map((v) => v.id)).toEqual(['2'])
    expect(porEmpresa.has('c1')).toBe(false)
  })

  it('agrupa realizadas, andamento e canceladas', () => {
    const grupos = montarGruposHistorico([
      viagemBase({ id: '1', cliente_id: 'c1', status: 'viagem_finalizada' }),
      viagemBase({ id: '2', cliente_id: 'c1', status: 'viagem_em_andamento' }),
      viagemBase({ id: '3', cliente_id: 'c1', status: 'cancelada' }),
    ])
    expect(grupos.find((g) => g.id === 'realizadas')?.viagens.map((v) => v.id)).toEqual(['1'])
    expect(grupos.find((g) => g.id === 'proximas')?.viagens.map((v) => v.id)).toEqual(['2'])
    expect(grupos.find((g) => g.id === 'canceladas')?.viagens.map((v) => v.id)).toEqual(['3'])
    const resumo = montarResumoHistorico(
      [
        viagemBase({ id: '1', cliente_id: 'c1', status: 'viagem_finalizada' }),
        viagemBase({ id: '2', cliente_id: 'c1', status: 'cancelada' }),
      ],
      'empresa',
    )
    expect(resumo.total).toBe(2)
    expect(resumo.realizadas).toBe(1)
    expect(resumo.canceladas).toBe(1)
    expect(resumo.valor).toBe(90)
  })
})

describe('comissao por empresa', () => {
  it('usa percentual da empresa ou o padrão', () => {
    expect(obterComissaoDaEmpresa({ comissao_percentual: 15 }, 10)).toBe(15)
    expect(obterComissaoDaEmpresa({}, 10)).toBe(10)
    const repasse = calcularRepasseComissao(200, 12)
    expect(repasse.comissao_percentual).toBe(12)
    expect(repasse.valor_plataforma).toBe(24)
    expect(repasse.valor_empresa).toBe(176)
  })
})

describe('quadro de viagens', () => {
  it('agrupa por coluna operacional e conta status', () => {
    const lista = [
      viagemBase({ id: '1', cliente_id: 'c1', status: 'oferta_enviada', codigo: 'JEM-1' }),
      viagemBase({ id: '2', cliente_id: 'c1', status: 'viagem_finalizada', codigo: 'JEM-2' }),
      viagemBase({ id: '3', cliente_id: 'c1', status: 'cancelada', codigo: 'JEM-3' }),
    ]
    const colunas = agruparCorridasPorColuna(lista)
    expect(colunas.get('fila')?.map((v) => v.id)).toEqual(['1'])
    expect(colunas.get('concluidas')?.map((v) => v.id)).toEqual(['2'])
    expect(colunas.get('encerradas')?.map((v) => v.id)).toEqual(['3'])
    const contagem = contarCorridasPorStatus(lista)
    expect(contagem.find((c) => c.status === 'oferta_enviada')?.quantidade).toBe(1)
    expect(
      corridaCorrespondeBusca(lista[0], 'jem-1', 'Ana', 'ana@email.com', 'LA Premier'),
    ).toBe(true)
    expect(corridaCorrespondeBusca(lista[0], 'inexistente', 'Ana')).toBe(false)
  })
})
