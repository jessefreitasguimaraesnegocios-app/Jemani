import { IDS } from '@/data/seed'
import type { CategoriaVeiculo, Empresa, Veiculo } from '@/types'

/** IDs do seed local → slug (quando a empresa gravou categoria antes do sync com a nuvem). */
const SLUG_POR_ID_SEED: Record<string, string> = {
  [IDS.catExecutive]: 'jemani-executive',
  [IDS.catBlack]: 'jemani-black',
  [IDS.catSuv]: 'jemani-suv',
  [IDS.catLuxe]: 'jemani-luxe',
  [IDS.catLimo]: 'jemani-limo',
  [IDS.catVan]: 'jemani-van',
  [IDS.catShield]: 'jemani-shield',
  [IDS.catExpedition]: 'jemani-expedition',
  [IDS.catCharter]: 'jemani-charter',
}

export function alinharCategoriaIdVeiculo(
  categoriaId: string,
  categorias: CategoriaVeiculo[],
): string {
  if (categorias.some((c) => c.id === categoriaId)) return categoriaId
  const slug = SLUG_POR_ID_SEED[categoriaId]
  if (!slug) return categoriaId
  return categorias.find((c) => c.slug === slug)?.id ?? categoriaId
}

export function veiculosOfereceiveis(
  veiculos: Veiculo[],
  empresas: Empresa[],
): Veiculo[] {
  const porId = new Map(empresas.map((empresa) => [empresa.id, empresa]))
  return veiculos.filter((veiculo) => {
    if (veiculo.status === 'inativo') return false
    const empresa = porId.get(veiculo.empresa_id)
    if (empresa) return empresa.status === 'ativa' && empresa.habilitada_receber
    // Sem ficha local (sync atrasado): confia na frota já filtrada pela nuvem.
    return true
  })
}

/** Categorias ativas que têm pelo menos um veículo cadastrado por empresa elegível. */
export function categoriasComFrotaDisponivel(
  categorias: CategoriaVeiculo[],
  veiculos: Veiculo[],
  empresas: Empresa[],
): CategoriaVeiculo[] {
  const frota = veiculosOfereceiveis(veiculos, empresas)
  if (!frota.length) {
    return categorias.filter((categoria) => categoria.ativo)
  }
  const ids = new Set(frota.map((veiculo) => veiculo.categoria_id))
  return categorias.filter((categoria) => categoria.ativo && ids.has(categoria.id))
}

export function veiculoDestaqueDaCategoria(
  categoriaId: string,
  veiculos: Veiculo[],
  empresas: Empresa[],
): Veiculo | undefined {
  const frota = veiculosOfereceiveis(veiculos, empresas).filter(
    (veiculo) => veiculo.categoria_id === categoriaId,
  )
  const disponiveis = frota.filter((veiculo) => veiculo.status === 'disponivel')
  const base = disponiveis.length ? disponiveis : frota
  return base.find((veiculo) => veiculo.fotos[0]) ?? base[0]
}
