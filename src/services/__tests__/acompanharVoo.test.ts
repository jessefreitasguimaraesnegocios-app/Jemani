import { describe, expect, it } from 'vitest'
import { calcularProgressoVoo } from '@/services/acompanharVoo'

describe('calcularProgressoVoo', () => {
  it('retorna 0 antes da decolagem', () => {
    const decolagem = new Date('2026-10-21T18:00:00.000Z')
    const pouso = new Date('2026-10-21T22:00:00.000Z')
    const agora = new Date('2026-10-21T17:00:00.000Z')
    expect(calcularProgressoVoo(decolagem, pouso, agora).progresso).toBe(0)
  })

  it('retorna metade no meio do voo', () => {
    const decolagem = new Date('2026-10-21T18:00:00.000Z')
    const pouso = new Date('2026-10-21T22:00:00.000Z')
    const agora = new Date('2026-10-21T20:00:00.000Z')
    const calc = calcularProgressoVoo(decolagem, pouso, agora)
    expect(calc.progresso).toBe(0.5)
    expect(calc.minutosDecorridos).toBe(120)
    expect(calc.minutosRestantes).toBe(120)
  })

  it('retorna 1 depois do pouso', () => {
    const decolagem = new Date('2026-10-21T18:00:00.000Z')
    const pouso = new Date('2026-10-21T22:00:00.000Z')
    const agora = new Date('2026-10-21T23:00:00.000Z')
    expect(calcularProgressoVoo(decolagem, pouso, agora).progresso).toBe(1)
  })
})
