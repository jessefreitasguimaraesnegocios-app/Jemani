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

function frotaAlinhada(
  veiculos: Veiculo[],
  empresas: Empresa[],
  categorias: CategoriaVeiculo[],
): Veiculo[] {
  return veiculosOfereceiveis(veiculos, empresas).map((veiculo) => ({
    ...veiculo,
    categoria_id: alinharCategoriaIdVeiculo(veiculo.categoria_id, categorias),
  }))
}

/** Categorias ativas que têm pelo menos um veículo cadastrado por empresa elegível. */
export function categoriasComFrotaDisponivel(
  categorias: CategoriaVeiculo[],
  veiculos: Veiculo[],
  empresas: Empresa[],
): CategoriaVeiculo[] {
  const ativas = categorias.filter((categoria) => categoria.ativo)
  const frota = frotaAlinhada(veiculos, empresas, categorias)
  if (!frota.length) return ativas
  const ids = new Set(frota.map((veiculo) => veiculo.categoria_id))
  const comFrota = ativas.filter((categoria) => ids.has(categoria.id))
  // IDs seed vs nuvem desalinhados: não zera o carrossel — mostra categorias ativas.
  return comFrota.length ? comFrota : ativas
}

export function veiculoDestaqueDaCategoria(
  categoriaId: string,
  veiculos: Veiculo[],
  empresas: Empresa[],
  categorias: CategoriaVeiculo[] = [],
): Veiculo | undefined {
  const alvo = alinharCategoriaIdVeiculo(categoriaId, categorias)
  const frota = frotaAlinhada(veiculos, empresas, categorias).filter(
    (veiculo) => veiculo.categoria_id === alvo,
  )
  const disponiveis = frota.filter((veiculo) => veiculo.status === 'disponivel')
  const base = disponiveis.length ? disponiveis : frota
  return base.find((veiculo) => veiculo.fotos[0]) ?? base[0]
}
