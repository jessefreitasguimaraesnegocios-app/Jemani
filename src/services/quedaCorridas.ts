import { inicioPeriodoDistribuicao, type PeriodoDistribuicao } from '@/services/rodizioDistribuicao'

export type ModoQueda = 'rodizio' | 'prioridade' | 'destaque'
export type PrioridadeQueda = 1 | 2 | 3

export type CandidataQueda = {
  empresaId: string
  ordem: number
  prioridade: PrioridadeQueda
  participa: boolean
  recebidas: number
  limite: number | null
  intervaloMinutos: number | null
  ultimaQuedaEm: number | null
}

export type ConfiguracaoQueda = {
  participa: boolean
  ilimitada: boolean
  limite: number | null
  periodo: PeriodoDistribuicao
  intervaloMinutos: number | null
  prioridade: PrioridadeQueda
}

export type LinhaQueda = {
  empresaId: string
  nome: string
  participa: boolean
  ilimitada: boolean
  limite: number | null
  periodo: PeriodoDistribuicao
  intervaloMinutos: number | null
  prioridade: PrioridadeQueda
  ordem: number
  recebidas: number
  restante: number | null
  limiteAtingido: boolean
  podeReceber: boolean
  recebidasTotal: number
  ultimaQuedaEm: string | null
}

type QuedaRegistrada = {
  viagemId: string
  empresaId: string
  em: number
  conta: boolean
}

type MemoriaQueda = {
  modo: ModoQueda
  ponteiro: number
  linhas: Map<string, Omit<LinhaQueda, 'recebidas' | 'restante' | 'limiteAtingido' | 'podeReceber' | 'recebidasTotal' | 'ultimaQuedaEm'>>
  quedas: QuedaRegistrada[]
  recusas: { viagemId: string; empresaId: string }[]
}

const memoria: MemoriaQueda = {
  modo: 'rodizio',
  ponteiro: 0,
  linhas: new Map(),
  quedas: [],
  recusas: [],
}

export function ordenarFila<T extends { ordem: number; empresaId: string }>(candidatas: T[]) {
  return [...candidatas].sort((a, b) => {
    if (a.ordem !== b.ordem) return a.ordem - b.ordem
    return a.empresaId < b.empresaId ? -1 : a.empresaId > b.empresaId ? 1 : 0
  })
}

export function montarCiclo(candidatas: CandidataQueda[], modo: ModoQueda): string[] {
  const fila = ordenarFila(candidatas.filter((item) => item.participa))
  if (!fila.length) return []
  if (modo === 'rodizio') return fila.map((item) => item.empresaId)
  if (modo === 'prioridade') return cicloPrioridade(fila)
  return cicloDestaque(fila)
}

function cicloPrioridade(fila: CandidataQueda[]) {
  const falta = new Map<string, number>(fila.map((item) => [item.empresaId, item.prioridade]))
  const sequencia: string[] = []
  let ultimo: string | null = null
  const total = fila.reduce((soma, item) => soma + item.prioridade, 0)
  while (sequencia.length < total) {
    const vivos = fila.filter((item) => (falta.get(item.empresaId) ?? 0) > 0)
    const semRepetir = vivos.filter((item) => item.empresaId !== ultimo)
    const pool = [...(semRepetir.length ? semRepetir : vivos)].sort((a, b) => {
      if (a.prioridade !== b.prioridade) return b.prioridade - a.prioridade
      if (a.ordem !== b.ordem) return a.ordem - b.ordem
      return a.empresaId < b.empresaId ? -1 : 1
    })
    const escolhida = pool[0]
    if (!escolhida) break
    sequencia.push(escolhida.empresaId)
    falta.set(escolhida.empresaId, (falta.get(escolhida.empresaId) ?? 1) - 1)
    ultimo = escolhida.empresaId
  }
  return sequencia
}

function cicloDestaque(fila: CandidataQueda[]) {
  const destaques = fila.filter((item) => item.prioridade >= 2)
  const comuns = fila.filter((item) => item.prioridade < 2)
  if (!destaques.length) return fila.map((item) => item.empresaId)
  if (!comuns.length) return destaques.map((item) => item.empresaId)
  const passos = Math.max(destaques.length, comuns.length)
  const sequencia: string[] = []
  for (let indice = 0; indice < passos; indice += 1) {
    sequencia.push(destaques[indice % destaques.length].empresaId)
    sequencia.push(comuns[indice % comuns.length].empresaId)
  }
  return sequencia
}

export function podeReceberAgora(candidata: CandidataQueda, agora: number) {
  if (!candidata.participa) return false
  if (candidata.limite !== null && candidata.recebidas >= candidata.limite) return false
  if (candidata.intervaloMinutos && candidata.ultimaQuedaEm !== null) {
    if (agora - candidata.ultimaQuedaEm < candidata.intervaloMinutos * 60_000) return false
  }
  return true
}

export function escolherNaFila(
  candidatas: CandidataQueda[],
  modo: ModoQueda,
  ponteiro: number,
  agora: number,
  excluir: string[] = [],
) {
  const ciclo = montarCiclo(candidatas, modo)
  if (!ciclo.length) return null
  const mapa = new Map(candidatas.map((item) => [item.empresaId, item]))
  const bloqueadas = new Set(excluir)
  const inicio = ((ponteiro % ciclo.length) + ciclo.length) % ciclo.length
  for (let passo = 0; passo < ciclo.length; passo += 1) {
    const indice = (inicio + passo) % ciclo.length
    const empresaId = ciclo[indice]
    if (bloqueadas.has(empresaId)) continue
    const candidata = mapa.get(empresaId)
    if (!candidata || !podeReceberAgora(candidata, agora)) continue
    return { empresaId, ponteiro: (indice + 1) % ciclo.length }
  }
  return null
}

function prioridadeValida(valor: number): PrioridadeQueda {
  if (valor === 2 || valor === 3) return valor
  return 1
}

function baseLinha(empresa: { id: string; nome: string }, ordem: number) {
  return {
    empresaId: empresa.id,
    nome: empresa.nome,
    participa: true,
    ilimitada: true,
    limite: null as number | null,
    periodo: 'diario' as PeriodoDistribuicao,
    intervaloMinutos: null as number | null,
    prioridade: 1 as PrioridadeQueda,
    ordem,
  }
}

function garantirLinhas(empresas: { id: string; nome: string }[]) {
  const ordenadas = [...empresas].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR') || (a.id < b.id ? -1 : 1))
  ordenadas.forEach((empresa, indice) => {
    if (!memoria.linhas.has(empresa.id)) {
      memoria.linhas.set(empresa.id, baseLinha(empresa, (indice + 1) * 10))
    } else {
      const atual = memoria.linhas.get(empresa.id)
      if (atual) atual.nome = empresa.nome
    }
  })
}

function recebidasDa(empresaId: string, periodo: PeriodoDistribuicao, reinicio: number | null, agora: number) {
  const inicio = inicioPeriodoDistribuicao(periodo, new Date(agora)).getTime()
  return memoria.quedas.filter((queda) => {
    if (!queda.conta || queda.empresaId !== empresaId) return false
    if (queda.em < inicio) return false
    if (reinicio !== null && queda.em <= reinicio) return false
    return true
  }).length
}

const reinicios = new Map<string, number>()

export function listarQuedaLocal(
  empresas: { id: string; nome: string }[],
  agora = Date.now(),
): { modo: ModoQueda; ponteiro: number; linhas: LinhaQueda[] } {
  garantirLinhas(empresas)
  const linhas = ordenarFila(
    empresas.map((empresa) => {
      const config = memoria.linhas.get(empresa.id) ?? baseLinha(empresa, 0)
      const reinicio = reinicios.get(empresa.id) ?? null
      const recebidas = recebidasDa(empresa.id, config.periodo, reinicio, agora)
      const recebidasTotal = memoria.quedas.filter((queda) => queda.conta && queda.empresaId === empresa.id).length
      const ultima = memoria.quedas
        .filter((queda) => queda.conta && queda.empresaId === empresa.id)
        .reduce((maior, queda) => Math.max(maior, queda.em), 0)
      const ilimitada = config.limite === null
      const limiteAtingido = !ilimitada && recebidas >= (config.limite ?? 0)
      const pode = podeReceberAgora(
        {
          empresaId: empresa.id,
          ordem: config.ordem,
          prioridade: config.prioridade,
          participa: config.participa,
          recebidas,
          limite: config.limite,
          intervaloMinutos: config.intervaloMinutos,
          ultimaQuedaEm: ultima || null,
        },
        agora,
      )
      return {
        ...config,
        nome: empresa.nome,
        ilimitada,
        recebidas,
        restante: ilimitada ? null : Math.max((config.limite ?? 0) - recebidas, 0),
        limiteAtingido,
        podeReceber: pode,
        recebidasTotal,
        ultimaQuedaEm: ultima ? new Date(ultima).toISOString() : null,
      }
    }),
  )
  return { modo: memoria.modo, ponteiro: memoria.ponteiro, linhas }
}

export function definirModoQuedaLocal(modo: ModoQueda) {
  memoria.modo = modo
}

export function configurarQuedaLocal(empresaId: string, nome: string, config: ConfiguracaoQueda) {
  const atual = memoria.linhas.get(empresaId)
  memoria.linhas.set(empresaId, {
    empresaId,
    nome,
    participa: config.participa,
    ilimitada: config.ilimitada,
    limite: config.ilimitada ? null : config.limite,
    periodo: config.periodo,
    intervaloMinutos: config.intervaloMinutos,
    prioridade: prioridadeValida(config.prioridade),
    ordem: atual?.ordem ?? 0,
  })
}

export function reiniciarQuedaLocal(empresaId: string, agora = Date.now()) {
  reinicios.set(empresaId, agora)
}

export function definirOrdensQuedaLocal(ids: string[]) {
  ids.forEach((id, indice) => {
    const atual = memoria.linhas.get(id)
    if (atual) atual.ordem = (indice + 1) * 10
  })
}

function candidatasLocais(elegiveis: string[], agora: number) {
  const empresas = elegiveis.map((id) => ({
    id,
    nome: memoria.linhas.get(id)?.nome ?? id,
  }))
  garantirLinhas(empresas)
  return elegiveis.map((empresaId) => {
    const config = memoria.linhas.get(empresaId) ?? baseLinha({ id: empresaId, nome: empresaId }, 0)
    const reinicio = reinicios.get(empresaId) ?? null
    const recebidas = recebidasDa(empresaId, config.periodo, reinicio, agora)
    const ultima = memoria.quedas
      .filter((queda) => queda.conta && queda.empresaId === empresaId)
      .reduce((maior, queda) => Math.max(maior, queda.em), 0)
    return {
      empresaId,
      ordem: config.ordem,
      prioridade: config.prioridade,
      participa: config.participa,
      recebidas,
      limite: config.limite,
      intervaloMinutos: config.intervaloMinutos,
      ultimaQuedaEm: ultima || null,
    } satisfies CandidataQueda
  })
}

export function registrarQuedaLocal(entrada: {
  viagemId: string
  elegiveis: string[]
  agora?: number
}) {
  const agora = entrada.agora ?? Date.now()
  const existente = memoria.quedas.find((queda) => queda.viagemId === entrada.viagemId && queda.conta)
  if (existente) return existente.empresaId
  const excluir = memoria.recusas
    .filter((item) => item.viagemId === entrada.viagemId)
    .map((item) => item.empresaId)
  const escolha = escolherNaFila(
    candidatasLocais(entrada.elegiveis, agora),
    memoria.modo,
    memoria.ponteiro,
    agora,
    excluir,
  )
  if (!escolha) return null
  memoria.ponteiro = escolha.ponteiro
  memoria.quedas.push({
    viagemId: entrada.viagemId,
    empresaId: escolha.empresaId,
    em: agora,
    conta: true,
  })
  return escolha.empresaId
}

export function avancarQuedaLocal(entrada: {
  viagemId: string
  empresaId: string
  elegiveis: string[]
  agora?: number
}) {
  const agora = entrada.agora ?? Date.now()
  memoria.recusas.push({ viagemId: entrada.viagemId, empresaId: entrada.empresaId })
  for (const queda of memoria.quedas) {
    if (queda.viagemId === entrada.viagemId && queda.empresaId === entrada.empresaId) {
      queda.conta = false
    }
  }
  return registrarQuedaLocal({
    viagemId: entrada.viagemId,
    elegiveis: entrada.elegiveis,
    agora,
  })
}

export function voltaQueda(linhas: LinhaQueda[], modo: ModoQueda) {
  return montarCiclo(
    linhas.map((linha) => ({
      empresaId: linha.empresaId,
      ordem: linha.ordem,
      prioridade: linha.prioridade,
      participa: linha.participa,
      recebidas: linha.recebidas,
      limite: linha.ilimitada ? null : linha.limite,
      intervaloMinutos: linha.intervaloMinutos,
      ultimaQuedaEm: linha.ultimaQuedaEm ? Date.parse(linha.ultimaQuedaEm) : null,
    })),
    modo,
  )
}
