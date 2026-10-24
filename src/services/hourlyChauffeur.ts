import type { CalculoPreco, CategoriaVeiculo, ConfiguracaoPlataforma, ExtensaoViagem, RegraPreco, Viagem } from '@/types'
import { montarDataViagem } from '@/services/reservaValidacao'

export const DESTINO_HOURLY = 'As directed — Hourly Chauffeur'
export const OPCOES_EXTENSAO_MINUTOS = [30, 60, 120] as const
export const AVISOS_MINUTOS_RESTANTES = [20, 15, 10, 5] as const

export type ModalidadeReserva = 'one_way' | 'hourly'

export function ehHourly(viagem?: Pick<Viagem, 'modalidade'> | null): boolean {
  return viagem?.modalidade === 'hourly'
}

export function hourlyConfigurado(regra?: RegraPreco | null): boolean {
  return Boolean(regra && Number(regra.preco_por_hora) > 0)
}

export function listarPacotesMinutos(regra: RegraPreco): number[] {
  const min = regra.duracao_minima_minutos ?? 120
  const max = regra.duracao_maxima_minutos ?? 720
  const pacotes = (regra.pacotes_minutos?.length ? regra.pacotes_minutos : [120, 180, 240, 300, 360, 480])
    .filter((m) => m >= min && m <= max)
    .sort((a, b) => a - b)
  return pacotes.length ? pacotes : [min]
}

export function rotuloDuracao(minutos: number): string {
  if (minutos % 60 === 0) return `${minutos / 60}h`
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  return h > 0 ? `${h}h ${m}min` : `${m}min`
}

export function milhasParaKm(milhas: number): number {
  return Math.round(milhas * 1.60934 * 100) / 100
}

export function calcularPrecoHourly(params: {
  categoria: CategoriaVeiculo
  horario: string
  regra: RegraPreco
  configuracoes: ConfiguracaoPlataforma[]
  duracaoMinutos: number
}): CalculoPreco & { franquia_milhas: number; horas: number } {
  const { categoria, horario, regra, configuracoes, duracaoMinutos } = params
  if (!hourlyConfigurado(regra)) {
    throw new Error(
      'Hourly Chauffeur ainda sem preço configurado. Defina “Preço por hora” em Admin → Preços.',
    )
  }
  const min = regra.duracao_minima_minutos ?? 120
  const max = regra.duracao_maxima_minutos ?? 720
  if (duracaoMinutos < min) {
    throw new Error(`Duração mínima: ${rotuloDuracao(min)}.`)
  }
  if (duracaoMinutos > max) {
    throw new Error(`Duração máxima: ${rotuloDuracao(max)}.`)
  }

  const horas = duracaoMinutos / 60
  const taxaServico = Number(configuracoes.find((c) => c.chave === 'taxa_servico')?.valor ?? '0')
  const comissaoPercentual = Number(
    configuracoes.find((c) => c.chave === 'comissao_percentual')?.valor ?? '10',
  )
  const adicionalHorario = ehHorarioNoturno(horario, regra) ? regra.adicional_horario_noturno : 0
  const adicionalCategoria = categoria.adicional_preco
  const precoHoras = horas * Number(regra.preco_por_hora)
  const franquiaMilhas =
    Math.round(horas * Number(regra.franquia_milhas_por_hora ?? 0) * 100) / 100

  let subtotal = precoHoras + adicionalHorario + adicionalCategoria + taxaServico
  if (subtotal < regra.preco_minimo) subtotal = regra.preco_minimo

  const total = Math.round(subtotal * 100) / 100
  const valorPlataforma = Math.round(((total * comissaoPercentual) / 100) * 100) / 100
  const valorEmpresa = Math.round((total - valorPlataforma) * 100) / 100

  return {
    preco_base: Math.round(precoHoras * 100) / 100,
    adicional_categoria: adicionalCategoria,
    adicional_horario: adicionalHorario,
    preco_distancia: 0,
    taxas: taxaServico,
    subtotal: total,
    comissao_percentual: comissaoPercentual,
    valor_plataforma: valorPlataforma,
    valor_empresa: valorEmpresa,
    total,
    distancia_km: milhasParaKm(franquiaMilhas),
    franquia_milhas: franquiaMilhas,
    horas,
  }
}

export function calcularPrecoExtensao(params: {
  categoria: CategoriaVeiculo
  regra: RegraPreco
  configuracoes: ConfiguracaoPlataforma[]
  minutos: number
}): { total: number; valor_plataforma: number; valor_empresa: number; comissao_percentual: number } {
  const { categoria, regra, configuracoes, minutos } = params
  if (!hourlyConfigurado(regra)) {
    throw new Error('Extensão indisponível: preço por hora não configurado.')
  }
  if (!(OPCOES_EXTENSAO_MINUTOS as readonly number[]).includes(minutos)) {
    throw new Error('Opção de extensão inválida.')
  }
  const horas = minutos / 60
  const comissaoPercentual = Number(
    configuracoes.find((c) => c.chave === 'comissao_percentual')?.valor ?? '10',
  )
  const adicionalCategoria = Math.round((categoria.adicional_preco * horas) * 100) / 100
  const total = Math.round((horas * Number(regra.preco_por_hora) + adicionalCategoria) * 100) / 100
  const valorPlataforma = Math.round(((total * comissaoPercentual) / 100) * 100) / 100
  const valorEmpresa = Math.round((total - valorPlataforma) * 100) / 100
  return {
    total,
    valor_plataforma: valorPlataforma,
    valor_empresa: valorEmpresa,
    comissao_percentual: comissaoPercentual,
  }
}

export function montarJanelaHourly(data: string, horario: string, duracaoMinutos: number) {
  const inicio = montarDataViagem(data, horario)
  const fim = new Date(inicio.getTime() + duracaoMinutos * 60_000)
  return { inicio, fim, inicioIso: inicio.toISOString(), fimIso: fim.toISOString() }
}

export function minutosRestantesOficial(viagem: Pick<Viagem, 'fim_agendado'>, agora = new Date()): number | null {
  if (!viagem.fim_agendado) return null
  const fim = new Date(viagem.fim_agendado).getTime()
  if (!Number.isFinite(fim)) return null
  return Math.ceil((fim - agora.getTime()) / 60_000)
}

export function avisoPendente(
  viagem: Pick<Viagem, 'id' | 'modalidade' | 'fim_agendado' | 'status'>,
  avisosJaEnviados: Array<{
    viagem_id: string
    minutos_restantes: number
    fim_agendado_ref: string
  }>,
  agora = new Date(),
): (typeof AVISOS_MINUTOS_RESTANTES)[number] | null {
  if (!ehHourly(viagem) || !viagem.fim_agendado) return null
  if (['viagem_finalizada', 'cancelada', 'expired'].includes(viagem.status)) return null
  const restam = minutosRestantesOficial(viagem, agora)
  if (restam == null || restam < 0) return null
  for (const marca of AVISOS_MINUTOS_RESTANTES) {
    if (restam > marca) continue
    const ja = avisosJaEnviados.some(
      (a) =>
        a.viagem_id === viagem.id &&
        a.minutos_restantes === marca &&
        a.fim_agendado_ref === viagem.fim_agendado,
    )
    if (!ja) return marca
  }
  return null
}

export function motoristaTemConflito(params: {
  viagens: Viagem[]
  motoristaId: string
  viagemId: string
  fimAtual?: string
  novoFimIso: string
}): boolean {
  const { viagens, motoristaId, viagemId, fimAtual, novoFimIso } = params
  const inicioJanela = new Date(fimAtual ?? Date.now()).getTime()
  const fimJanela = new Date(novoFimIso).getTime()
  return viagens.some((outra) => {
    if (outra.id === viagemId) return false
    if (outra.motorista_id !== motoristaId) return false
    if (['cancelada', 'expired', 'viagem_finalizada'].includes(outra.status)) return false
    const ini = outra.inicio_agendado
      ? new Date(outra.inicio_agendado).getTime()
      : montarDataViagem(outra.data_viagem, outra.horario).getTime()
    const fim = outra.fim_agendado
      ? new Date(outra.fim_agendado).getTime()
      : ini + 60 * 60_000
    return ini < fimJanela && fim > inicioJanela
  })
}

export function formatarExtensaoConfirmada(ext: ExtensaoViagem, locale = 'en-US'): string {
  const fim = ext.fim_novo
    ? new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(
        new Date(ext.fim_novo),
      )
    : '—'
  return `RESERVATION EXTENDED · +${rotuloDuracao(ext.minutos).toUpperCase()} · NEW END TIME: ${fim}`
}

function ehHorarioNoturno(horario: string, regra: RegraPreco): boolean {
  const minutos = paraMinutos(horario)
  const inicio = paraMinutos(regra.horario_noturno_inicio)
  const fim = paraMinutos(regra.horario_noturno_fim)
  if (inicio > fim) return minutos >= inicio || minutos < fim
  return minutos >= inicio && minutos < fim
}

function paraMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}
