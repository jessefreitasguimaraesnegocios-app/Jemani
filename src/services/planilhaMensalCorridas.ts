import type { Empresa, Viagem } from '@/types'

export type MesPlanilha = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12
export type QuinzenaPlanilha = 'todas' | 'q1' | 'q2'

/** Id especial da planilha para todas as corridas de parceiro externo. */
export const ID_PARCEIROS_EXTERNOS_PLANILHA = 'parceiros_externos'

export interface ContagemMesPlanilha {
  mes: MesPlanilha
  quantidade: number
}

export interface ContagemEmpresaMes {
  empresaId: string
  nome: string
  quantidade: number
  valorTotal: number
  valorEmpresa: number
  valorPlataforma: number
  parceiroExterno?: boolean
}

export type OpcoesFiltroPlanilha = {
  empresaId?: string
  quinzena?: QuinzenaPlanilha
}

function partesData(dataViagem: string) {
  const [ano, mes, dia] = dataViagem.split('-')
  const anoNum = Number(ano)
  const mesNum = Number(mes)
  const diaNum = Number(dia)
  if (!Number.isFinite(anoNum) || !Number.isFinite(mesNum)) return null
  if (mesNum < 1 || mesNum > 12) return null
  return {
    ano: anoNum,
    mes: mesNum as MesPlanilha,
    dia: Number.isFinite(diaNum) ? diaNum : 1,
  }
}

export function bateQuinzena(dataViagem: string, quinzena: QuinzenaPlanilha = 'todas') {
  if (quinzena === 'todas') return true
  const partes = partesData(dataViagem)
  if (!partes) return false
  if (quinzena === 'q1') return partes.dia <= 15
  return partes.dia >= 16
}

function normalizarOpcoes(
  empresaIdOuOpcoes?: string | OpcoesFiltroPlanilha,
): OpcoesFiltroPlanilha {
  if (typeof empresaIdOuOpcoes === 'string' || empresaIdOuOpcoes === undefined) {
    return { empresaId: empresaIdOuOpcoes, quinzena: 'todas' }
  }
  return {
    empresaId: empresaIdOuOpcoes.empresaId,
    quinzena: empresaIdOuOpcoes.quinzena ?? 'todas',
  }
}

export function anosDisponiveisPlanilha(viagens: Viagem[]) {
  const anos = new Set<number>()
  for (const viagem of viagens) {
    const partes = partesData(viagem.data_viagem)
    if (partes) anos.add(partes.ano)
  }
  return [...anos].sort((a, b) => b - a)
}

export function filtrarViagensDoMes(
  viagens: Viagem[],
  ano: number,
  mes: MesPlanilha,
  empresaIdOuOpcoes?: string | OpcoesFiltroPlanilha,
) {
  const opcoes = normalizarOpcoes(empresaIdOuOpcoes)
  return viagens
    .filter((viagem) => {
      const partes = partesData(viagem.data_viagem)
      if (!partes || partes.ano !== ano || partes.mes !== mes) return false
      if (!bateQuinzena(viagem.data_viagem, opcoes.quinzena)) return false
      if (opcoes.empresaId === ID_PARCEIROS_EXTERNOS_PLANILHA) {
        return viagem.status === 'parceiro_externo'
      }
      if (opcoes.empresaId && viagem.empresa_id !== opcoes.empresaId) return false
      return true
    })
    .sort((a, b) => {
      const porData = a.data_viagem.localeCompare(b.data_viagem)
      if (porData !== 0) return porData
      return a.horario.localeCompare(b.horario)
    })
}

export function contarMesesDoAno(viagens: Viagem[], ano: number): ContagemMesPlanilha[] {
  const contagem = new Map<MesPlanilha, number>()
  for (let mes = 1; mes <= 12; mes++) contagem.set(mes as MesPlanilha, 0)
  for (const viagem of viagens) {
    const partes = partesData(viagem.data_viagem)
    if (!partes || partes.ano !== ano) continue
    contagem.set(partes.mes, (contagem.get(partes.mes) ?? 0) + 1)
  }
  return Array.from({ length: 12 }, (_, indice) => {
    const mes = (indice + 1) as MesPlanilha
    return { mes, quantidade: contagem.get(mes) ?? 0 }
  })
}

export function contarEmpresasDoMes(
  viagens: Viagem[],
  ano: number,
  mes: MesPlanilha,
  empresas: Empresa[],
): ContagemEmpresaMes[] {
  const doMes = filtrarViagensDoMes(viagens, ano, mes)
  const mapa = new Map<string, ContagemEmpresaMes>()
  const nomes = new Map(empresas.map((empresa) => [empresa.id, empresa.nome_comercial]))
  let parceiros: ContagemEmpresaMes | null = null

  for (const viagem of doMes) {
    if (viagem.status === 'parceiro_externo') {
      parceiros = parceiros ?? {
        empresaId: ID_PARCEIROS_EXTERNOS_PLANILHA,
        nome: 'Parceiros externos',
        quantidade: 0,
        valorTotal: 0,
        valorEmpresa: 0,
        valorPlataforma: 0,
        parceiroExterno: true,
      }
      parceiros.quantidade += 1
      parceiros.valorTotal += Number(viagem.preco_total) || 0
      parceiros.valorEmpresa += Number(viagem.valor_empresa) || 0
      parceiros.valorPlataforma += Number(viagem.valor_plataforma) || 0
    }

    const empresaId = viagem.empresa_id
    if (!empresaId) continue
    const atual = mapa.get(empresaId) ?? {
      empresaId,
      nome: nomes.get(empresaId) ?? 'Empresa',
      quantidade: 0,
      valorTotal: 0,
      valorEmpresa: 0,
      valorPlataforma: 0,
    }
    atual.quantidade += 1
    atual.valorTotal += Number(viagem.preco_total) || 0
    atual.valorEmpresa += Number(viagem.valor_empresa) || 0
    atual.valorPlataforma += Number(viagem.valor_plataforma) || 0
    mapa.set(empresaId, atual)
  }

  const lista = [...mapa.values()].sort(
    (a, b) => b.quantidade - a.quantidade || a.nome.localeCompare(b.nome),
  )
  return parceiros ? [parceiros, ...lista] : lista
}

export function somarPlanilha(viagens: Viagem[]) {
  return viagens.reduce(
    (acc, viagem) => {
      acc.quantidade += 1
      acc.precoTotal += Number(viagem.preco_total) || 0
      acc.valorPlataforma += Number(viagem.valor_plataforma) || 0
      acc.valorEmpresa += Number(viagem.valor_empresa) || 0
      if (viagem.status === 'viagem_finalizada') acc.finalizadas += 1
      if (viagem.status === 'parceiro_externo') acc.parceirosExternos += 1
      if (viagem.status === 'cancelada') acc.canceladas += 1
      if (viagem.payment_status === 'paid') acc.pagas += 1
      return acc
    },
    {
      quantidade: 0,
      precoTotal: 0,
      valorPlataforma: 0,
      valorEmpresa: 0,
      finalizadas: 0,
      parceirosExternos: 0,
      canceladas: 0,
      pagas: 0,
    },
  )
}
