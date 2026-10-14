import { useEffect, useState } from 'react'
import { obterRotaRua, urlMapaEstatico } from '@/services/mapasService'
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

export function MapaCorrida({
  origemLat,
  origemLng,
  destinoLat,
  destinoLng,
  motoristaLat,
  motoristaLng,
  legenda,
}: Props) {
  const [polyline, setPolyline] = useState<string | undefined>()
  const temTrecho =
    typeof origemLat === 'number' &&
    typeof origemLng === 'number' &&
    typeof destinoLat === 'number' &&
    typeof destinoLng === 'number'

  useEffect(() => {
    if (!temTrecho) {
      setPolyline(undefined)
      return
    }
    let ativo = true
    void obterRotaRua(
      { latitude: origemLat, longitude: origemLng },
      { latitude: destinoLat, longitude: destinoLng },
    ).then((rota) => {
      if (!ativo) return
      setPolyline(rota.provedor === 'mapbox' ? rota.polyline : undefined)
    })
    return () => {
      ativo = false
    }
  }, [temTrecho, origemLat, origemLng, destinoLat, destinoLng])

  const url = urlMapaEstatico({
    origemLat,
    origemLng,
    destinoLat,
    destinoLng,
    motoristaLat,
    motoristaLng,
    polyline,
  })

  if (!url) {
    return (
      <div className="mapa-corrida">
        <p className="mapa-corrida-vazio">{legenda}</p>
      </div>
    )
  }

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
