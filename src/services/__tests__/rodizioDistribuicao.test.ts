import { describe, expect, it } from 'vitest'
import {
  aplicarConfiguracaoDistribuicao,
  calcularCota,
  linhaInicialDistribuicao,
  podeReceberDistribuicao,
  reiniciarContadorLocal,
} from '@/services/controleDistribuicao'
import {
  contaNoLimite,
  criarEstadoRodizio,
  escolherProximaEmpresa,
  inicioPeriodoDistribuicao,
  processarComTrava,
} from '@/services/rodizioDistribuicao'

function relogio(data: Date, fuso = 'America/Los_Angeles') {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: fuso,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hourCycle: 'h23',
  }).format(data)
}

describe('período da distribuição', () => {
  it('abre o dia, a semana e o mês no fuso de Los Angeles', () => {
    const agora = new Date('2026-11-25T20:30:00Z')
    const dia = inicioPeriodoDistribuicao('diario', agora)
    const semana = inicioPeriodoDistribuicao('semanal', agora)
    const mes = inicioPeriodoDistribuicao('mensal', agora)

    expect(relogio(dia)).toContain('2026-11-25')
    expect(relogio(dia)).toContain('00:00')
    expect(relogio(semana)).toContain('2026-11-23')
    expect(relogio(semana)).toMatch(/Mon|seg/i)
    expect(relogio(mes)).toContain('2026-11-01')
    expect(relogio(mes)).toContain('00:00')
  })

  it('ainda está no dia anterior de Los Angeles antes das 8h UTC no horário de inverno', () => {
    const agora = new Date('2026-11-25T07:30:00Z')
    const dia = inicioPeriodoDistribuicao('diario', agora)
    expect(relogio(dia)).toContain('2026-11-24')
  })
})

describe('o que entra na cota', () => {
  it('conta só a corrida atribuída de fato à mesma empresa', () => {
    expect(contaNoLimite({ atribuida: true, mesmaEmpresa: true, status: 'empresa_confirmada' })).toBe(true)
    expect(contaNoLimite({ atribuida: true, mesmaEmpresa: true, status: 'viagem_finalizada' })).toBe(true)
    expect(contaNoLimite({ atribuida: true, mesmaEmpresa: true, status: 'cancelada' })).toBe(false)
    expect(contaNoLimite({ atribuida: true, mesmaEmpresa: true, status: 'expired' })).toBe(false)
    expect(contaNoLimite({ atribuida: true, mesmaEmpresa: false, status: 'empresa_confirmada' })).toBe(false)
    expect(contaNoLimite({ atribuida: false, mesmaEmpresa: true, status: 'empresa_confirmada' })).toBe(false)
  })

  it('marca o limite atingido e devolve a vaga quando o administrador reduz ou zera a contagem', () => {
    const base = {
      ...linhaInicialDistribuicao({
        id: 'a',
        nome_comercial: 'Empresa A',
        status: 'ativa',
        habilitada_receber: true,
      }),
      liberada: true,
      ligada: true,
      recebidas: 10,
      recebidasTotal: 10,
    }
    const apertada = aplicarConfiguracaoDistribuicao(base, {
      liberada: true,
      ilimitada: false,
      limite: 10,
      periodo: 'diario',
    })
    expect(apertada.limiteAtingido).toBe(true)
    expect(apertada.restante).toBe(0)
    expect(apertada.podeReceber).toBe(false)
    expect(apertada.recebidasTotal).toBe(10)

    const reiniciada = reiniciarContadorLocal(apertada)
    expect(reiniciada.recebidas).toBe(0)
    expect(reiniciada.recebidasTotal).toBe(10)
    expect(reiniciada.limiteAtingido).toBe(false)
    expect(reiniciada.restante).toBe(10)
    expect(calcularCota({ recebidas: 3, ilimitada: false, limite: 10 }).restante).toBe(7)
  })

  it('não libera quem estourou o limite diário da própria empresa', () => {
    expect(podeReceberDistribuicao({
      liberada: true,
      ligada: true,
      statusEmpresa: 'ativa',
      habilitadaReceber: true,
      limiteAtingido: false,
      limiteDiario: 2,
      recebidasHoje: 2,
    })).toBe(false)
  })
})

describe('rodízio com várias empresas ao mesmo tempo', () => {
  const empresas = [
    { empresaId: 'a', ultimaDistribuicaoEm: null, recebidas: 0, limite: 10 },
    { empresaId: 'b', ultimaDistribuicaoEm: null, recebidas: 0, limite: 15 },
    { empresaId: 'c', ultimaDistribuicaoEm: null, recebidas: 0, limite: 5 },
  ]

  it('reparte 30 corridas sem passar do teto e sem entregar a mesma corrida duas vezes', async () => {
    const estado = criarEstadoRodizio(empresas)
    const viagens = Array.from({ length: 40 }, (_, indice) => ({
      id: `v${indice}`,
      empresas: ['a', 'b', 'c'],
    }))

    const primeiro = processarComTrava(estado, viagens)
    const segundo = processarComTrava(estado, viagens)
    const [aceitas, bloqueadas] = await Promise.all([primeiro, segundo])

    expect(bloqueadas).toBe(0)
    expect(aceitas).toBe(30)
    expect(estado.empresas.get('a')?.recebidas).toBe(10)
    expect(estado.empresas.get('b')?.recebidas).toBe(15)
    expect(estado.empresas.get('c')?.recebidas).toBe(5)
    expect(new Set(estado.atribuicoes.keys()).size).toBe(30)
    expect(new Set(estado.atribuicoes.values())).toEqual(new Set(['a', 'b', 'c']))

    const ordem = [...estado.atribuicoes.values()]
    expect(ordem.slice(0, 6)).toEqual(['a', 'b', 'c', 'a', 'b', 'c'])
    expect(ordem.filter((id) => id === 'c')).toHaveLength(5)
    expect(ordem.filter((id) => id === 'a')).toHaveLength(10)
  })

  it('pula quem já bateu o limite e segue com as outras no mesmo lote', () => {
    const proxima = escolherProximaEmpresa([
      { empresaId: 'a', ultimaDistribuicaoEm: 1, recebidas: 10, limite: 10 },
      { empresaId: 'b', ultimaDistribuicaoEm: 3, recebidas: 4, limite: 15 },
      { empresaId: 'c', ultimaDistribuicaoEm: null, recebidas: 5, limite: 5 },
    ])
    expect(proxima).toBe('b')
  })

  it('não deixa a empresa sozinha na oferta furar a fila das próximas corridas compartilhadas', async () => {
    const estado = criarEstadoRodizio([
      { empresaId: 'a', ultimaDistribuicaoEm: null, recebidas: 0, limite: null },
      { empresaId: 'b', ultimaDistribuicaoEm: null, recebidas: 0, limite: null },
    ])
    await processarComTrava(estado, [
      { id: 'so-a', empresas: ['a'] },
      { id: 'compartilhada', empresas: ['a', 'b'] },
      { id: 'seguinte', empresas: ['a', 'b'] },
    ])
    expect(estado.atribuicoes.get('so-a')).toBe('a')
    expect(estado.atribuicoes.get('compartilhada')).toBe('b')
    expect(estado.atribuicoes.get('seguinte')).toBe('a')
  })
})
