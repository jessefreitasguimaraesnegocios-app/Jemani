import type { StatusViagem, Viagem } from '@/types'

const STATUS_HISTORICO: StatusViagem[] = ['viagem_finalizada', 'cancelada', 'expired']

const STATUS_ANDAMENTO: StatusViagem[] = [
  'motorista_a_caminho',
  'motorista_chegou',
  'passageiro_embarcou',
  'viagem_em_andamento',
]

export function viagemNoHistorico(viagem: Viagem): boolean {
  return STATUS_HISTORICO.includes(viagem.status)
}

export function viagemEmAndamento(viagem: Viagem): boolean {
  return STATUS_ANDAMENTO.includes(viagem.status)
}

export function instanteDaViagem(viagem: Viagem): number {
  const hora = (viagem.horario || '00:00').slice(0, 5)
  const valor = Date.parse(`${viagem.data_viagem}T${hora}:00`)
  return Number.isNaN(valor) ? 0 : valor
}

export function separarAgendamentos(viagens: Viagem[]) {
  const historico = viagens
    .filter(viagemNoHistorico)
    .sort((a, b) => instanteDaViagem(b) - instanteDaViagem(a))

  const ativas = viagens.filter((viagem) => !viagemNoHistorico(viagem))
  const emAndamento = ativas
    .filter(viagemEmAndamento)
    .sort((a, b) => instanteDaViagem(a) - instanteDaViagem(b))
  const agora = Date.now()
  const futuras = ativas
    .filter((viagem) => !viagemEmAndamento(viagem) && instanteDaViagem(viagem) >= agora)
    .sort((a, b) => instanteDaViagem(a) - instanteDaViagem(b))
  const abertas = ativas
    .filter((viagem) => !viagemEmAndamento(viagem) && instanteDaViagem(viagem) < agora)
    .sort((a, b) => instanteDaViagem(b) - instanteDaViagem(a))

  const fila = [...emAndamento, ...futuras, ...abertas]
  return {
    proxima: fila[0] ?? null,
    outras: fila.slice(1),
    historico,
  }
}
