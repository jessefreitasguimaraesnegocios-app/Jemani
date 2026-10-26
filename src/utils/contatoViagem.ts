import type { Viagem } from '@/types'

/** Extrai telefone gravado como "Contato: ..." nas observações da reserva. */
export function telefoneDaViagem(viagem: Pick<Viagem, 'observacoes'>): string | undefined {
  const texto = viagem.observacoes ?? ''
  const match = texto.match(/Contato:\s*([^\n|]+)/i)
  const valor = match?.[1]?.trim()
  return valor || undefined
}

export function rotuloRotaCliente(viagem: Pick<Viagem, 'origem' | 'destino' | 'modalidade'>): string {
  if (viagem.modalidade === 'hourly') {
    return `${viagem.origem} · Hourly Chauffeur`
  }
  return `${viagem.origem} → ${viagem.destino}`
}
