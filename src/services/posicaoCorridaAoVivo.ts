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

function entre(inicio: number, fim: number, passo: number) {
  return inicio + (fim - inicio) * passo
}

export function calcularPosicaoCorrida(viagem: Viagem, agora: number) {
  if (!corridaEstaNoMapa(viagem.status)) return null

  const origemLat = viagem.origem_lat
  const origemLng = viagem.origem_lng
  const destinoLat = viagem.destino_lat
  const destinoLng = viagem.destino_lng
  const temOrigem = typeof origemLat === 'number' && typeof origemLng === 'number'
  const temDestino = typeof destinoLat === 'number' && typeof destinoLng === 'number'
  const temMotorista =
    typeof viagem.motorista_lat === 'number' && typeof viagem.motorista_lng === 'number'

  if (temMotorista) return { latitude: viagem.motorista_lat!, longitude: viagem.motorista_lng! }

  if (viagem.status === 'motorista_chegou' || viagem.status === 'passageiro_embarcou') {
    if (!temOrigem) return null
    return { latitude: origemLat!, longitude: origemLng! }
  }

  if (viagem.status === 'motorista_a_caminho') {
    const passo = (agora % 42000) / 42000
    if (!temOrigem) return null
    return {
      latitude: origemLat! + 0.028 * (1 - passo),
      longitude: origemLng! - 0.028 * (1 - passo),
    }
  }

  if (viagem.status === 'viagem_em_andamento' && temOrigem && temDestino) {
    const passo = (agora % 64000) / 64000
    return {
      latitude: entre(origemLat!, destinoLat!, passo),
      longitude: entre(origemLng!, destinoLng!, passo),
    }
  }

  return null
}
