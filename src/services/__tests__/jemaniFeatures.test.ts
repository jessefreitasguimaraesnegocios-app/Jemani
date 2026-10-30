import { describe, expect, it } from 'vitest'
import { IDS, completarCatalogo, criarDadosIniciais } from '@/data/seed'
import { calcularDistanciaKm, interpretarFeatureMapbox } from '@/services/mapasService'
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
import {
  historicoPodeIrParaNuvem,
  ofertaLocalPodeSubir,
  ofertasComEmpresaCadastrada,
} from '@/services/filtroGravacaoNuvem'
import { fundirViagemNuvem } from '@/services/fundirViagemNuvem'
import { normalizarIdioma } from '@/i18n/tipos'
import type { Empresa, Veiculo, Viagem } from '@/types'
import { statusPeloGps } from '@/services/statusPeloGps'

describe('idioma', () => {
  it('normaliza valores conhecidos e cai em pt-BR', () => {
    expect(normalizarIdioma('en')).toBe('en')
    expect(normalizarIdioma('es')).toBe('es')
    expect(normalizarIdioma('pt')).toBe('pt-BR')
    expect(normalizarIdioma('xyz')).toBe('pt-BR')
  })
})
import {
  descricaoEhPontoFixoDeAeroporto,
  montarAeroportoDeMapa,
  montarPontoAeroporto,
  sugerirAeroportos,
} from '@/services/aeroportos'
import { enderecoEhAeroporto, enderecoProntoParaReserva } from '@/utils/endereco'
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

  it('respeita antecedência configurável (2h)', () => {
    const agora = new Date('2026-09-18T12:00:00.000Z')
    expect(validarAntecedenciaMinima('2026-09-18', '13:59', agora, 'UTC', 2).valido).toBe(false)
    expect(validarAntecedenciaMinima('2026-09-18', '14:00', agora, 'UTC', 2).valido).toBe(true)
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

  it('usa antecedência do admin (6h)', () => {
    const agora = new Date('2026-09-18T12:00:00.000Z')
    const slots = listarHorariosDisponiveis('2026-09-18', agora, 'UTC', 15, 6)
    expect(slots[0]).toBe('18:00')
    expect(slots.includes('17:45')).toBe(false)
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

  it('não trata o aeroporto como um ponto único', () => {
    const shell = enderecoProntoParaReserva({
      formatted: 'LAX · Los Angeles International Airport, Los Angeles, CA',
      latitude: Number.NaN,
      longitude: Number.NaN,
      source: 'mapbox',
      codigo_aeroporto: 'lax',
    })
    expect(shell.ok).toBe(false)

    const embarque = montarPontoAeroporto('lax', 't4', 'embarque')
    const desembarque = montarPontoAeroporto('lax', 't4', 'desembarque')
    expect(embarque).not.toBeNull()
    expect(desembarque).not.toBeNull()
    expect(enderecoProntoParaReserva(embarque).ok).toBe(true)
    expect(enderecoEhAeroporto(embarque)).toBe(true)
    expect(embarque!.formatted).toContain('Terminal 4')
    expect(embarque!.formatted).toContain('Embarque')
    const metros = calcularDistanciaKm(
      embarque!.latitude,
      embarque!.longitude,
      desembarque!.latitude,
      desembarque!.longitude,
    ) * 1000
    expect(metros).toBeGreaterThan(40)
    expect(embarque!.latitude).not.toBe(desembarque!.latitude)
  })

  it('completa aeroporto enquanto digita e não confunde rua', () => {
    expect(sugerirAeroportos('lax').some((item) => item.place_id === 'aero:lax')).toBe(true)
    expect(sugerirAeroportos('jfk').some((item) => item.place_id === 'aero:jfk')).toBe(true)
    expect(sugerirAeroportos('heathrow').some((item) => item.place_id === 'aero:lhr')).toBe(true)
    expect(sugerirAeroportos('terminal 4').map((item) => item.place_id)).toEqual(
      expect.arrayContaining(['aero:lax:t4', 'aero:ont:t4']),
    )
    expect(sugerirAeroportos('aeros way')).toEqual([])
    expect(sugerirAeroportos('world way')[0]?.place_id).toBe('aero:lax')
  })

  it('reconhece aeroporto mundial e não confunde Airport Blvd', () => {
    expect(descricaoEhPontoFixoDeAeroporto('John F. Kennedy International Airport')).toBe(true)
    expect(descricaoEhPontoFixoDeAeroporto('Airport Blvd, Los Angeles')).toBe(false)
    expect(montarPontoAeroporto('jfk', 'principal', 'desembarque')).not.toBeNull()
    const poi = montarAeroportoDeMapa(
      {
        formatted: 'Narita International Airport, Japan',
        latitude: 35.772,
        longitude: 140.3929,
        source: 'mapbox',
      },
      'origem',
    )
    expect(poi?.terminal_id).toBe('principal')
    expect(poi?.nivel_aeroporto).toBe('desembarque')
    expect(Number.isFinite(poi?.latitude)).toBe(true)
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

  it('não oferece van para empresa sem essa categoria na frota', () => {
    const empresas = [
      empresaBase({ id: 'sedan', latitude: 33.95, longitude: -118.4, categorias_ids: ['van', 'sedan'] }),
      empresaBase({ id: 'van', latitude: 34.04, longitude: -118.25, categorias_ids: ['van'] }),
    ]
    const frota: Veiculo[] = [
      {
        id: 'v1',
        empresa_id: 'sedan',
        marca: 'Mercedes',
        modelo: 'S',
        ano: 2024,
        categoria_id: 'sedan',
        capacidade: 3,
        ar_condicionado: true,
        bagageiro: true,
        fotos: [],
        status: 'disponivel',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'v2',
        empresa_id: 'van',
        marca: 'Mercedes',
        modelo: 'Sprinter',
        ano: 2024,
        categoria_id: 'van',
        capacidade: 12,
        ar_condicionado: true,
        bagageiro: true,
        fotos: [],
        status: 'disponivel',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]
    const { ordenadas } = ordenarEmpresasPorProximidade(
      empresas,
      origemLat,
      origemLng,
      'van',
      frota,
    )
    expect(ordenadas.map((item) => item.empresa.id)).toEqual(['van'])
  })

  it('empresa sem coords continua elegível (distância alta)', () => {
    const e = empresaBase({ id: 'x', latitude: 1, longitude: 1 })
    delete (e as { latitude?: number }).latitude
    expect(empresaElegivel(e, 'cat1').ok).toBe(true)
    const { ordenadas } = ordenarEmpresasPorProximidade([e], origemLat, origemLng, 'cat1')
    expect(ordenadas).toHaveLength(1)
    expect(ordenadas[0].distancia_km).toBe(9999)
  })
})

describe('status pelo gps', () => {
  const base = {
    id: 'v',
    codigo: 'JEM-1',
    cliente_id: 'c',
    categoria_id: 'cat',
    origem: 'A',
    destino: 'B',
    origem_lat: 34.05,
    origem_lng: -118.25,
    destino_lat: 34.1,
    destino_lng: -118.3,
    data_viagem: '2026-10-20',
    horario: '10:00',
    passageiros: 1,
    preco_base: 1,
    taxas: 0,
    preco_total: 1,
    comissao_percentual: 10,
    valor_plataforma: 0,
    valor_empresa: 1,
    payment_status: 'paid',
    version: 1,
    created_at: '2026-10-15T00:00:00Z',
    updated_at: '2026-10-15T00:00:00Z',
  } as Viagem

  it('não marca a caminho sozinho; marca chegou ao chegar no embarque', () => {
    expect(statusPeloGps({ ...base, status: 'motorista_atribuido' }, 34.2, -118.4)).toBeNull()
    expect(statusPeloGps({ ...base, status: 'motorista_a_caminho' }, 34.05, -118.25)).toBe(
      'motorista_chegou',
    )
  })

  it('inicia a viagem quando o carro sai do embarque com o passageiro', () => {
    expect(statusPeloGps({ ...base, status: 'passageiro_embarcou' }, 34.2, -118.4)).toBe(
      'viagem_em_andamento',
    )
  })

  it('não finaliza sozinho ao chegar no destino', () => {
    expect(statusPeloGps({ ...base, status: 'viagem_em_andamento' }, 34.1, -118.3)).toBeNull()
  })
})

describe('haversine', () => {
  it('calcula distância LAX → DTLA > 0', () => {
    const km = calcularDistanciaKm(33.9416, -118.4085, 34.0407, -118.2468)
    expect(km).toBeGreaterThan(10)
    expect(km).toBeLessThan(40)
  })
})

describe('endereço Mapbox', () => {
  it('preserva o número de 8423 Wilshire Blvd', () => {
    const endereco = interpretarFeatureMapbox({
      id: 'address.wilshire',
      place_name: '8423 Wilshire Boulevard, Beverly Hills, California 90211, United States',
      text: 'Wilshire Boulevard',
      address: '8423',
      center: [-118.373, 34.065],
      context: [
        { id: 'postcode.90211', text: '90211' },
        { id: 'place.beverly', text: 'Beverly Hills' },
        { id: 'region.ca', text: 'California', short_code: 'US-CA' },
      ],
    })
    expect(endereco?.numero).toBe('8423')
    expect(endereco?.rua).toBe('Wilshire Boulevard')
    expect(endereco?.cidade).toBe('Beverly Hills')
    expect(endereco?.estado).toBe('CA')
    expect(endereco?.cep).toBe('90211')
    expect(endereco?.formatted).toContain('8423')
    expect(endereco?.latitude).toBe(34.065)
    expect(endereco?.longitude).toBe(-118.373)
  })
})

describe('sincronia da viagem', () => {
  it('não deixa a nuvem atrasada desfazer um pagamento local', () => {
    const local = viagemBase({
      id: 'v1',
      cliente_id: 'c1',
      status: 'aguardando_empresa',
      payment_status: 'paid',
      version: 3,
    })
    const nuvem = viagemBase({
      id: 'v1',
      cliente_id: 'c1',
      status: 'pending_payment',
      payment_status: 'pending_payment',
      version: 1,
    })
    const fundida = fundirViagemNuvem(local, nuvem)
    expect(fundida.status).toBe('aguardando_empresa')
    expect(fundida.payment_status).toBe('paid')
  })

  it('aceita um status mais novo vindo da nuvem', () => {
    const local = viagemBase({
      id: 'v1',
      cliente_id: 'c1',
      status: 'aguardando_empresa',
      payment_status: 'paid',
      version: 2,
    })
    const nuvem = viagemBase({
      id: 'v1',
      cliente_id: 'c1',
      status: 'empresa_confirmada',
      payment_status: 'paid',
      version: 4,
      empresa_id: 'e1',
    })
    const fundida = fundirViagemNuvem(local, nuvem)
    expect(fundida.status).toBe('empresa_confirmada')
    expect(fundida.empresa_id).toBe('e1')
  })
})

describe('gravacao na nuvem', () => {
  const cliente = '22222222-2222-2222-2222-222222222201'
  const viagem = '3ad1a4d4-0782-42ea-95c2-ed0b554a3a00'
  const existentes = new Set([viagem])

  it('não envia histórico de viagem ausente nem de outro usuário', () => {
    expect(
      historicoPodeIrParaNuvem(
        { viagem_id: '00000000-0000-0000-0000-000000000099', usuario_id: cliente },
        cliente,
        existentes,
      ),
    ).toBe(false)
    expect(
      historicoPodeIrParaNuvem(
        { viagem_id: viagem, usuario_id: '44444444-4444-4444-4444-444444444402' },
        cliente,
        existentes,
      ),
    ).toBe(false)
    expect(
      historicoPodeIrParaNuvem({ viagem_id: viagem, usuario_id: cliente }, cliente, existentes),
    ).toBe(true)
    expect(historicoPodeIrParaNuvem({ viagem_id: viagem }, cliente, existentes)).toBe(true)
  })

  it('só atribui empresa que está cadastrada para receber', () => {
    const premier = '33333333-3333-3333-3333-333333333301'
    const ausente = '33333333-3333-3333-3333-333333333306'
    const ofertas = [
      { empresa_id: premier, viagem_id: viagem },
      { empresa_id: ausente, viagem_id: viagem },
    ]
    const filtradas = ofertasComEmpresaCadastrada(ofertas, new Set([premier]))
    expect(filtradas.map((item) => item.empresa_id)).toEqual([premier])
  })

  it('deixa a Ford Expedition na frota para a empresa receber a corrida', () => {
    const dados = criarDadosIniciais()
    const tem = dados.veiculos.some(
      (veiculo) =>
        veiculo.empresa_id === IDS.empresaLa &&
        veiculo.categoria_id === IDS.catExpedition &&
        veiculo.status !== 'inativo',
    )
    expect(tem).toBe(true)
  })

  it('não recria o veículo que a empresa excluiu', () => {
    const dados = criarDadosIniciais()
    const expedition = dados.veiculos.find(
      (veiculo) =>
        veiculo.empresa_id === IDS.empresaLa && veiculo.categoria_id === IDS.catExpedition,
    )
    expect(expedition).toBeTruthy()
    const deNovo = completarCatalogo({
      ...dados,
      veiculos: dados.veiculos.filter((veiculo) => veiculo.id !== expedition!.id),
      veiculosExcluidos: [expedition!.id],
    })
    expect(deNovo.veiculos.some((veiculo) => veiculo.id === expedition!.id)).toBe(false)
  })

  it('não deixa a oferta local aberta desfazer o aceite da nuvem', () => {
    const empresa = '33333333-3333-3333-3333-333333333301'
    const nuvem = [{ viagem_id: viagem, empresa_id: empresa, status: 'aceita' }]
    expect(
      ofertaLocalPodeSubir({ viagem_id: viagem, empresa_id: empresa, status: 'oferecida' }, nuvem),
    ).toBe(false)
    expect(
      ofertaLocalPodeSubir({ viagem_id: viagem, empresa_id: empresa, status: 'aceita' }, []),
    ).toBe(true)
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
