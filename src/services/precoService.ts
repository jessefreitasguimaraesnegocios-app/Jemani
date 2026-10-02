import type { CalculoPreco, CategoriaVeiculo, ConfiguracaoPlataforma, RegraPreco } from '@/types'

export function calcularPrecoViagem(params: {
  categoria: CategoriaVeiculo
  horario: string
  regra: RegraPreco
  configuracoes: ConfiguracaoPlataforma[]
  distanciaKm?: number
}): CalculoPreco {
  const { categoria, horario, regra, configuracoes, distanciaKm } = params
  const distancia = distanciaKm ?? regra.distancia_padrao_km
  const taxaServico = Number(
    configuracoes.find((c) => c.chave === 'taxa_servico')?.valor ?? '0',
  )
  const comissaoPercentual = Number(
    configuracoes.find((c) => c.chave === 'comissao_percentual')?.valor ?? '10',
  )

  const precoDistancia = distancia * regra.preco_por_km
  const adicionalHorario = ehHorarioNoturno(horario, regra)
    ? regra.adicional_horario_noturno
    : 0
  const adicionalCategoria = categoria.adicional_preco

  let subtotal =
    regra.preco_base + precoDistancia + adicionalHorario + adicionalCategoria + taxaServico
  if (subtotal < regra.preco_minimo) subtotal = regra.preco_minimo

  const total = Math.round(subtotal * 100) / 100
  const valorPlataforma = Math.round(((total * comissaoPercentual) / 100) * 100) / 100
  const valorEmpresa = Math.round((total - valorPlataforma) * 100) / 100

  return {
    preco_base: regra.preco_base,
    adicional_categoria: adicionalCategoria,
    adicional_horario: adicionalHorario,
    preco_distancia: precoDistancia,
    taxas: taxaServico,
    subtotal: total,
    comissao_percentual: comissaoPercentual,
    valor_plataforma: valorPlataforma,
    valor_empresa: valorEmpresa,
    total,
    distancia_km: distancia,
  }
}

function ehHorarioNoturno(horario: string, regra: RegraPreco): boolean {
  const minutos = paraMinutos(horario)
  const inicio = paraMinutos(regra.horario_noturno_inicio)
  const fim = paraMinutos(regra.horario_noturno_fim)
  if (inicio > fim) {
    return minutos >= inicio || minutos < fim
  }
  return minutos >= inicio && minutos < fim
}

function paraMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}
