import type { HistoricoDistribuicao, HistoricoStatus, StatusViagem, Viagem } from '@/types'

export type ColunaQuadro = {
  id: string
  chaveTitulo:
    | 'admin.viagens.col.pagamento'
    | 'admin.viagens.col.fila'
    | 'admin.viagens.col.empresa'
    | 'admin.viagens.col.rota'
    | 'admin.viagens.col.concluidas'
    | 'admin.viagens.col.encerradas'
  status: StatusViagem[]
}

export const COLUNAS_QUADRO: ColunaQuadro[] = [
  { id: 'pagamento', chaveTitulo: 'admin.viagens.col.pagamento', status: ['pending_payment'] },
  {
    id: 'fila',
    chaveTitulo: 'admin.viagens.col.fila',
    status: ['paid', 'solicitada', 'aguardando_empresa', 'oferta_enviada'],
  },
  {
    id: 'empresa',
    chaveTitulo: 'admin.viagens.col.empresa',
    status: ['empresa_confirmada', 'motorista_atribuido'],
  },
  {
    id: 'rota',
    chaveTitulo: 'admin.viagens.col.rota',
    status: [
      'motorista_a_caminho',
      'motorista_chegou',
      'passageiro_embarcou',
      'viagem_em_andamento',
    ],
  },
  { id: 'concluidas', chaveTitulo: 'admin.viagens.col.concluidas', status: ['viagem_finalizada'] },
  { id: 'encerradas', chaveTitulo: 'admin.viagens.col.encerradas', status: ['cancelada', 'expired'] },
]

const ORDEM_STATUS: StatusViagem[] = COLUNAS_QUADRO.flatMap((coluna) => coluna.status)

export function acharColunaDoStatus(status: StatusViagem): ColunaQuadro | undefined {
  return COLUNAS_QUADRO.find((coluna) => coluna.status.includes(status))
}

export function agruparCorridasPorColuna(viagens: Viagem[]): Map<string, Viagem[]> {
  const mapa = new Map<string, Viagem[]>()
  for (const coluna of COLUNAS_QUADRO) mapa.set(coluna.id, [])
  for (const viagem of viagens) {
    const coluna = acharColunaDoStatus(viagem.status)
    if (!coluna) continue
    mapa.get(coluna.id)!.push(viagem)
  }
  for (const lista of mapa.values()) {
    lista.sort((a, b) => {
      const chaveA = `${a.data_viagem}T${a.horario}`
      const chaveB = `${b.data_viagem}T${b.horario}`
      return chaveB.localeCompare(chaveA) || b.created_at.localeCompare(a.created_at)
    })
  }
  return mapa
}

export function contarCorridasPorStatus(viagens: Viagem[]): Array<{
  status: StatusViagem
  quantidade: number
}> {
  const mapa = new Map<StatusViagem, number>()
  for (const viagem of viagens) {
    mapa.set(viagem.status, (mapa.get(viagem.status) ?? 0) + 1)
  }
  return ORDEM_STATUS.filter((status) => (mapa.get(status) ?? 0) > 0).map((status) => ({
    status,
    quantidade: mapa.get(status) ?? 0,
  }))
}

export function agruparHistoricosPorViagem(
  historicos: HistoricoStatus[],
): Map<string, HistoricoStatus[]> {
  const mapa = new Map<string, HistoricoStatus[]>()
  for (const item of historicos) {
    const lista = mapa.get(item.viagem_id)
    if (lista) lista.push(item)
    else mapa.set(item.viagem_id, [item])
  }
  for (const lista of mapa.values()) {
    lista.sort((a, b) => a.created_at.localeCompare(b.created_at))
  }
  return mapa
}

export function agruparDistribuicoesPorViagem(
  distribuicoes: HistoricoDistribuicao[],
): Map<string, HistoricoDistribuicao[]> {
  const mapa = new Map<string, HistoricoDistribuicao[]>()
  for (const item of distribuicoes) {
    const lista = mapa.get(item.viagem_id)
    if (lista) lista.push(item)
    else mapa.set(item.viagem_id, [item])
  }
  for (const lista of mapa.values()) {
    lista.sort((a, b) => a.distancia_km - b.distancia_km)
  }
  return mapa
}

export function corridaCorrespondeBusca(
  viagem: Viagem,
  termo: string,
  nomeCliente?: string,
  emailCliente?: string,
  nomeEmpresa?: string,
): boolean {
  const normalizado = termo.trim().toLowerCase()
  if (!normalizado) return true
  const campos = [
    viagem.codigo,
    viagem.origem,
    viagem.destino,
    viagem.horario,
    viagem.data_viagem,
    viagem.nome_passageiro,
    viagem.numero_voo,
    nomeCliente,
    emailCliente,
    nomeEmpresa,
  ]
  return campos.some((campo) => campo?.toLowerCase().includes(normalizado))
}
