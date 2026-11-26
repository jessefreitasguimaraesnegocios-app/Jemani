import type {
  CategoriaVeiculo,
  Comissao,
  Empresa,
  Pagamento,
  StatusPagamento,
  Viagem,
} from '@/types'

export type TipoPagamentoFiltro = StatusPagamento | 'todos'
export type VisaoFinanceiro = 'empresas' | 'tipos' | 'lancamentos'
export type QuinzenaFinanceiro = 'todas' | 'q1' | 'q2'

export type FiltrosLancamentoFinanceiro = {
  empresaId: string
  tipo: TipoPagamentoFiltro
  categoriaId: string
  busca: string
  /** Ano civil; vazio = qualquer período. */
  ano?: number | null
  /** Mês 1–12; exige ano. */
  mes?: number | null
  quinzena?: QuinzenaFinanceiro
}

export type LancamentoFinanceiro = {
  pagamento: Pagamento
  viagem?: Viagem
  empresa?: Empresa
  categoria?: CategoriaVeiculo
  comissao?: Comissao
  /** Valor montado a partir da corrida, sem linha de pagamento. */
  daCorrida?: boolean
}

export type GrupoFinanceiro = {
  id: string
  titulo: string
  subtitulo?: string
  lancamentos: LancamentoFinanceiro[]
  volume: number
  comissao: number
  valorEmpresa: number
  quantidade: number
}

export type ResumoFinanceiro = {
  volume: number
  comissao: number
  valorEmpresa: number
  pagos: number
  pendentes: number
  testes: number
  quantidade: number
}

const ROTULOS_STATUS_PAGAMENTO: Record<StatusPagamento, string> = {
  pendente: 'Pendente',
  pending_payment: 'Aguardando pagamento',
  pago: 'Pago',
  falhou: 'Falhou',
  reembolsado: 'Reembolsado',
  teste: 'Teste',
}

const ROTULOS_PROVEDOR: Record<Pagamento['provider'], string> = {
  stripe: 'Stripe',
  asaas: 'Asaas',
  teste: 'Teste',
  dev_simulado: 'DEV simulado',
}

export function rotuloStatusPagamento(status: StatusPagamento): string {
  return ROTULOS_STATUS_PAGAMENTO[status] ?? status
}

export function rotuloProvedor(provider: Pagamento['provider']): string {
  return ROTULOS_PROVEDOR[provider] ?? provider
}

const STATUS_FORA_DO_VOLUME = new Set<Viagem['status']>([
  'cancelada',
  'expired',
  'pending_payment',
  'solicitada',
])

/** Corrida que entra no volume quando não há registro de pagamento. */
export function viagemContaNoVolume(viagem: Viagem): boolean {
  if (viagem.status === 'cancelada' || viagem.status === 'expired') return false
  if (
    viagem.payment_status === 'refunded' ||
    viagem.payment_status === 'failed' ||
    viagem.payment_status === 'expired'
  ) {
    return false
  }
  if (viagem.payment_status === 'paid') return true
  if (STATUS_FORA_DO_VOLUME.has(viagem.status)) return false
  return (Number(viagem.preco_total) || 0) > 0
}

function statusPagamentoDaViagem(viagem: Viagem): StatusPagamento {
  switch (viagem.payment_status) {
    case 'paid':
      return 'pago'
    case 'pending_payment':
      return 'pending_payment'
    case 'failed':
      return 'falhou'
    case 'refunded':
      return 'reembolsado'
    default:
      return 'pendente'
  }
}

function pagamentoDaCorrida(viagem: Viagem, comissao?: Comissao): Pagamento {
  return {
    id: `viagem:${viagem.id}`,
    booking_id: viagem.id,
    amount: Number(viagem.preco_total) || Number(comissao?.valor_viagem) || 0,
    platform_fee: Number(viagem.valor_plataforma) || Number(comissao?.valor_plataforma) || 0,
    company_amount: Number(viagem.valor_empresa) || Number(comissao?.valor_empresa) || 0,
    status: statusPagamentoDaViagem(viagem),
    payment_method: '',
    provider: 'stripe',
    created_at: viagem.created_at,
    updated_at: viagem.updated_at,
  }
}

function idEmpresaDoLancamento(item: LancamentoFinanceiro): string | undefined {
  return item.empresa?.id ?? item.viagem?.empresa_id ?? item.comissao?.empresa_id
}

export function valorVolumeLancamento(item: LancamentoFinanceiro): number {
  return (
    Number(item.pagamento.amount) ||
    Number(item.viagem?.preco_total) ||
    Number(item.comissao?.valor_viagem) ||
    0
  )
}

export function valorComissaoLancamento(item: LancamentoFinanceiro): number {
  return (
    Number(item.pagamento.platform_fee) ||
    Number(item.viagem?.valor_plataforma) ||
    Number(item.comissao?.valor_plataforma) ||
    0
  )
}

export function valorEmpresaLancamento(item: LancamentoFinanceiro): number {
  return (
    Number(item.pagamento.company_amount) ||
    Number(item.viagem?.valor_empresa) ||
    Number(item.comissao?.valor_empresa) ||
    0
  )
}

export function montarLancamentosFinanceiros(
  pagamentos: Pagamento[],
  viagens: Viagem[],
  empresas: Empresa[],
  categorias: CategoriaVeiculo[],
  comissoes: Comissao[],
): LancamentoFinanceiro[] {
  const mapaViagens = new Map(viagens.map((v) => [v.id, v]))
  const mapaEmpresas = new Map(empresas.map((e) => [e.id, e]))
  const mapaCategorias = new Map(categorias.map((c) => [c.id, c]))
  const mapaComissoes = new Map(comissoes.map((c) => [c.viagem_id, c]))
  const pagamentosPorReserva = new Map<string, Pagamento[]>()

  for (const pagamento of pagamentos) {
    const lista = pagamentosPorReserva.get(pagamento.booking_id) ?? []
    lista.push(pagamento)
    pagamentosPorReserva.set(pagamento.booking_id, lista)
  }

  const usados = new Set<string>()
  const itens: LancamentoFinanceiro[] = []

  function montarItem(
    pagamento: Pagamento,
    viagem: Viagem | undefined,
    daCorrida: boolean,
  ): LancamentoFinanceiro {
    const comissao = mapaComissoes.get(pagamento.booking_id)
    const empresaId = viagem?.empresa_id ?? comissao?.empresa_id
    return {
      pagamento,
      viagem,
      empresa: empresaId ? mapaEmpresas.get(empresaId) : undefined,
      categoria: viagem ? mapaCategorias.get(viagem.categoria_id) : undefined,
      comissao,
      daCorrida,
    }
  }

  for (const viagem of viagens) {
    const registros = pagamentosPorReserva.get(viagem.id) ?? []
    if (registros.length) {
      for (const pagamento of registros) {
        usados.add(pagamento.id)
        itens.push(montarItem(pagamento, viagem, false))
      }
      continue
    }
    if (!viagemContaNoVolume(viagem)) continue
    const comissao = mapaComissoes.get(viagem.id)
    itens.push(montarItem(pagamentoDaCorrida(viagem, comissao), viagem, true))
  }

  for (const pagamento of pagamentos) {
    if (usados.has(pagamento.id)) continue
    itens.push(montarItem(pagamento, mapaViagens.get(pagamento.booking_id), false))
  }

  return itens.sort((a, b) => {
    const dataA = `${a.viagem?.data_viagem ?? a.pagamento.created_at ?? ''}T${a.viagem?.horario ?? ''}`
    const dataB = `${b.viagem?.data_viagem ?? b.pagamento.created_at ?? ''}T${b.viagem?.horario ?? ''}`
    return dataB.localeCompare(dataA)
  })
}

function dataReferenciaLancamento(item: LancamentoFinanceiro): string | undefined {
  if (item.viagem?.data_viagem) return item.viagem.data_viagem
  const criado = item.pagamento.created_at
  return criado ? criado.slice(0, 10) : undefined
}

export function filtrarLancamentos(
  lancamentos: LancamentoFinanceiro[],
  filtros: FiltrosLancamentoFinanceiro,
): LancamentoFinanceiro[] {
  const termo = filtros.busca.trim().toLowerCase()
  const quinzena = filtros.quinzena ?? 'todas'
  return lancamentos.filter((item) => {
    const empresaId = idEmpresaDoLancamento(item)
    if (filtros.empresaId === 'sem_empresa') {
      if (empresaId || item.viagem?.status === 'parceiro_externo') return false
    } else if (filtros.empresaId === 'parceiros_externos') {
      if (item.viagem?.status !== 'parceiro_externo') return false
    } else if (filtros.empresaId && empresaId !== filtros.empresaId) {
      return false
    }
    if (filtros.tipo !== 'todos' && item.pagamento.status !== filtros.tipo) return false
    if (filtros.categoriaId && item.categoria?.id !== filtros.categoriaId) return false

    if (filtros.ano && filtros.mes) {
      const data = dataReferenciaLancamento(item)
      if (!data) return false
      const [anoStr, mesStr, diaStr] = data.split('-')
      const ano = Number(anoStr)
      const mes = Number(mesStr)
      const dia = Number(diaStr)
      if (ano !== filtros.ano || mes !== filtros.mes) return false
      if (quinzena === 'q1' && !(dia >= 1 && dia <= 15)) return false
      if (quinzena === 'q2' && !(dia >= 16)) return false
    }

    if (!termo) return true
    const campos = [
      item.daCorrida ? undefined : item.pagamento.payment_id,
      item.daCorrida ? undefined : item.pagamento.provider,
      item.daCorrida ? undefined : item.pagamento.payment_method,
      item.viagem?.codigo,
      item.empresa?.nome_comercial,
      item.categoria?.nome,
      rotuloStatusPagamento(item.pagamento.status),
    ]
    return campos.some((campo) => campo?.toLowerCase().includes(termo))
  })
}

export function montarResumoFinanceiro(lancamentos: LancamentoFinanceiro[]): ResumoFinanceiro {
  let volume = 0
  let comissao = 0
  let valorEmpresa = 0
  let pagos = 0
  let pendentes = 0
  let testes = 0

  for (const item of lancamentos) {
    volume += valorVolumeLancamento(item)
    comissao += valorComissaoLancamento(item)
    valorEmpresa += valorEmpresaLancamento(item)
    if (item.pagamento.status === 'pago' || item.pagamento.status === 'teste') pagos += 1
    if (
      item.pagamento.status === 'pendente' ||
      item.pagamento.status === 'pending_payment'
    ) {
      pendentes += 1
    }
    if (item.pagamento.status === 'teste' || item.pagamento.provider === 'dev_simulado') {
      testes += 1
    }
  }

  return {
    volume,
    comissao,
    valorEmpresa,
    pagos,
    pendentes,
    testes,
    quantidade: lancamentos.length,
  }
}

export function agruparPorEmpresa(lancamentos: LancamentoFinanceiro[]): GrupoFinanceiro[] {
  const mapa = new Map<string, GrupoFinanceiro>()
  for (const item of lancamentos) {
    const parceiroExterno = item.viagem?.status === 'parceiro_externo'
    const empresaId = idEmpresaDoLancamento(item)
    const id = parceiroExterno
      ? `parceiro:${empresaId ?? 'sem_empresa'}`
      : (empresaId ?? 'sem_empresa')
    const titulo = parceiroExterno
      ? item.empresa
        ? `Parceiro externo · ${item.empresa.nome_comercial}`
        : 'Parceiros externos'
      : (item.empresa?.nome_comercial ?? 'Sem empresa atribuída')
    const atual = mapa.get(id) ?? {
      id,
      titulo,
      subtitulo: parceiroExterno
        ? 'Repasse manual · comissão da plataforma'
        : item.empresa?.cidade,
      lancamentos: [],
      volume: 0,
      comissao: 0,
      valorEmpresa: 0,
      quantidade: 0,
    }
    atual.lancamentos.push(item)
    atual.volume += valorVolumeLancamento(item)
    atual.comissao += valorComissaoLancamento(item)
    atual.valorEmpresa += valorEmpresaLancamento(item)
    atual.quantidade += 1
    mapa.set(id, atual)
  }
  return [...mapa.values()].sort((a, b) => b.volume - a.volume)
}

export function agruparPorTipo(lancamentos: LancamentoFinanceiro[]): GrupoFinanceiro[] {
  const mapa = new Map<string, GrupoFinanceiro>()
  for (const item of lancamentos) {
    const id = item.pagamento.status
    const atual = mapa.get(id) ?? {
      id,
      titulo: rotuloStatusPagamento(item.pagamento.status),
      lancamentos: [],
      volume: 0,
      comissao: 0,
      valorEmpresa: 0,
      quantidade: 0,
    }
    atual.lancamentos.push(item)
    atual.volume += valorVolumeLancamento(item)
    atual.comissao += valorComissaoLancamento(item)
    atual.valorEmpresa += valorEmpresaLancamento(item)
    atual.quantidade += 1
    mapa.set(id, atual)
  }
  return [...mapa.values()].sort((a, b) => b.quantidade - a.quantidade)
}

export function listarTiposPresentes(lancamentos: LancamentoFinanceiro[]): StatusPagamento[] {
  const set = new Set<StatusPagamento>()
  for (const item of lancamentos) set.add(item.pagamento.status)
  return [...set]
}
