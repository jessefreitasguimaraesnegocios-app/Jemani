import type { StatusViagem, Viagem } from '@/types'

const NO_MAPA: StatusViagem[] = [
  'motorista_a_caminho',
  'motorista_chegou',
  'passageiro_embarcou',
  'viagem_em_andamento',
]

export function corridaEstaNoMapa(status: StatusViagem) {
  return NO_MAPA.includes(status)
}

export function calcularPosicaoCorrida(viagem: Viagem) {
  if (!corridaEstaNoMapa(viagem.status)) return null
  if (typeof viagem.motorista_lat !== 'number' || typeof viagem.motorista_lng !== 'number') {
    return null
  }
  return { latitude: viagem.motorista_lat, longitude: viagem.motorista_lng }
}
