import { calcularDistanciaKm } from '@/services/mapasService'
import type { Empresa, HistoricoDistribuicao } from '@/types'
import { gerarId, agoraIso } from '@/utils/format'

export interface EmpresaComDistancia {
  empresa: Empresa
  distancia_km: number
}

export function empresaElegivel(
  empresa: Empresa,
  categoriaId: string,
): { ok: boolean; motivo?: string } {
  if (empresa.status !== 'ativa') return { ok: false, motivo: 'Empresa inativa' }
  if (!empresa.habilitada_receber) return { ok: false, motivo: 'Não habilitada a receber corridas' }
  if (!empresa.categorias_ids.includes(categoriaId)) {
    return { ok: false, motivo: 'Categoria de veículo não atendida' }
  }
  if (
    typeof empresa.latitude !== 'number' ||
    typeof empresa.longitude !== 'number' ||
    !Number.isFinite(empresa.latitude) ||
    !Number.isFinite(empresa.longitude)
  ) {
    return { ok: false, motivo: 'Empresa sem coordenadas cadastradas' }
  }
  return { ok: true }
}

/** Ordena empresas elegíveis da mais próxima à mais distante do embarque. */
export function ordenarEmpresasPorProximidade(
  empresas: Empresa[],
  origemLat: number,
  origemLng: number,
  categoriaId: string,
): { ordenadas: EmpresaComDistancia[]; historico: HistoricoDistribuicao[]; viagemId?: string } {
  const historico: HistoricoDistribuicao[] = []
  const elegiveis: EmpresaComDistancia[] = []

  for (const empresa of empresas) {
    const check = empresaElegivel(empresa, categoriaId)
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

    const distancia_km = calcularDistanciaKm(
      origemLat,
      origemLng,
      empresa.latitude!,
      empresa.longitude!,
    )
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
