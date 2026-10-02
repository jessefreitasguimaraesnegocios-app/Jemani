import type { EnderecoLocal } from '@/types'
import { montarTextoEndereco, numerosEnderecoIguais } from '@/utils/endereco'

export interface ResultadoRota {
  distanciaKm: number
  tempoMinutos: number
  provedor: 'google' | 'mapbox' | 'manual' | 'haversine'
}

/** Pontos reais em Los Angeles com rua + número (fallback DEV). */
export const PONTOS_DEV_LA: EnderecoLocal[] = [
  {
    formatted: '1 World Way, Los Angeles, CA 90045',
    rua: 'World Way',
    numero: '1',
    cidade: 'Los Angeles',
    estado: 'CA',
    cep: '90045',
    latitude: 33.9416,
    longitude: -118.4085,
    place_id: 'dev_lax',
    source: 'dev_fallback',
  },
  {
    formatted: '8423 Wilshire Blvd, Beverly Hills, CA 90211',
    rua: 'Wilshire Blvd',
    numero: '8423',
    cidade: 'Beverly Hills',
    estado: 'CA',
    cep: '90211',
    latitude: 34.0648,
    longitude: -118.3756,
    place_id: 'dev_beverly_hills',
    source: 'dev_fallback',
  },
  {
    formatted: '200 N Spring St, Los Angeles, CA 90012',
    rua: 'N Spring St',
    numero: '200',
    cidade: 'Los Angeles',
    estado: 'CA',
    cep: '90012',
    latitude: 34.0537,
    longitude: -118.2427,
    place_id: 'dev_dtla',
    source: 'dev_fallback',
  },
  {
    formatted: '200 Santa Monica Pier, Santa Monica, CA 90401',
    rua: 'Santa Monica Pier',
    numero: '200',
    cidade: 'Santa Monica',
    estado: 'CA',
    cep: '90401',
    latitude: 34.0100,
    longitude: -118.4960,
    place_id: 'dev_santa_monica',
    source: 'dev_fallback',
  },
  {
    formatted: '6801 Hollywood Blvd, Los Angeles, CA 90028',
    rua: 'Hollywood Blvd',
    numero: '6801',
    cidade: 'Los Angeles',
    estado: 'CA',
    cep: '90028',
    latitude: 34.1016,
    longitude: -118.3406,
    place_id: 'dev_hollywood',
    source: 'dev_fallback',
  },
  {
    formatted: '300 E Colorado Blvd, Pasadena, CA 91101',
    rua: 'E Colorado Blvd',
    numero: '300',
    cidade: 'Pasadena',
    estado: 'CA',
    cep: '91101',
    latitude: 34.1459,
    longitude: -118.1445,
    place_id: 'dev_pasadena',
    source: 'dev_fallback',
  },
  {
    formatted: '150 E Olive Ave, Burbank, CA 91502',
    rua: 'E Olive Ave',
    numero: '150',
    cidade: 'Burbank',
    estado: 'CA',
    cep: '91502',
    latitude: 34.1808,
    longitude: -118.3090,
    place_id: 'dev_burbank',
    source: 'dev_fallback',
  },
  {
    formatted: '300 E Ocean Blvd, Long Beach, CA 90802',
    rua: 'E Ocean Blvd',
    numero: '300',
    cidade: 'Long Beach',
    estado: 'CA',
    cep: '90802',
    latitude: 33.7701,
    longitude: -118.1937,
    place_id: 'dev_long_beach',
    source: 'dev_fallback',
  },
  {
    formatted: '10250 Santa Monica Blvd, Los Angeles, CA 90067',
    rua: 'Santa Monica Blvd',
    numero: '10250',
    cidade: 'Los Angeles',
    estado: 'CA',
    cep: '90067',
    latitude: 34.0556,
    longitude: -118.4180,
    place_id: 'dev_century_city',
    source: 'dev_fallback',
  },
  {
    formatted: '23000 Pacific Coast Hwy, Malibu, CA 90265',
    rua: 'Pacific Coast Hwy',
    numero: '23000',
    cidade: 'Malibu',
    estado: 'CA',
    cep: '90265',
    latitude: 34.0259,
    longitude: -118.7798,
    place_id: 'dev_malibu',
    source: 'dev_fallback',
  },
]

function tokenMapbox(): string | undefined {
  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string | undefined
  return token?.trim() || undefined
}

/** Mapbox local ou proxy Supabase disponível. */
export function googleMapsConfigurado(): boolean {
  if (tokenMapbox() && import.meta.env.VITE_MAPS_PROVIDER !== 'none') return true
  const url = import.meta.env.VITE_SUPABASE_URL
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
  const provider = import.meta.env.VITE_MAPS_PROVIDER
  return Boolean(url && anon && provider !== 'none')
}

type MapboxContext = { id: string; text: string; short_code?: string }
type MapboxFeature = {
  id: string
  place_name: string
  text?: string
  address?: string
  center?: [number, number]
  context?: MapboxContext[]
}

function contextoMapbox(feature: MapboxFeature, prefixo: string) {
  return feature.context?.find((c) => c.id.startsWith(prefixo))
}

function enderecoDeFeatureMapbox(feature: MapboxFeature): EnderecoLocal | null {
  const [lng, lat] = feature.center ?? [undefined, undefined]
  if (typeof lat !== 'number' || typeof lng !== 'number') return null
  const cidade =
    contextoMapbox(feature, 'place')?.text ||
    contextoMapbox(feature, 'locality')?.text ||
    contextoMapbox(feature, 'district')?.text
  const estadoRaw = contextoMapbox(feature, 'region')
  const estado = estadoRaw?.short_code?.replace(/^US-/, '') || estadoRaw?.text
  const cep = contextoMapbox(feature, 'postcode')?.text
  const numero = feature.address
  const rua = feature.text
  return {
    formatted: numero && rua
      ? `${numero} ${rua}${cidade ? `, ${cidade}` : ''}${estado ? `, ${estado}` : ''}${cep ? ` ${cep}` : ''}`
      : feature.place_name,
    latitude: lat,
    longitude: lng,
    place_id: feature.id,
    source: 'mapbox',
    rua,
    numero,
    cidade,
    estado,
    cep,
    numero_confirmado: Boolean(numero),
  }
}

async function geocodeMapboxDireto(query: string, types = 'address,poi'): Promise<MapboxFeature[]> {
  const token = tokenMapbox()
  if (!token) throw new Error('VITE_MAPBOX_ACCESS_TOKEN não configurada')
  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`,
  )
  url.searchParams.set('access_token', token)
  url.searchParams.set('country', 'us')
  url.searchParams.set('types', types)
  url.searchParams.set('language', 'en')
  url.searchParams.set('limit', '6')
  url.searchParams.set('autocomplete', 'true')
  const resp = await fetch(url)
  const data = await resp.json()
  if (!resp.ok) {
    throw new Error(data.message ?? `Mapbox geocode falhou (${resp.status})`)
  }
  return (data.features ?? []) as MapboxFeature[]
}

async function chamarPlacesProxy<T>(body: Record<string, unknown>): Promise<T> {
  const base = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (!base || !anon) {
    throw new Error('Supabase não configurado para Places')
  }

  const resp = await fetch(`${base}/functions/v1/places-proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${anon}`,
      apikey: anon,
    },
    body: JSON.stringify(body),
  })

  const data = (await resp.json()) as T & { erro?: string }
  if (!resp.ok) {
    throw new Error(data.erro ?? `Places proxy falhou (${resp.status})`)
  }
  if (data.erro) {
    throw new Error(data.erro)
  }
  return data
}

/** Distância Haversine em km entre dois pontos. */
export function calcularDistanciaKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c * 100) / 100
}

export function buscarSugestoesDev(termo: string): EnderecoLocal[] {
  const t = termo.trim().toLowerCase()
  if (!t) return PONTOS_DEV_LA.slice(0, 6)
  return PONTOS_DEV_LA.filter(
    (p) =>
      p.formatted.toLowerCase().includes(t) ||
      p.rua?.toLowerCase().includes(t) ||
      p.cidade?.toLowerCase().includes(t) ||
      p.numero?.includes(t),
  )
}

export async function estimarRota(
  origem: EnderecoLocal,
  destino: EnderecoLocal,
): Promise<ResultadoRota> {
  const km = calcularDistanciaKm(
    origem.latitude,
    origem.longitude,
    destino.latitude,
    destino.longitude,
  )
  return {
    distanciaKm: km,
    tempoMinutos: Math.round((km / 40) * 60),
    provedor: 'haversine',
  }
}

export async function buscarSugestoesPlaces(termo: string): Promise<
  Array<{ description: string; place_id: string }>
> {
  if (!termo.trim()) return []

  if (tokenMapbox()) {
    try {
      const features = await geocodeMapboxDireto(termo, 'address,poi')
      return features.map((f) => ({ description: f.place_name, place_id: f.id }))
    } catch {
      /* tenta proxy / DEV abaixo */
    }
  }

  if (!googleMapsConfigurado()) {
    return buscarSugestoesDev(termo).map((p) => ({
      description: p.formatted,
      place_id: p.place_id ?? p.formatted,
    }))
  }

  try {
    const data = await chamarPlacesProxy<{ sugestoes: Array<{ description: string; place_id: string }> }>({
      acao: 'autocomplete',
      termo,
    })
    return data.sugestoes ?? []
  } catch {
    return buscarSugestoesDev(termo).map((p) => ({
      description: p.formatted,
      place_id: p.place_id ?? p.formatted,
    }))
  }
}

export async function resolverPlaceId(placeId: string): Promise<EnderecoLocal> {
  const dev = PONTOS_DEV_LA.find((p) => p.place_id === placeId)
  if (dev) return { ...dev, numero_confirmado: Boolean(dev.numero) }

  if (tokenMapbox()) {
    const features = await geocodeMapboxDireto(placeId, 'address,poi')
    const feature = features.find((f) => f.id === placeId) ?? features[0]
    const endereco = feature ? enderecoDeFeatureMapbox(feature) : null
    if (endereco) {
      return { ...endereco, numero_confirmado: Boolean(endereco.numero) }
    }
  }

  if (!googleMapsConfigurado()) {
    throw new Error('Endereço DEV inválido. Selecione uma sugestão da lista.')
  }

  const data = await chamarPlacesProxy<{ endereco: EnderecoLocal }>({
    acao: 'details',
    place_id: placeId,
  })
  return {
    ...data.endereco,
    numero_confirmado: Boolean(data.endereco.numero),
  }
}

export interface ResultadoValidacaoNumero {
  ok: boolean
  mensagem?: string
  endereco?: EnderecoLocal
}

/**
 * Confirma se o número existe naquela rua via Geocoding.
 * Atualiza lat/lng quando o número é válido.
 */
export async function validarNumeroNoEndereco(
  base: EnderecoLocal,
  numero: string,
  complemento?: string,
): Promise<ResultadoValidacaoNumero> {
  const num = numero.trim()
  if (!num) {
    return { ok: false, mensagem: 'Informe o número do endereço.' }
  }

  const rua = base.rua?.trim()
  if (!rua) {
    return { ok: false, mensagem: 'Selecione um endereço com rua válida.' }
  }
  const nomeRua = rua

  // Fallback DEV local (sem proxy ou sem secret no Supabase)
  function validarNumeroDevLocal(): ResultadoValidacaoNumero {
    const candidatos = PONTOS_DEV_LA.filter(
      (p) =>
        p.rua?.toLowerCase() === nomeRua.toLowerCase() ||
        (base.cidade &&
          p.cidade?.toLowerCase() === base.cidade.toLowerCase() &&
          p.rua?.toLowerCase().includes(nomeRua.toLowerCase())) ||
        (base.place_id && p.place_id === base.place_id),
    )
    const daSugestao =
      PONTOS_DEV_LA.find(
        (p) =>
          (base.place_id && p.place_id === base.place_id && numerosEnderecoIguais(p.numero, num)) ||
          (p.rua?.toLowerCase() === nomeRua.toLowerCase() && numerosEnderecoIguais(p.numero, num)),
      ) ??
      candidatos.find((p) => numerosEnderecoIguais(p.numero, num))

    if (!daSugestao) {
      const conhecidos = candidatos.map((c) => c.numero).filter(Boolean).join(', ')
      return {
        ok: false,
        mensagem: conhecidos
          ? `Número ${num} não existe nesta rua. Números válidos: ${conhecidos}.`
          : `Número ${num} não existe neste endereço.`,
      }
    }

    return {
      ok: true,
      endereco: {
        ...daSugestao,
        complemento: complemento?.trim() || undefined,
        numero_confirmado: true,
        formatted: montarTextoEndereco({
          ...daSugestao,
          complemento: complemento?.trim() || undefined,
        }),
      },
    }
  }

  if (tokenMapbox()) {
    try {
      const query = [`${num} ${nomeRua}`, base.cidade, base.estado ?? 'CA', base.cep, 'USA']
        .filter(Boolean)
        .join(', ')
      const features = await geocodeMapboxDireto(query, 'address')
      const escolhido = features.find((f) => f.address && numerosEnderecoIguais(f.address, num))
      const endereco = escolhido ? enderecoDeFeatureMapbox(escolhido) : null
      if (!endereco) {
        return {
          ok: false,
          mensagem: `O número ${num} não existe neste endereço (${nomeRua}).`,
        }
      }
      return {
        ok: true,
        endereco: {
          ...endereco,
          complemento: complemento?.trim() || undefined,
          source: 'mapbox',
          numero_confirmado: true,
        },
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      if (!/token|401|403|unauthorized/i.test(msg)) {
        return { ok: false, mensagem: msg || `Não foi possível validar o número ${num}.` }
      }
    }
  }

  if (!googleMapsConfigurado()) {
    return validarNumeroDevLocal()
  }

  try {
    const data = await chamarPlacesProxy<{
      valido: boolean
      mensagem?: string
      endereco?: EnderecoLocal
      erro?: string
    }>({
      acao: 'geocode_numero',
      numero: num,
      rua: nomeRua,
      cidade: base.cidade,
      estado: base.estado ?? 'CA',
      cep: base.cep,
      complemento: complemento?.trim() || undefined,
    })

    if (!data.valido || !data.endereco) {
      return {
        ok: false,
        mensagem:
          data.mensagem ??
          `O número ${num} não existe neste endereço (${nomeRua}).`,
      }
    }

    return {
      ok: true,
      endereco: {
        ...data.endereco,
        complemento: complemento?.trim() || data.endereco.complemento,
        source: data.endereco.source ?? 'mapbox',
        numero_confirmado: true,
      },
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    // Secret ainda não configurado no Supabase → usa validação local DEV
    if (/MAPBOX_ACCESS_TOKEN|GOOGLE_MAPS_API_KEY/i.test(msg) || /não configurada/i.test(msg)) {
      return validarNumeroDevLocal()
    }
    return {
      ok: false,
      mensagem: msg || `Não foi possível validar o número ${num} neste endereço.`,
    }
  }
}
