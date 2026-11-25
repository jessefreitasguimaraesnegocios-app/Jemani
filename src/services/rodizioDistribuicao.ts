export const FUSO_OPERACAO = 'America/Los_Angeles'

export type PeriodoDistribuicao = 'diario' | 'semanal' | 'mensal'

export type CandidataRodizio = {
  empresaId: string
  ultimaDistribuicaoEm: number | null
  recebidas: number
  limite: number | null
}

export type ViagemRodizio = {
  id: string
  empresas: string[]
}

export type EstadoRodizio = {
  ocupado: boolean
  relogio: number
  empresas: Map<string, CandidataRodizio>
  atribuicoes: Map<string, string>
}

type PartesRelogio = {
  ano: number
  mes: number
  dia: number
  hora: number
  minuto: number
  segundo: number
}

function partesNoFuso(data: Date, fuso: string): PartesRelogio {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: fuso,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const mapa: Record<string, string> = {}
  for (const parte of fmt.formatToParts(data)) {
    if (parte.type !== 'literal') mapa[parte.type] = parte.value
  }
  let ano = Number(mapa.year)
  let mes = Number(mapa.month)
  let dia = Number(mapa.day)
  let hora = Number(mapa.hour)
  if (hora === 24) {
    hora = 0
    const seguinte = new Date(Date.UTC(ano, mes - 1, dia + 1))
    ano = seguinte.getUTCFullYear()
    mes = seguinte.getUTCMonth() + 1
    dia = seguinte.getUTCDate()
  }
  return {
    ano,
    mes,
    dia,
    hora,
    minuto: Number(mapa.minute),
    segundo: Number(mapa.second),
  }
}

function deslocamentoMs(instante: Date, fuso: string) {
  const partes = partesNoFuso(instante, fuso)
  const paredeComoUtc = Date.UTC(
    partes.ano,
    partes.mes - 1,
    partes.dia,
    partes.hora,
    partes.minuto,
    partes.segundo,
  )
  return paredeComoUtc - instante.getTime()
}

function instanteDaParede(
  ano: number,
  mes: number,
  dia: number,
  hora: number,
  minuto: number,
  fuso: string,
) {
  let utc = Date.UTC(ano, mes - 1, dia, hora, minuto, 0)
  for (let i = 0; i < 4; i++) {
    const proximo = Date.UTC(ano, mes - 1, dia, hora, minuto, 0) - deslocamentoMs(new Date(utc), fuso)
    if (proximo === utc) return new Date(utc)
    utc = proximo
  }
  return new Date(utc)
}

export function inicioPeriodoDistribuicao(
  periodo: PeriodoDistribuicao,
  agora = new Date(),
  fuso = FUSO_OPERACAO,
) {
  const partes = partesNoFuso(agora, fuso)
  let ano = partes.ano
  let mes = partes.mes
  let dia = partes.dia
  if (periodo === 'mensal') {
    dia = 1
  } else if (periodo === 'semanal') {
    const ref = new Date(Date.UTC(ano, mes - 1, dia))
    const semana = ref.getUTCDay()
    const voltar = semana === 0 ? 6 : semana - 1
    ref.setUTCDate(ref.getUTCDate() - voltar)
    ano = ref.getUTCFullYear()
    mes = ref.getUTCMonth() + 1
    dia = ref.getUTCDate()
  }
  return instanteDaParede(ano, mes, dia, 0, 0, fuso)
}

export function contaNoLimite(entrada: {
  atribuida: boolean
  mesmaEmpresa: boolean
  status: string
}) {
  if (!entrada.atribuida || !entrada.mesmaEmpresa) return false
  return entrada.status !== 'cancelada' && entrada.status !== 'expired'
}

export function escolherProximaEmpresa(candidatas: CandidataRodizio[]) {
  const elegiveis = candidatas.filter(
    (candidata) => candidata.limite === null || candidata.recebidas < candidata.limite,
  )
  if (!elegiveis.length) return null
  elegiveis.sort((a, b) => {
    if (a.ultimaDistribuicaoEm === null && b.ultimaDistribuicaoEm !== null) return -1
    if (b.ultimaDistribuicaoEm === null && a.ultimaDistribuicaoEm !== null) return 1
    if (a.ultimaDistribuicaoEm !== null && b.ultimaDistribuicaoEm !== null
      && a.ultimaDistribuicaoEm !== b.ultimaDistribuicaoEm) {
      return a.ultimaDistribuicaoEm - b.ultimaDistribuicaoEm
    }
    if (a.empresaId < b.empresaId) return -1
    if (a.empresaId > b.empresaId) return 1
    return 0
  })
  return elegiveis[0]?.empresaId ?? null
}

export function criarEstadoRodizio(empresas: CandidataRodizio[]): EstadoRodizio {
  return {
    ocupado: false,
    relogio: 0,
    atribuicoes: new Map(),
    empresas: new Map(empresas.map((empresa) => [empresa.empresaId, { ...empresa }])),
  }
}

export async function processarComTrava(
  estado: EstadoRodizio,
  viagens: ViagemRodizio[],
  ceder: () => Promise<void> = () => Promise.resolve(),
) {
  if (estado.ocupado) return 0
  estado.ocupado = true
  try {
    await ceder()
    let total = 0
    for (const viagem of viagens) {
      if (estado.atribuicoes.has(viagem.id)) continue
      const candidatas = viagem.empresas
        .map((id) => estado.empresas.get(id))
        .filter((candidata): candidata is CandidataRodizio => Boolean(candidata))
      const empresaId = escolherProximaEmpresa(candidatas)
      if (!empresaId) continue
      const empresa = estado.empresas.get(empresaId)
      if (!empresa) continue
      estado.atribuicoes.set(viagem.id, empresaId)
      empresa.recebidas += 1
      estado.relogio += 1
      empresa.ultimaDistribuicaoEm = estado.relogio
      total += 1
    }
    return total
  } finally {
    estado.ocupado = false
  }
}
