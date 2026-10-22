import { calcularDistanciaKm } from '@/services/mapasService'
import type { Empresa, HistoricoDistribuicao, Veiculo } from '@/types'
import { gerarId, agoraIso } from '@/utils/format'

export interface EmpresaComDistancia {
  empresa: Empresa
  distancia_km: number
}

export function empresaElegivel(
  empresa: Empresa,
  categoriaId: string,
  veiculos?: Veiculo[],
): { ok: boolean; motivo?: string } {
  if (empresa.status !== 'ativa') return { ok: false, motivo: 'Empresa inativa' }
  if (!empresa.habilitada_receber) return { ok: false, motivo: 'Não habilitada a receber corridas' }
  if (
    empresa.categorias_ids.length > 0 &&
    !empresa.categorias_ids.includes(categoriaId)
  ) {
    return { ok: false, motivo: 'Categoria de veículo não atendida' }
  }
  if (veiculos) {
    const frotaAtiva = veiculos.filter(
      (veiculo) => veiculo.empresa_id === empresa.id && veiculo.status !== 'inativo',
    )
    // Só exige o carro da categoria quando a empresa já tem frota no store.
    // Sem veículos listados, vale o cadastro de categorias (evita zerar ofertas).
    if (
      frotaAtiva.length > 0 &&
      !frotaAtiva.some((veiculo) => veiculo.categoria_id === categoriaId)
    ) {
      return { ok: false, motivo: 'Sem veículo dessa categoria na frota' }
    }
  }
  return { ok: true }
}

/** Ordena empresas elegíveis da mais próxima à mais distante do embarque. */
export function ordenarEmpresasPorProximidade(
  empresas: Empresa[],
  origemLat: number,
  origemLng: number,
  categoriaId: string,
  veiculos?: Veiculo[],
): { ordenadas: EmpresaComDistancia[]; historico: HistoricoDistribuicao[]; viagemId?: string } {
  const historico: HistoricoDistribuicao[] = []
  const elegiveis: EmpresaComDistancia[] = []

  for (const empresa of empresas) {
    const check = empresaElegivel(empresa, categoriaId, veiculos)
    if (!check.ok) {
      historico.push({
        id: gerarId(),
        viagem_id: '',
        empresa_id: empresa.id,
        distancia_km:
          typeof empresa.latitude === 'number' && typeof empresa.longitude === 'number'
            ? calcularDistanciaKm(origemLat, origemLng, empresa.latitude, empresa.longitude)
            : -1,
        resultado: 'indisponivel',
        motivo: check.motivo,
        created_at: agoraIso(),
      })
      continue
    }

    const temCoords =
      typeof empresa.latitude === 'number' &&
      typeof empresa.longitude === 'number' &&
      Number.isFinite(empresa.latitude) &&
      Number.isFinite(empresa.longitude)
    const distancia_km = temCoords
      ? calcularDistanciaKm(origemLat, origemLng, empresa.latitude!, empresa.longitude!)
      : 9999
    elegiveis.push({ empresa, distancia_km })
  }

  elegiveis.sort((a, b) => a.distancia_km - b.distancia_km)
  return { ordenadas: elegiveis, historico }
}

export function anexarViagemAoHistorico(
  historico: HistoricoDistribuicao[],
  viagemId: string,
): HistoricoDistribuicao[] {
  return historico.map((h) => ({ ...h, viagem_id: viagemId || h.viagem_id }))
}
