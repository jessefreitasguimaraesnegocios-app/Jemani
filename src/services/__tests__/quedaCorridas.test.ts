import { describe, expect, it } from 'vitest'
import {
  avancarQuedaLocal,
  escolherNaFila,
  montarCiclo,
  registrarQuedaLocal,
  type CandidataQueda,
} from '@/services/quedaCorridas'

function candidata(
  empresaId: string,
  extra: Partial<CandidataQueda> = {},
): CandidataQueda {
  return {
    empresaId,
    ordem: empresaId.charCodeAt(0),
    prioridade: 1,
    participa: true,
    recebidas: 0,
    limite: null,
    intervaloMinutos: null,
    ultimaQuedaEm: null,
    ...extra,
  }
}

describe('modos de queda das corridas', () => {
  const fila = [candidata('a'), candidata('b'), candidata('c')]

  it('no rodízio igual entrega uma por vez e só volta na primeira depois de todas', () => {
    expect(montarCiclo(fila, 'rodizio')).toEqual(['a', 'b', 'c'])
    const agora = Date.parse('2026-11-26T18:00:00Z')
    const primeira = escolherNaFila(fila, 'rodizio', 0, agora)
    const segunda = escolherNaFila(fila, 'rodizio', primeira?.ponteiro ?? 0, agora)
    const terceira = escolherNaFila(fila, 'rodizio', segunda?.ponteiro ?? 0, agora)
    const quarta = escolherNaFila(fila, 'rodizio', terceira?.ponteiro ?? 0, agora)
    expect([primeira?.empresaId, segunda?.empresaId, terceira?.empresaId, quarta?.empresaId]).toEqual([
      'a',
      'b',
      'c',
      'a',
    ])
  })

  it('na prioridade a empresa mais alta volta antes de fechar a fila', () => {
    const ciclo = montarCiclo(
      [
        candidata('a', { prioridade: 2 }),
        candidata('b'),
        candidata('c'),
      ],
      'prioridade',
    )
    expect(ciclo).toEqual(['a', 'b', 'a', 'c'])
  })

  it('no destaque a prioritária recebe, passa para uma comum e volta', () => {
    const ciclo = montarCiclo(
      [
        candidata('x', { prioridade: 2, ordem: 1 }),
        candidata('b', { ordem: 2 }),
        candidata('c', { ordem: 3 }),
      ],
      'destaque',
    )
    expect(ciclo).toEqual(['x', 'b', 'x', 'c'])
  })

  it('pula quem bateu a quantidade ou ainda está no intervalo', () => {
    const agora = Date.parse('2026-11-26T18:00:00Z')
    const proxima = escolherNaFila(
      [
        candidata('a', { recebidas: 2, limite: 2 }),
        candidata('b', { ultimaQuedaEm: agora - 10 * 60_000, intervaloMinutos: 30 }),
        candidata('c'),
      ],
      'rodizio',
      0,
      agora,
    )
    expect(proxima?.empresaId).toBe('c')
  })

  it('depois da recusa a mesma corrida segue para a próxima da fila', () => {
    const agora = Date.parse('2026-11-26T18:00:00Z')
    const primeira = registrarQuedaLocal({
      viagemId: 'viagem-1',
      elegiveis: ['a', 'b', 'c'],
      agora,
    })
    const seguinte = avancarQuedaLocal({
      viagemId: 'viagem-1',
      empresaId: primeira ?? 'a',
      elegiveis: ['a', 'b', 'c'],
      agora: agora + 1000,
    })
    expect(primeira).toBe('a')
    expect(seguinte).toBe('b')
    expect(
      registrarQuedaLocal({
        viagemId: 'viagem-1',
        elegiveis: ['a', 'b', 'c'],
        agora: agora + 2000,
      }),
    ).toBe('b')
  })
})
