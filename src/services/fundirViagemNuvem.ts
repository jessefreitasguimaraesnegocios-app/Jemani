import type { StatusViagem, Viagem } from '@/types'

const ORDEM_STATUS: StatusViagem[] = [
  'pending_payment',
  'expired',
  'solicitada',
  'paid',
  'aguardando_empresa',
  'oferta_enviada',
  'empresa_confirmada',
  'motorista_atribuido',
  'motorista_a_caminho',
  'motorista_chegou',
  'passageiro_embarcou',
  'viagem_em_andamento',
  'viagem_finalizada',
]

function ordemStatus(status: StatusViagem) {
  const indice = ORDEM_STATUS.indexOf(status)
  return indice < 0 ? 0 : indice
}

export function nuvemEstaAtrasada(atual: Viagem, nuvem: Viagem) {
  if (nuvem.status === 'cancelada') return false
  if (atual.status === 'cancelada') return true
  if (atual.payment_status === 'paid' && nuvem.payment_status !== 'paid' && nuvem.version <= atual.version) {
    return true
  }
  return ordemStatus(nuvem.status) < ordemStatus(atual.status) && nuvem.version <= atual.version
}

export function fundirViagemNuvem(atual: Viagem | undefined, nuvem: Viagem): Viagem {
  if (!atual) return nuvem
  if (nuvemEstaAtrasada(atual, nuvem)) {
    return {
      ...atual,
      empresa_id: atual.empresa_id ?? nuvem.empresa_id,
      motorista_id: atual.motorista_id ?? nuvem.motorista_id,
      veiculo_id: atual.veiculo_id ?? nuvem.veiculo_id,
      motorista_lat: atual.motorista_lat ?? nuvem.motorista_lat,
      motorista_lng: atual.motorista_lng ?? nuvem.motorista_lng,
    }
  }
  return {
    ...atual,
    status: nuvem.status,
    payment_status: nuvem.payment_status,
    empresa_id: nuvem.empresa_id ?? atual.empresa_id,
    motorista_id: nuvem.motorista_id,
    veiculo_id: nuvem.veiculo_id ?? atual.veiculo_id,
    motorista_lat: nuvem.motorista_lat ?? atual.motorista_lat,
    motorista_lng: nuvem.motorista_lng ?? atual.motorista_lng,
    comissao_percentual: nuvem.comissao_percentual,
    valor_plataforma: nuvem.valor_plataforma,
    valor_empresa: nuvem.valor_empresa,
    version: nuvem.version,
    updated_at: nuvem.updated_at,
  }
}
