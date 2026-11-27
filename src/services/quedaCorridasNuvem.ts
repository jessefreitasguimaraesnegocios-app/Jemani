import { supabase } from '@/lib/supabase'
import type { PeriodoDistribuicao } from '@/services/rodizioDistribuicao'
import type {
  ConfiguracaoQueda,
  LinhaQueda,
  ModoQueda,
  PrioridadeQueda,
} from '@/services/quedaCorridas'

function comoLista(data: unknown) {
  if (Array.isArray(data)) return data as Record<string, unknown>[]
  if (data && typeof data === 'object') return [data as Record<string, unknown>]
  return []
}

function periodoValido(valor: unknown): PeriodoDistribuicao {
  if (valor === 'semanal' || valor === 'mensal') return valor
  return 'diario'
}

function prioridadeValida(valor: unknown): PrioridadeQueda {
  const numero = Number(valor)
  if (numero === 2 || numero === 3) return numero
  return 1
}

function lerLinha(row: Record<string, unknown>): LinhaQueda {
  const limiteBruto = row.limite
  const limite = limiteBruto === null || limiteBruto === undefined ? null : Number(limiteBruto)
  const intervaloBruto = row.intervalo_minutos
  return {
    empresaId: String(row.empresa_id),
    nome: String(row.nome_comercial ?? ''),
    participa: row.participa !== false,
    ilimitada: limite === null,
    limite,
    periodo: periodoValido(row.periodo),
    intervaloMinutos:
      intervaloBruto === null || intervaloBruto === undefined ? null : Number(intervaloBruto),
    prioridade: prioridadeValida(row.prioridade),
    ordem: Number(row.ordem ?? 0),
    recebidas: Number(row.recebidas ?? 0),
    restante:
      row.restante === null || row.restante === undefined ? null : Number(row.restante),
    limiteAtingido: Boolean(row.limite_atingido),
    podeReceber: Boolean(row.pode_receber),
    recebidasTotal: Number(row.recebidas_total ?? 0),
    ultimaQuedaEm: row.ultima_queda_em ? String(row.ultima_queda_em) : null,
  }
}

export function quedaNuvemAusente(erro: unknown) {
  const texto = erro instanceof Error ? erro.message : String(erro ?? '')
  return /listar_controle_queda|escolher_empresa_queda|schema cache|does not exist|Could not find the function/i.test(
    texto,
  )
}

export async function obterModoQuedaNuvem(): Promise<ModoQueda> {
  if (!supabase) throw new Error('Supabase indisponível')
  const { data, error } = await supabase.rpc('obter_modo_queda')
  if (error) throw error
  const linha = comoLista(data)[0]
  const modo = linha?.modo
  if (modo === 'prioridade' || modo === 'destaque') return modo
  return 'rodizio'
}

export async function definirModoQuedaNuvem(modo: ModoQueda) {
  if (!supabase) throw new Error('Supabase indisponível')
  const { error } = await supabase.rpc('definir_modo_queda', { p_modo: modo })
  if (error) throw error
}

export async function listarControleQuedaNuvem() {
  if (!supabase) throw new Error('Supabase indisponível')
  const { data, error } = await supabase.rpc('listar_controle_queda')
  if (error) throw error
  return comoLista(data).map(lerLinha)
}

export async function configurarQuedaNuvem(empresaId: string, config: ConfiguracaoQueda) {
  if (!supabase) throw new Error('Supabase indisponível')
  const { error } = await supabase.rpc('configurar_queda_empresa', {
    p_empresa_id: empresaId,
    p_participa: config.participa,
    p_ilimitada: config.ilimitada,
    p_limite: config.ilimitada ? null : config.limite,
    p_periodo: config.periodo,
    p_intervalo_minutos: config.intervaloMinutos,
    p_prioridade: config.prioridade,
  })
  if (error) throw error
}

export async function definirOrdensQuedaNuvem(ids: string[]) {
  if (!supabase) throw new Error('Supabase indisponível')
  const { error } = await supabase.rpc('definir_ordens_queda', { p_ids: ids })
  if (error) throw error
}

export async function reiniciarQuedaNuvem(empresaId: string) {
  if (!supabase) throw new Error('Supabase indisponível')
  const { error } = await supabase.rpc('reiniciar_contador_queda', { p_empresa_id: empresaId })
  if (error) throw error
}

export async function escolherEmpresaQuedaNuvem(viagemId: string) {
  if (!supabase) throw new Error('Supabase indisponível')
  const { data, error } = await supabase.rpc('escolher_empresa_queda', { p_viagem_id: viagemId })
  if (error) throw error
  return data ? String(data) : null
}

export async function avancarQuedaNuvem(viagemId: string, empresaId: string) {
  if (!supabase) throw new Error('Supabase indisponível')
  const { data, error } = await supabase.rpc('avancar_queda_corrida', {
    p_viagem_id: viagemId,
    p_empresa_id: empresaId,
  })
  if (error) throw error
  return data ? String(data) : null
}
