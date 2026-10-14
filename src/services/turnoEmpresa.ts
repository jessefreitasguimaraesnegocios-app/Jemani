import type { Motorista, StatusViagem, TurnoMotorista, Veiculo, Viagem } from '@/types'
import { calcularPosicaoCorrida, corridaEstaNoMapa } from '@/services/posicaoCorridaAoVivo'

const EM_SERVICO: StatusViagem[] = [
  'motorista_atribuido',
  'motorista_a_caminho',
  'motorista_chegou',
  'passageiro_embarcou',
  'viagem_em_andamento',
]

export function turnoAberto(turnos: TurnoMotorista[], motoristaId: string) {
  return turnos.find((turno) => turno.motorista_id === motoristaId && turno.online)
}

export function corridaEmServico(viagens: Viagem[], motoristaId: string) {
  return viagens.find(
    (viagem) => viagem.motorista_id === motoristaId && EM_SERVICO.includes(viagem.status),
  )
}

export function listarMotoristasOnline(
  motoristas: Motorista[],
  empresaId: string,
  turnos: TurnoMotorista[],
  viagens: Viagem[],
) {
  return motoristas.filter(
    (motorista) =>
      motorista.empresa_id === empresaId &&
      (turnoAberto(turnos, motorista.id) || corridaEmServico(viagens, motorista.id)),
  )
}

export function veiculoDoMotorista(
  motoristaId: string,
  turnos: TurnoMotorista[],
  viagens: Viagem[],
  veiculos: Veiculo[],
) {
  const turno = turnoAberto(turnos, motoristaId)
  const corrida = corridaEmServico(viagens, motoristaId)
  const veiculoId = corrida?.veiculo_id ?? turno?.veiculo_id
  return veiculos.find((veiculo) => veiculo.id === veiculoId)
}

export function inicioDoTurno(motoristaId: string, turnos: TurnoMotorista[], viagens: Viagem[]) {
  const turno = turnoAberto(turnos, motoristaId)
  if (turno) return turno.inicio
  return corridaEmServico(viagens, motoristaId)?.updated_at
}

export function posicaoDoMotorista(
  motoristaId: string,
  turnos: TurnoMotorista[],
  viagens: Viagem[],
) {
  const corrida = viagens.find(
    (viagem) => viagem.motorista_id === motoristaId && corridaEstaNoMapa(viagem.status),
  )
  if (corrida) {
    const naRota = calcularPosicaoCorrida(corrida)
    if (naRota) return naRota
  }
  const turno = turnoAberto(turnos, motoristaId)
  if (typeof turno?.latitude === 'number' && typeof turno.longitude === 'number') {
    return { latitude: turno.latitude, longitude: turno.longitude }
  }
  return null
}
