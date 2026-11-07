import type { Empresa, Viagem } from '@/types'

export type MesPlanilha = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12

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
}

function partesData(dataViagem: string) {
  const [ano, mes] = dataViagem.split('-')
  const anoNum = Number(ano)
  const mesNum = Number(mes)
  if (!Number.isFinite(anoNum) || !Number.isFinite(mesNum)) return null
  if (mesNum < 1 || mesNum > 12) return null
  return { ano: anoNum, mes: mesNum as MesPlanilha }
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
  empresaId?: string,
) {
  return viagens
    .filter((viagem) => {
      const partes = partesData(viagem.data_viagem)
      if (!partes || partes.ano !== ano || partes.mes !== mes) return false
      if (empresaId && viagem.empresa_id !== empresaId) return false
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

  for (const viagem of doMes) {
    const empresaId = viagem.empresa_id
    if (!empresaId) continue
    const atual = mapa.get(empresaId) ?? {
      empresaId,
      nome: nomes.get(empresaId) ?? 'Empresa',
      quantidade: 0,
      valorTotal: 0,
      valorEmpresa: 0,
    }
    atual.quantidade += 1
    atual.valorTotal += Number(viagem.preco_total) || 0
    atual.valorEmpresa += Number(viagem.valor_empresa) || 0
    mapa.set(empresaId, atual)
  }

  return [...mapa.values()].sort((a, b) => b.quantidade - a.quantidade || a.nome.localeCompare(b.nome))
}

export function somarPlanilha(viagens: Viagem[]) {
  return viagens.reduce(
    (acc, viagem) => {
      acc.quantidade += 1
      acc.precoTotal += Number(viagem.preco_total) || 0
      acc.valorPlataforma += Number(viagem.valor_plataforma) || 0
      acc.valorEmpresa += Number(viagem.valor_empresa) || 0
      if (viagem.status === 'viagem_finalizada') acc.finalizadas += 1
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
      canceladas: 0,
      pagas: 0,
    },
  )
}
