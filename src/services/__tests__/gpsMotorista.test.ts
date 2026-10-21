import { afterEach, describe, expect, it } from 'vitest'
import {
  deveGravarPosicaoTurnoNuvem,
  deveGravarPosicaoViagemNuvem,
  HEARTBEAT_NUVEM_CORRIDA_MS,
  INTERVALO_NUVEM_CORRIDA_MS,
  INTERVALO_NUVEM_TURNO_OCIOSO_MS,
  limparControleGpsMotorista,
  registrarEnvioPosicaoTurno,
  registrarEnvioPosicaoViagem,
} from '@/services/gpsMotorista'

describe('gpsMotorista — throttle de nuvem', () => {
  afterEach(() => {
    limparControleGpsMotorista()
  })

  it('permite o primeiro envio da corrida e bloqueia o imediato seguinte', () => {
    const t0 = 1_000_000
    expect(deveGravarPosicaoViagemNuvem('v1', -23.5, -46.6, t0)).toBe(true)
    registrarEnvioPosicaoViagem('v1', -23.5, -46.6, t0)
    expect(deveGravarPosicaoViagemNuvem('v1', -23.5001, -46.6001, t0 + 5_000)).toBe(false)
  })

  it('permite novo envio após intervalo e deslocamento relevante', () => {
    const t0 = 2_000_000
    registrarEnvioPosicaoViagem('v2', -23.5, -46.6, t0)
    expect(
      deveGravarPosicaoViagemNuvem('v2', -23.501, -46.601, t0 + INTERVALO_NUVEM_CORRIDA_MS),
    ).toBe(true)
  })

  it('faz heartbeat em corrida sem grande deslocamento', () => {
    const t0 = 3_000_000
    registrarEnvioPosicaoViagem('v3', -23.5, -46.6, t0)
    expect(
      deveGravarPosicaoViagemNuvem('v3', -23.50001, -46.60001, t0 + HEARTBEAT_NUVEM_CORRIDA_MS),
    ).toBe(true)
  })

  it('no turno ocioso exige intervalo maior', () => {
    const t0 = 4_000_000
    expect(deveGravarPosicaoTurnoNuvem('m1', -23.5, -46.6, false, t0)).toBe(true)
    registrarEnvioPosicaoTurno('m1', -23.5, -46.6, t0)
    expect(
      deveGravarPosicaoTurnoNuvem('m1', -23.501, -46.601, false, t0 + INTERVALO_NUVEM_CORRIDA_MS),
    ).toBe(false)
    expect(
      deveGravarPosicaoTurnoNuvem(
        'm1',
        -23.502,
        -46.602,
        false,
        t0 + INTERVALO_NUVEM_TURNO_OCIOSO_MS,
      ),
    ).toBe(true)
  })
})
