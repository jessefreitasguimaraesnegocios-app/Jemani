export type CodigoClima =
  | 'sol'
  | 'parcial'
  | 'nublado'
  | 'nevoa'
  | 'chuva'
  | 'neve'
  | 'tempestade'

export type PrevisaoClima = {
  lat: number
  lng: number
  temperatura: number
  sensacao: number
  codigo: CodigoClima
  rotulo: string
  maxima?: number
  minima?: number
}

const CACHE = new Map<string, { em: number; dados: PrevisaoClima }>()
const TTL_MS = 12 * 60 * 1000

function chave(lat: number, lng: number) {
  return `${lat.toFixed(2)},${lng.toFixed(2)}`
}

export function codigoDoWmo(code: number): CodigoClima {
  if (code === 0) return 'sol'
  if (code <= 2) return 'parcial'
  if (code <= 3) return 'nublado'
  if (code === 45 || code === 48) return 'nevoa'
  if (code >= 71 && code <= 77) return 'neve'
  if (code >= 95) return 'tempestade'
  if (
    (code >= 51 && code <= 67) ||
    (code >= 80 && code <= 82) ||
    code === 85 ||
    code === 86
  ) {
    return 'chuva'
  }
  return 'nublado'
}

export function rotuloDoCodigo(codigo: CodigoClima): string {
  switch (codigo) {
    case 'sol':
      return 'Ensolarado'
    case 'parcial':
      return 'Parcialmente nublado'
    case 'nublado':
      return 'Nublado'
    case 'nevoa':
      return 'Névoa'
    case 'chuva':
      return 'Chuva'
    case 'neve':
      return 'Neve'
    case 'tempestade':
      return 'Tempestade'
  }
}

/** Previsão real via Open-Meteo (sem chave). */
export async function buscarClima(lat: number, lng: number): Promise<PrevisaoClima> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error('Coordenadas inválidas para o clima.')
  }
  const k = chave(lat, lng)
  const cache = CACHE.get(k)
  if (cache && Date.now() - cache.em < TTL_MS) return cache.dados

  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    current: 'temperature_2m,apparent_temperature,weather_code',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min',
    temperature_unit: 'fahrenheit',
    timezone: 'America/Los_Angeles',
    forecast_days: '1',
  })
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
  if (!res.ok) throw new Error('Não foi possível carregar a previsão do tempo.')
  const json = (await res.json()) as {
    current?: {
      temperature_2m?: number
      apparent_temperature?: number
      weather_code?: number
    }
    daily?: {
      temperature_2m_max?: number[]
      temperature_2m_min?: number[]
      weather_code?: number[]
    }
  }
  const codigoWmo = Number(json.current?.weather_code ?? json.daily?.weather_code?.[0] ?? 0)
  const codigo = codigoDoWmo(codigoWmo)
  const dados: PrevisaoClima = {
    lat,
    lng,
    temperatura: Math.round(Number(json.current?.temperature_2m ?? 0)),
    sensacao: Math.round(Number(json.current?.apparent_temperature ?? json.current?.temperature_2m ?? 0)),
    codigo,
    rotulo: rotuloDoCodigo(codigo),
    maxima: json.daily?.temperature_2m_max?.[0] != null
      ? Math.round(json.daily.temperature_2m_max[0])
      : undefined,
    minima: json.daily?.temperature_2m_min?.[0] != null
      ? Math.round(json.daily.temperature_2m_min[0])
      : undefined,
  }
  CACHE.set(k, { em: Date.now(), dados })
  return dados
}
