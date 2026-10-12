import './MapaCorrida.css'

type Props = {
  origemLat?: number
  origemLng?: number
  destinoLat?: number
  destinoLng?: number
  motoristaLat?: number
  motoristaLng?: number
  legenda: string
}

function pin(cor: string, lng?: number, lat?: number) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return ''
  return `pin-s+${cor}(${lng},${lat})`
}

export function MapaCorrida({
  origemLat,
  origemLng,
  destinoLat,
  destinoLng,
  motoristaLat,
  motoristaLng,
  legenda,
}: Props) {
  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string | undefined
  const marcas = [
    pin('c9a46c', origemLng, origemLat),
    pin('f6f1e8', destinoLng, destinoLat),
    pin('3b82f6', motoristaLng, motoristaLat),
  ].filter(Boolean)

  if (!token || marcas.length === 0) {
    return (
      <div className="mapa-corrida">
        <p className="mapa-corrida-vazio">{legenda}</p>
      </div>
    )
  }

  const url = `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/${marcas.join(',')}/auto/800x500@2x?padding=70&access_token=${token}`

  return (
    <figure className="mapa-corrida">
      <img src={url} alt={legenda} />
    </figure>
  )
}

export function linkMapa(endereco: string, lat?: number, lng?: number) {
  if (typeof lat === 'number' && typeof lng === 'number') {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(endereco)}`
}
