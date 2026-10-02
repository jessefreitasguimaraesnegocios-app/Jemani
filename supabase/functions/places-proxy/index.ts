import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

type MapboxContext = {
  id: string
  text: string
  short_code?: string
}

type MapboxFeature = {
  id: string
  place_name: string
  text?: string
  address?: string
  center?: [number, number]
  context?: MapboxContext[]
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  })
}

function montarFormatted(parts: {
  numero?: string
  rua?: string
  cidade?: string
  estado?: string
  cep?: string
  fallback: string
}) {
  if (parts.numero && parts.rua) {
    const linha = `${parts.numero} ${parts.rua}`
    const resto = [parts.cidade, parts.estado, parts.cep].filter(Boolean).join(", ")
    return resto ? `${linha}, ${resto}` : linha
  }
  return parts.fallback
}

function normalizarNumero(n: string) {
  return n.trim().toUpperCase().replace(/\s+/g, "")
}

function contextoMapbox(feature: MapboxFeature, prefixo: string) {
  return feature.context?.find((c) => c.id.startsWith(prefixo))
}

function enderecoDeFeatureMapbox(feature: MapboxFeature) {
  const [lng, lat] = feature.center ?? [undefined, undefined]
  if (typeof lat !== "number" || typeof lng !== "number") return null

  const cidade =
    contextoMapbox(feature, "place")?.text ||
    contextoMapbox(feature, "locality")?.text ||
    contextoMapbox(feature, "district")?.text
  const estadoRaw = contextoMapbox(feature, "region")
  const estado = estadoRaw?.short_code?.replace(/^US-/, "") || estadoRaw?.text
  const cep = contextoMapbox(feature, "postcode")?.text
  const numero = feature.address
  const rua = feature.text

  return {
    formatted: montarFormatted({
      numero,
      rua,
      cidade,
      estado,
      cep,
      fallback: feature.place_name,
    }),
    latitude: lat,
    longitude: lng,
    place_id: feature.id,
    source: "mapbox",
    rua,
    numero,
    cidade,
    estado,
    cep,
    numero_confirmado: Boolean(numero),
  }
}

async function geocodeMapbox(token: string, query: string, types = "address") {
  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`,
  )
  url.searchParams.set("access_token", token)
  url.searchParams.set("country", "us")
  url.searchParams.set("types", types)
  url.searchParams.set("language", "en")
  url.searchParams.set("limit", "6")
  url.searchParams.set("autocomplete", "true")

  const resp = await fetch(url)
  const data = await resp.json()
  if (!resp.ok) {
    throw new Error(data.message ?? `Mapbox geocode falhou (${resp.status})`)
  }
  return (data.features ?? []) as MapboxFeature[]
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS })
  }

  if (req.method !== "POST") {
    return json({ erro: "Método não permitido" }, 405)
  }

  const mapboxToken = Deno.env.get("MAPBOX_ACCESS_TOKEN")
  if (!mapboxToken) {
    return json({ erro: "MAPBOX_ACCESS_TOKEN não configurada no Supabase" }, 500)
  }

  let payload: {
    acao?: string
    termo?: string
    place_id?: string
    numero?: string
    rua?: string
    cidade?: string
    estado?: string
    cep?: string
    complemento?: string
  }
  try {
    payload = await req.json()
  } catch {
    return json({ erro: "JSON inválido" }, 400)
  }

  const acao = payload.acao

  if (acao === "autocomplete") {
    const termo = (payload.termo ?? "").trim()
    if (!termo) return json({ sugestoes: [] })
    try {
      const features = await geocodeMapbox(mapboxToken, termo, "address,poi")
      return json({
        sugestoes: features.map((f) => ({
          description: f.place_name,
          place_id: f.id,
        })),
      })
    } catch (e) {
      return json({
        erro: e instanceof Error ? e.message : "Falha no autocomplete Mapbox",
      }, 502)
    }
  }

  if (acao === "details") {
    const placeId = (payload.place_id ?? "").trim()
    if (!placeId) return json({ erro: "place_id obrigatório" }, 400)
    try {
      const features = await geocodeMapbox(mapboxToken, placeId, "address,poi")
      const feature = features.find((f) => f.id === placeId) ?? features[0]
      const endereco = feature ? enderecoDeFeatureMapbox(feature) : null
      if (!endereco) {
        return json({ erro: "Não foi possível obter coordenadas do endereço" }, 502)
      }
      return json({ endereco })
    } catch (e) {
      return json({
        erro: e instanceof Error ? e.message : "Falha no details Mapbox",
      }, 502)
    }
  }

  if (acao === "geocode_numero") {
    const numero = (payload.numero ?? "").trim()
    const rua = (payload.rua ?? "").trim()
    if (!numero || !rua) {
      return json({ valido: false, mensagem: "Número e rua são obrigatórios." })
    }

    const query = [`${numero} ${rua}`, payload.cidade, payload.estado ?? "CA", payload.cep, "USA"]
      .filter(Boolean)
      .join(", ")

    try {
      const features = await geocodeMapbox(mapboxToken, query, "address")
      const pedido = normalizarNumero(numero)
      const escolhido = features.find((f) => f.address && normalizarNumero(f.address) === pedido)
      const endereco = escolhido ? enderecoDeFeatureMapbox(escolhido) : null
      if (!endereco) {
        return json({
          valido: false,
          mensagem: `O número ${numero} não existe neste endereço (${rua}).`,
        })
      }
      return json({
        valido: true,
        endereco: {
          ...endereco,
          complemento: payload.complemento,
          numero_confirmado: true,
        },
      })
    } catch (e) {
      return json({
        valido: false,
        mensagem: e instanceof Error ? e.message : "Falha ao validar número no Mapbox",
      }, 502)
    }
  }

  return json({ erro: "acao inválida (use autocomplete, details ou geocode_numero)" }, 400)
})
