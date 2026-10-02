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

export type LancamentoFinanceiro = {
  pagamento: Pagamento
  viagem?: Viagem
  empresa?: Empresa
  categoria?: CategoriaVeiculo
  comissao?: Comissao
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

  return [...pagamentos]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((pagamento) => {
      const viagem = mapaViagens.get(pagamento.booking_id)
      const empresaId = viagem?.empresa_id ?? mapaComissoes.get(pagamento.booking_id)?.empresa_id
      return {
        pagamento,
        viagem,
        empresa: empresaId ? mapaEmpresas.get(empresaId) : undefined,
        categoria: viagem ? mapaCategorias.get(viagem.categoria_id) : undefined,
        comissao: mapaComissoes.get(pagamento.booking_id),
      }
    })
}

export function filtrarLancamentos(
  lancamentos: LancamentoFinanceiro[],
  filtros: {
    empresaId: string
    tipo: TipoPagamentoFiltro
    categoriaId: string
    busca: string
  },
): LancamentoFinanceiro[] {
  const termo = filtros.busca.trim().toLowerCase()
  return lancamentos.filter((item) => {
    if (filtros.empresaId === 'sem_empresa') {
      if (item.empresa) return false
    } else if (filtros.empresaId && item.empresa?.id !== filtros.empresaId) {
      return false
    }
    if (filtros.tipo !== 'todos' && item.pagamento.status !== filtros.tipo) return false
    if (filtros.categoriaId && item.categoria?.id !== filtros.categoriaId) return false
    if (!termo) return true
    const campos = [
      item.pagamento.payment_id,
      item.pagamento.provider,
      item.pagamento.payment_method,
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
    volume += item.pagamento.amount
    comissao += item.pagamento.platform_fee
    valorEmpresa += item.pagamento.company_amount
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
    const id = item.empresa?.id ?? 'sem_empresa'
    const atual = mapa.get(id) ?? {
      id,
      titulo: item.empresa?.nome_comercial ?? 'Sem empresa atribuída',
      subtitulo: item.empresa?.cidade,
      lancamentos: [],
      volume: 0,
      comissao: 0,
      valorEmpresa: 0,
      quantidade: 0,
    }
    atual.lancamentos.push(item)
    atual.volume += item.pagamento.amount
    atual.comissao += item.pagamento.platform_fee
    atual.valorEmpresa += item.pagamento.company_amount
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
    atual.volume += item.pagamento.amount
    atual.comissao += item.pagamento.platform_fee
    atual.valorEmpresa += item.pagamento.company_amount
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
