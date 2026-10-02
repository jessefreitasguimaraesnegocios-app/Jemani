import type { ChaveTraducao } from '@/i18n/mensagens'
import type { StatusViagem, Viagem } from '@/types'

export type GrupoHistorico = {
  id: string
  chaveTitulo: ChaveTraducao
  viagens: Viagem[]
}

export type ResumoHistorico = {
  total: number
  realizadas: number
  canceladas: number
  valor: number
}

const STATUS_CANCELADO: StatusViagem[] = ['cancelada', 'expired']

export function ordenarCorridasRecentes(viagens: Viagem[]): Viagem[] {
  return [...viagens].sort((a, b) => {
    const chaveA = `${a.data_viagem}T${a.horario}`
    const chaveB = `${b.data_viagem}T${b.horario}`
    return chaveB.localeCompare(chaveA) || b.created_at.localeCompare(a.created_at)
  })
}

export function agruparCorridasPorCliente(viagens: Viagem[]): Map<string, Viagem[]> {
  const mapa = new Map<string, Viagem[]>()
  for (const viagem of viagens) {
    const lista = mapa.get(viagem.cliente_id)
    if (lista) lista.push(viagem)
    else mapa.set(viagem.cliente_id, [viagem])
  }
  return mapa
}

export function agruparCorridasPorEmpresa(viagens: Viagem[]): Map<string, Viagem[]> {
  const mapa = new Map<string, Viagem[]>()
  for (const viagem of viagens) {
    if (!viagem.empresa_id) continue
    const lista = mapa.get(viagem.empresa_id)
    if (lista) lista.push(viagem)
    else mapa.set(viagem.empresa_id, [viagem])
  }
  return mapa
}

export function montarGruposHistorico(viagens: Viagem[]): GrupoHistorico[] {
  const proximas: Viagem[] = []
  const realizadas: Viagem[] = []
  const canceladas: Viagem[] = []

  for (const viagem of ordenarCorridasRecentes(viagens)) {
    if (viagem.status === 'viagem_finalizada') realizadas.push(viagem)
    else if (STATUS_CANCELADO.includes(viagem.status)) canceladas.push(viagem)
    else proximas.push(viagem)
  }

  return [
    { id: 'proximas', chaveTitulo: 'hist.proximas', viagens: proximas },
    { id: 'realizadas', chaveTitulo: 'hist.realizadas', viagens: realizadas },
    { id: 'canceladas', chaveTitulo: 'hist.canceladas', viagens: canceladas },
  ]
}

export function montarResumoHistorico(
  viagens: Viagem[],
  visao: 'cliente' | 'empresa',
): ResumoHistorico {
  let realizadas = 0
  let canceladas = 0
  let valor = 0

  for (const viagem of viagens) {
    if (viagem.status === 'viagem_finalizada') {
      realizadas += 1
      valor += visao === 'empresa' ? viagem.valor_empresa : viagem.preco_total
      continue
    }
    if (STATUS_CANCELADO.includes(viagem.status)) {
      canceladas += 1
    }
  }

  return {
    total: viagens.length,
    realizadas,
    canceladas,
    valor,
  }
}
