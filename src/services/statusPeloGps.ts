import { calcularDistanciaKm } from '@/services/mapasService'
import type { StatusViagem, Viagem } from '@/types'

const RAIO_CHEGADA_KM = 0.08
const RAIO_SAIDA_KM = 0.2

export function statusPeloGps(
  viagem: Viagem,
  latitude: number,
  longitude: number,
): StatusViagem | null {
  if (typeof viagem.origem_lat !== 'number' || typeof viagem.origem_lng !== 'number') return null
  const ateOrigem = calcularDistanciaKm(latitude, longitude, viagem.origem_lat, viagem.origem_lng)

  // "A caminho" só pelo botão do motorista — GPS não dispara no 1º tick.
  if (viagem.status === 'motorista_a_caminho' && ateOrigem <= RAIO_CHEGADA_KM) {
    return 'motorista_chegou'
  }
  if (viagem.status === 'passageiro_embarcou' && ateOrigem >= RAIO_SAIDA_KM) {
    return 'viagem_em_andamento'
  }
  return null
}
