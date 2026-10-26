import { calcularDistanciaKm } from '@/services/mapasService'
import type { Empresa, EnderecoLocal, ParadaHourly, Viagem } from '@/types'

/** Limite inicial e por extensão paga (admin pode mudar via platform_settings). */
export const PARADAS_POR_BLOCO_PADRAO = 5
export const RAIO_PARADAS_KM_PADRAO = 80

export function lerParadasPorBloco(configuracoes: Array<{ chave: string; valor: string }>): number {
  const bruto = configuracoes.find((c) => c.chave === 'hourly_paradas_por_bloco')?.valor
  const n = Number(bruto)
  return Number.isFinite(n) && n > 0 ? Math.min(20, Math.floor(n)) : PARADAS_POR_BLOCO_PADRAO
}

export function lerRaioParadasKm(configuracoes: Array<{ chave: string; valor: string }>): number {
  const bruto = configuracoes.find((c) => c.chave === 'hourly_raio_paradas_km')?.valor
  const n = Number(bruto)
  return Number.isFinite(n) && n > 0 ? n : RAIO_PARADAS_KM_PADRAO
}

export function liberadasDaViagem(
  viagem: Viagem,
  configuracoes: Array<{ chave: string; valor: string }>,
): number {
  return viagem.paradas_liberadas ?? lerParadasPorBloco(configuracoes)
}

export function paradasOrdenadas(viagem: Viagem): ParadaHourly[] {
  return [...(viagem.paradas ?? [])].sort((a, b) => a.ordem - b.ordem)
}

export function proximaParadaPendente(viagem: Viagem): ParadaHourly | undefined {
  return paradasOrdenadas(viagem).find((p) => p.status === 'pendente')
}

export function slotsParadaRestantes(
  viagem: Viagem,
  configuracoes: Array<{ chave: string; valor: string }>,
): number {
  const liberadas = liberadasDaViagem(viagem, configuracoes)
  return Math.max(0, liberadas - (viagem.paradas?.length ?? 0))
}

export function validarParadaNoRaio(params: {
  viagem: Viagem
  empresa?: Empresa
  endereco: EnderecoLocal
  raioKm: number
}): { ok: true } | { ok: false; mensagem: string } {
  const { viagem, empresa, endereco, raioKm } = params
  if (!Number.isFinite(endereco.latitude) || !Number.isFinite(endereco.longitude)) {
    return { ok: false, mensagem: 'Selecione um endereço válido na lista.' }
  }

  const ancoras: Array<{ lat: number; lng: number; rotulo: string }> = []
  if (typeof viagem.origem_lat === 'number' && typeof viagem.origem_lng === 'number') {
    ancoras.push({ lat: viagem.origem_lat, lng: viagem.origem_lng, rotulo: 'embarque' })
  }
  if (
    empresa &&
    typeof empresa.latitude === 'number' &&
    typeof empresa.longitude === 'number'
  ) {
    ancoras.push({
      lat: empresa.latitude,
      lng: empresa.longitude,
      rotulo: 'base da empresa',
    })
  }
  if (ancoras.length === 0) {
    return { ok: true }
  }

  const distancias = ancoras.map((a) => ({
    ...a,
    km: calcularDistanciaKm(a.lat, a.lng, endereco.latitude, endereco.longitude),
  }))
  const maisProxima = distancias.reduce((a, b) => (a.km <= b.km ? a : b))
  if (maisProxima.km > raioKm) {
    return {
      ok: false,
      mensagem: `Endereço a ${maisProxima.km.toFixed(1)} km do ${maisProxima.rotulo} (limite ${raioKm} km).`,
    }
  }

  if (empresa?.regioes_atendidas?.length) {
    const cidade = (endereco.cidade ?? '').trim().toLowerCase()
    const texto = endereco.formatted.toLowerCase()
    const coberta = empresa.regioes_atendidas.some((regiao) => {
      const r = regiao.trim().toLowerCase()
      return Boolean(r) && (cidade.includes(r) || texto.includes(r) || r.includes(cidade))
    })
    // Só bloqueia se a cidade do endereço for clara e nenhuma região casar.
    if (cidade && !coberta) {
      return {
        ok: false,
        mensagem: `Fora das regiões atendidas (${empresa.regioes_atendidas.join(', ')}).`,
      }
    }
  }

  return { ok: true }
}
