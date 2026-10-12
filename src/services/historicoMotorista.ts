import type { HistoricoStatus, StatusViagem, TurnoMotorista, Viagem } from '@/types'
import { calcularDistanciaKm } from '@/services/mapasService'

const FUSO = import.meta.env.VITE_TIMEZONE || 'America/Los_Angeles'
const LIMITE_CORRIDA_MS = 16 * 60 * 60 * 1000

const STATUS_A_CAMINHO: StatusViagem[] = [
  'motorista_a_caminho',
  'motorista_chegou',
  'passageiro_embarcou',
  'viagem_em_andamento',
]

const STATUS_PERCURSO: StatusViagem[] = [
  'passageiro_embarcou',
  'viagem_em_andamento',
  'viagem_finalizada',
]

const STATUS_CONTA: StatusViagem[] = [
  'motorista_atribuido',
  'motorista_a_caminho',
  'motorista_chegou',
  'passageiro_embarcou',
  'viagem_em_andamento',
  'viagem_finalizada',
]

export type PeriodoMotorista = 'dia' | 'semana' | 'mes' | 'tudo'

export interface CorridaMotorista {
  id: string
  codigo: string
  data: string
  horario: string
  origem: string
  destino: string
  status: StatusViagem
  km: number | null
  kmPercorrido: number | null
  duracaoMs: number | null
  inicioMs: number | null
  fimMs: number | null
  preco: number
  passageiros: number
  veiculoId?: string
  numeroVoo?: string
  nomePassageiro?: string
  conta: boolean
}

export interface ResumoPeriodo {
  corridas: number
  horasCorridaMs: number | null
  km: number | null
  horasInativasMs: number | null
  horasTurnoMs: number | null
}

export interface HistoricoDoMotorista {
  corridas: CorridaMotorista[]
  resumos: Record<PeriodoMotorista, ResumoPeriodo>
}

function dataCivil(ms: number): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(ms))
}

function somarDias(dataIso: string, dias: number): string {
  const [ano, mes, dia] = dataIso.split('-').map(Number)
  const data = new Date(Date.UTC(ano, mes - 1, dia + dias))
  const y = data.getUTCFullYear()
  const m = String(data.getUTCMonth() + 1).padStart(2, '0')
  const d = String(data.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function inicioSemanaCivil(hoje: string): string {
  const [ano, mes, dia] = hoje.split('-').map(Number)
  const data = new Date(Date.UTC(ano, mes - 1, dia))
  const semana = data.getUTCDay()
  const voltar = semana === 0 ? 6 : semana - 1
  return somarDias(hoje, -voltar)
}

function instanteCivil(dataIso: string, horario = '00:00'): number {
  const [ano, mes, dia] = dataIso.split('-').map(Number)
  const [horaTexto, minutoTexto] = horario.split(':')
  const hora = Number(horaTexto) || 0
  const minuto = Number(minutoTexto) || 0
  const alvo = Date.UTC(ano, mes - 1, dia, hora, minuto, 0)
  const formato = new Intl.DateTimeFormat('en-US', {
    timeZone: FUSO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  let ms = alvo
  for (let i = 0; i < 2; i += 1) {
    const partes = formato.formatToParts(new Date(ms))
    const ler = (tipo: Intl.DateTimeFormatPartTypes) =>
      Number(partes.find((p) => p.type === tipo)?.value ?? 0)
    const horaVista = ler('hour') === 24 ? 0 : ler('hour')
    const visto = Date.UTC(ler('year'), ler('month') - 1, ler('day'), horaVista, ler('minute'))
    ms -= visto - alvo
  }
  return ms
}

function agruparHistorico(historicos: HistoricoStatus[]) {
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

function kmDaCorrida(viagem: Viagem): number | null {
  if (typeof viagem.distancia_km === 'number' && viagem.distancia_km > 0) {
    return viagem.distancia_km
  }
  if (
    typeof viagem.origem_lat === 'number' &&
    typeof viagem.origem_lng === 'number' &&
    typeof viagem.destino_lat === 'number' &&
    typeof viagem.destino_lng === 'number'
  ) {
    const km = calcularDistanciaKm(
      viagem.origem_lat,
      viagem.origem_lng,
      viagem.destino_lat,
      viagem.destino_lng,
    )
    return km > 0.05 ? km : null
  }
  return null
}

function medirCorrida(viagem: Viagem, marcos: HistoricoStatus[], agora: number) {
  const inicioMarco =
    marcos.find((h) => STATUS_A_CAMINHO.includes(h.status_novo)) ??
    marcos.find((h) => h.status_novo === 'motorista_atribuido')
  const fimMarco = [...marcos]
    .reverse()
    .find((h) => h.status_novo === 'viagem_finalizada' || h.status_novo === 'cancelada')

  let inicioMs: number | null = inicioMarco ? Date.parse(inicioMarco.created_at) : null
  if (inicioMs == null || Number.isNaN(inicioMs)) {
    inicioMs =
      viagem.data_viagem && viagem.horario
        ? instanteCivil(viagem.data_viagem, viagem.horario.slice(0, 5))
        : null
  }

  let fimMs: number | null = null
  if (viagem.finalizado_em) fimMs = Date.parse(viagem.finalizado_em)
  else if (fimMarco) fimMs = Date.parse(fimMarco.created_at)

  const emCurso = STATUS_A_CAMINHO.includes(viagem.status)
  if ((fimMs == null || Number.isNaN(fimMs)) && emCurso) fimMs = agora
  if (
    (fimMs == null || Number.isNaN(fimMs)) &&
    (viagem.status === 'viagem_finalizada' || viagem.status === 'cancelada')
  ) {
    const atualizado = Date.parse(viagem.updated_at)
    if (!Number.isNaN(atualizado)) fimMs = atualizado
  }

  let duracaoMs: number | null = null
  if (
    inicioMs != null &&
    fimMs != null &&
    !Number.isNaN(inicioMs) &&
    !Number.isNaN(fimMs) &&
    fimMs >= inicioMs &&
    fimMs - inicioMs <= LIMITE_CORRIDA_MS
  ) {
    duracaoMs = fimMs - inicioMs
  }

  const percorreu =
    STATUS_PERCURSO.includes(viagem.status) ||
    marcos.some((h) => STATUS_PERCURSO.includes(h.status_novo))

  return { inicioMs, fimMs: duracaoMs == null ? null : fimMs, duracaoMs, percorreu }
}

function limitesDoPeriodo(periodo: PeriodoMotorista, agora: number) {
  if (periodo === 'tudo') return { inicio: null as number | null, fim: null as number | null }
  const hoje = dataCivil(agora)
  if (periodo === 'dia') {
    return { inicio: instanteCivil(hoje), fim: instanteCivil(somarDias(hoje, 1)) }
  }
  if (periodo === 'semana') {
    const inicio = inicioSemanaCivil(hoje)
    return { inicio: instanteCivil(inicio), fim: instanteCivil(somarDias(inicio, 7)) }
  }
  const mes = `${hoje.slice(0, 7)}-01`
  const [ano, numeroMes] = hoje.split('-').map(Number)
  const proximo = new Date(Date.UTC(ano, numeroMes, 1))
  const fimMes = `${proximo.getUTCFullYear()}-${String(proximo.getUTCMonth() + 1).padStart(2, '0')}-01`
  return { inicio: instanteCivil(mes), fim: instanteCivil(fimMes) }
}

function dentroDoPeriodo(data: string, periodo: PeriodoMotorista, agora: number) {
  if (periodo === 'tudo') return true
  const hoje = dataCivil(agora)
  if (periodo === 'dia') return data === hoje
  if (periodo === 'semana') {
    const inicio = inicioSemanaCivil(hoje)
    return data >= inicio && data < somarDias(inicio, 7)
  }
  return data.slice(0, 7) === hoje.slice(0, 7)
}

function horasTurno(
  turnos: TurnoMotorista[],
  inicio: number | null,
  fim: number | null,
  agora: number,
): number | null {
  let total = 0
  let algum = false
  for (const turno of turnos) {
    const abertura = Date.parse(turno.inicio)
    if (Number.isNaN(abertura)) continue
    const fechamento = turno.online ? agora : turno.fim ? Date.parse(turno.fim) : Number.NaN
    if (Number.isNaN(fechamento)) continue
    let de = abertura
    let ate = fechamento
    if (inicio != null) de = Math.max(de, inicio)
    if (fim != null) ate = Math.min(ate, fim)
    if (ate > de) {
      total += ate - de
      algum = true
    }
  }
  return algum ? total : null
}

function horasInativas(corridas: CorridaMotorista[], turnoMs: number | null, corridaMs: number | null) {
  if (turnoMs != null && corridaMs != null) return Math.max(0, turnoMs - corridaMs)
  const intervalos = corridas
    .filter((c) => c.conta && c.inicioMs != null && c.fimMs != null && c.duracaoMs != null)
    .sort((a, b) => (a.inicioMs ?? 0) - (b.inicioMs ?? 0))
  if (intervalos.length < 2) return turnoMs != null ? turnoMs : null
  let folga = 0
  for (let i = 1; i < intervalos.length; i += 1) {
    const vazio = (intervalos[i].inicioMs ?? 0) - (intervalos[i - 1].fimMs ?? 0)
    if (vazio > 0 && vazio <= LIMITE_CORRIDA_MS) folga += vazio
  }
  return folga
}

function resumir(corridas: CorridaMotorista[], turnos: TurnoMotorista[], periodo: PeriodoMotorista, agora: number): ResumoPeriodo {
  const doPeriodo = corridas.filter((c) => dentroDoPeriodo(c.data, periodo, agora))
  const feitas = doPeriodo.filter((c) => c.conta)
  const comDuracao = feitas.filter((c) => c.duracaoMs != null)
  const comKm = feitas.filter((c) => c.kmPercorrido != null)
  const horasCorridaMs = comDuracao.length
    ? comDuracao.reduce((soma, c) => soma + (c.duracaoMs ?? 0), 0)
    : null
  const km = comKm.length ? comKm.reduce((soma, c) => soma + (c.kmPercorrido ?? 0), 0) : null
  const limites = limitesDoPeriodo(periodo, agora)
  const horasTurnoMs = horasTurno(turnos, limites.inicio, limites.fim, agora)
  return {
    corridas: feitas.length,
    horasCorridaMs,
    km,
    horasInativasMs: horasInativas(doPeriodo, horasTurnoMs, horasCorridaMs),
    horasTurnoMs,
  }
}

export function montarHistoricoMotorista(entrada: {
  motoristaId: string
  empresaId: string
  viagens: Viagem[]
  historicos: HistoricoStatus[]
  turnos: TurnoMotorista[]
  agora?: number
}): HistoricoDoMotorista {
  const agora = entrada.agora ?? Date.now()
  const marcos = agruparHistorico(entrada.historicos)
  const corridas = entrada.viagens
    .filter(
      (v) =>
        v.motorista_id === entrada.motoristaId &&
        (!v.empresa_id || v.empresa_id === entrada.empresaId),
    )
    .map((viagem) => {
      const medida = medirCorrida(viagem, marcos.get(viagem.id) ?? [], agora)
      const km = kmDaCorrida(viagem)
      return {
        id: viagem.id,
        codigo: viagem.codigo,
        data: viagem.data_viagem,
        horario: viagem.horario,
        origem: viagem.origem,
        destino: viagem.destino,
        status: viagem.status,
        km,
        kmPercorrido: medida.percorreu ? km : null,
        duracaoMs:
          medida.duracaoMs ??
          (viagem.status === 'viagem_finalizada' && km != null && km >= 0.2 && km <= 180
            ? Math.round((km / 32) * 3_600_000)
            : null),
        inicioMs: medida.inicioMs,
        fimMs: medida.fimMs,
        preco: viagem.preco_total,
        passageiros: viagem.passageiros,
        veiculoId: viagem.veiculo_id,
        numeroVoo: viagem.numero_voo,
        nomePassageiro: viagem.nome_passageiro,
        conta: STATUS_CONTA.includes(viagem.status),
      }
    })
    .sort((a, b) => {
      const data = b.data.localeCompare(a.data)
      if (data !== 0) return data
      return b.horario.localeCompare(a.horario)
    })

  const turnos = entrada.turnos.filter((t) => t.motorista_id === entrada.motoristaId)
  const periodos: PeriodoMotorista[] = ['dia', 'semana', 'mes', 'tudo']
  const resumos = {} as Record<PeriodoMotorista, ResumoPeriodo>
  for (const periodo of periodos) {
    resumos[periodo] = resumir(corridas, turnos, periodo, agora)
  }
  return { corridas, resumos }
}

export function dataEstaNoPeriodo(data: string, periodo: PeriodoMotorista, agora = Date.now()) {
  return dentroDoPeriodo(data, periodo, agora)
}

export function filtrarCorridas(
  corridas: CorridaMotorista[],
  periodo: PeriodoMotorista,
  agora = Date.now(),
) {
  return corridas.filter((c) => dentroDoPeriodo(c.data, periodo, agora))
}
