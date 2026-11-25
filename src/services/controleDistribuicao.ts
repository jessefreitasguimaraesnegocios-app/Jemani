import { supabase } from '@/lib/supabase'
import type { PeriodoDistribuicao } from '@/services/rodizioDistribuicao'

export type { PeriodoDistribuicao }

export type LinhaDistribuicao = {
  empresaId: string
  nome: string
  statusEmpresa: string
  habilitadaReceber: boolean
  liberada: boolean
  ligada: boolean
  ilimitada: boolean
  limite: number | null
  periodo: PeriodoDistribuicao
  recebidas: number
  restante: number | null
  limiteAtingido: boolean
  podeReceber: boolean
  recebidasTotal: number
  contadorReiniciadoEm: string | null
}

export type ConfiguracaoDistribuicao = {
  liberada: boolean
  ilimitada: boolean
  limite: number | null
  periodo: PeriodoDistribuicao
}

type EmpresaBase = {
  id: string
  nome_comercial: string
  status: string
  habilitada_receber: boolean
}

export function calcularCota(entrada: {
  recebidas: number
  ilimitada: boolean
  limite: number | null
}) {
  if (entrada.ilimitada || entrada.limite === null) {
    return { restante: null as number | null, limiteAtingido: false }
  }
  return {
    restante: Math.max(entrada.limite - entrada.recebidas, 0),
    limiteAtingido: entrada.recebidas >= entrada.limite,
  }
}

export function podeReceberDistribuicao(linha: {
  liberada: boolean
  ligada: boolean
  statusEmpresa: string
  habilitadaReceber: boolean
  limiteAtingido: boolean
  limiteDiario: number | null
  recebidasHoje: number
}) {
  if (!linha.liberada || !linha.ligada) return false
  if (linha.statusEmpresa !== 'ativa' || !linha.habilitadaReceber) return false
  if (linha.limiteAtingido) return false
  if (linha.limiteDiario !== null && linha.recebidasHoje >= linha.limiteDiario) return false
  return true
}

export function linhaInicialDistribuicao(empresa: EmpresaBase): LinhaDistribuicao {
  return {
    empresaId: empresa.id,
    nome: empresa.nome_comercial,
    statusEmpresa: empresa.status,
    habilitadaReceber: empresa.habilitada_receber,
    liberada: false,
    ligada: false,
    ilimitada: true,
    limite: null,
    periodo: 'diario',
    recebidas: 0,
    restante: null,
    limiteAtingido: false,
    podeReceber: false,
    recebidasTotal: 0,
    contadorReiniciadoEm: null,
  }
}

export function aplicarConfiguracaoDistribuicao(
  linha: LinhaDistribuicao,
  config: ConfiguracaoDistribuicao,
  extra?: { limiteDiario: number | null; recebidasHoje: number },
) {
  const liberada = config.liberada
  const ligada = linha.ligada && liberada
  const ilimitada = config.ilimitada
  const limite = ilimitada ? null : config.limite
  const cota = calcularCota({ recebidas: linha.recebidas, ilimitada, limite })
  return {
    ...linha,
    liberada,
    ligada,
    ilimitada,
    limite,
    periodo: config.periodo,
    restante: cota.restante,
    limiteAtingido: cota.limiteAtingido,
    podeReceber: podeReceberDistribuicao({
      liberada,
      ligada,
      statusEmpresa: linha.statusEmpresa,
      habilitadaReceber: linha.habilitadaReceber,
      limiteAtingido: cota.limiteAtingido,
      limiteDiario: extra?.limiteDiario ?? null,
      recebidasHoje: extra?.recebidasHoje ?? 0,
    }),
  }
}

export function reiniciarContadorLocal(
  linha: LinhaDistribuicao,
  extra?: { limiteDiario: number | null; recebidasHoje: number },
) {
  const cota = calcularCota({ recebidas: 0, ilimitada: linha.ilimitada, limite: linha.limite })
  return {
    ...linha,
    recebidas: 0,
    restante: cota.restante,
    limiteAtingido: false,
    contadorReiniciadoEm: new Date().toISOString(),
    podeReceber: podeReceberDistribuicao({
      liberada: linha.liberada,
      ligada: linha.ligada,
      statusEmpresa: linha.statusEmpresa,
      habilitadaReceber: linha.habilitadaReceber,
      limiteAtingido: false,
      limiteDiario: extra?.limiteDiario ?? null,
      recebidasHoje: extra?.recebidasHoje ?? 0,
    }),
  }
}

function periodoValido(valor: unknown): PeriodoDistribuicao {
  if (valor === 'semanal' || valor === 'mensal' || valor === 'diario') return valor
  return 'diario'
}

function lerLinha(row: Record<string, unknown>): LinhaDistribuicao {
  const ilimitada = Boolean(row.ilimitada)
  const limiteBruto = row.limite
  const limite = limiteBruto === null || limiteBruto === undefined ? null : Number(limiteBruto)
  const restanteBruto = row.restante
  return {
    empresaId: String(row.empresa_id),
    nome: String(row.nome_comercial ?? ''),
    statusEmpresa: String(row.status_empresa ?? ''),
    habilitadaReceber: Boolean(row.habilitada_receber),
    liberada: Boolean(row.liberada),
    ligada: Boolean(row.ligada),
    ilimitada,
    limite: ilimitada ? null : limite,
    periodo: periodoValido(row.periodo),
    recebidas: Number(row.recebidas ?? 0),
    restante: restanteBruto === null || restanteBruto === undefined ? null : Number(restanteBruto),
    limiteAtingido: Boolean(row.limite_atingido),
    podeReceber: Boolean(row.pode_receber),
    recebidasTotal: Number(row.recebidas_total ?? 0),
    contadorReiniciadoEm: row.contador_reiniciado_em ? String(row.contador_reiniciado_em) : null,
  }
}

function comoLista(data: unknown) {
  if (Array.isArray(data)) return data as Record<string, unknown>[]
  if (data && typeof data === 'object') return [data as Record<string, unknown>]
  return []
}

export async function listarControleDistribuicao() {
  if (!supabase) throw new Error('Supabase indisponível')
  const { data, error } = await supabase.rpc('listar_controle_distribuicao')
  if (error) throw error
  return comoLista(data).map(lerLinha)
}

export async function configurarDistribuicaoAutomatica(
  empresaId: string,
  config: ConfiguracaoDistribuicao,
) {
  if (!supabase) throw new Error('Supabase indisponível')
  const { error } = await supabase.rpc('configurar_distribuicao_automatica', {
    p_empresa_id: empresaId,
    p_liberada: config.liberada,
    p_ilimitada: config.ilimitada,
    p_limite: config.ilimitada ? null : config.limite,
    p_periodo: config.periodo,
  })
  if (error) throw error
}

export async function reiniciarContadorDistribuicao(empresaId: string) {
  if (!supabase) throw new Error('Supabase indisponível')
  const { error } = await supabase.rpc('reiniciar_contador_distribuicao', {
    p_empresa_id: empresaId,
  })
  if (error) throw error
}

export function migracaoDistribuicaoAusente(erro: unknown) {
  const texto = erro instanceof Error ? erro.message : String(erro ?? '')
  return /listar_controle_distribuicao|schema cache|does not exist|Could not find the function/i.test(texto)
}
