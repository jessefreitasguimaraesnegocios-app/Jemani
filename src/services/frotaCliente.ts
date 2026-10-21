import type { CategoriaVeiculo, Empresa, Veiculo } from '@/types'

export function veiculosOfereceiveis(
  veiculos: Veiculo[],
  empresas: Empresa[],
): Veiculo[] {
  const empresasOk = new Set(
    empresas
      .filter((empresa) => empresa.status === 'ativa' && empresa.habilitada_receber)
      .map((empresa) => empresa.id),
  )
  return veiculos.filter(
    (veiculo) => veiculo.status !== 'inativo' && empresasOk.has(veiculo.empresa_id),
  )
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
  return frota.find((veiculo) => veiculo.fotos[0]) ?? frota[0]
}
