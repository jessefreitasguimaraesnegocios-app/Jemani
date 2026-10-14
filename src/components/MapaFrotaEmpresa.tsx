import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { Viagem } from '@/types'
import { obterRotaRua } from '@/services/mapasService'
import { calcularPosicaoCorrida, corridaEstaNoMapa } from '@/services/posicaoCorridaAoVivo'

type PontoMotorista = {
  id: string
  latitude: number
  longitude: number
  nome: string
}

type FocoMapa = {
  id: string
  seq: number
  latitude: number
  longitude: number
}

type Props = {
  viagens: Viagem[]
  selecionadaId: string | null
  aoSelecionar: (id: string) => void
  pontosMotorista: PontoMotorista[]
  foco: FocoMapa | null
  aoFocarMotorista: (id: string) => void
}

const CARRO = `<svg viewBox="0 0 40 64" aria-hidden="true">
  <ellipse cx="20" cy="58" rx="12" ry="3" fill="#000" opacity="0.35"/>
  <path fill="#111" stroke="#e6e6e6" stroke-width="1.25" d="M20 4.5c5.1 0 8.2 3.1 8.8 8.4l.5 3.8c1.7 1.1 2.9 3.1 2.9 5.8v17.2c0 7.4-5 12.3-12.2 12.3S8 47.1 8 39.7V22.5c0-2.7 1.2-4.7 2.9-5.8l.5-3.8C11.8 7.6 14.9 4.5 20 4.5z"/>
  <path fill="#f7f9fb" d="M12.4 16.2h15.2c.9 0 1.4.9 1.1 1.7l-1.7 6.4c-.3.9-1.1 1.4-2 1.4h-9.8c-.9 0-1.7-.5-2-1.4l-1.7-6.4c-.3-.8.2-1.7 1.1-1.7z"/>
  <path fill="#3d4248" d="M13 38.2h14c.6 0 1 .6.8 1.2l-1.1 4.2c-.3.9-1.1 1.4-2 1.4h-9.4c-.9 0-1.7-.5-2-1.4l-1.1-4.2c-.2-.6.2-1.2.8-1.2z"/>
  <rect x="11.2" y="8.6" width="3.6" height="2.4" rx="1.1" fill="#fff6e8"/>
  <rect x="25.2" y="8.6" width="3.6" height="2.4" rx="1.1" fill="#fff6e8"/>
  <path fill="#161616" stroke="#e6e6e6" stroke-width="0.9" d="M6.4 24.2h3.4v6.2H7.2c-.9 0-1.8-.7-1.8-1.8v-2.4c0-1.2.6-2 1-2zm23.8 0H33.6c.4 0 1 .8 1 2v2.4c0 1.1-.9 1.8-1.8 1.8H30.2v-6.2z"/>
</svg>`

function rumoEmGraus(deLat: number, deLng: number, paraLat?: number, paraLng?: number) {
  if (typeof paraLat !== 'number' || typeof paraLng !== 'number') return null
  const dLat = paraLat - deLat
  const dLng = paraLng - deLng
  if (dLat * dLat + dLng * dLng < 0.00000004) return null
  const fi1 = (deLat * Math.PI) / 180
  const fi2 = (paraLat * Math.PI) / 180
  const delta = ((paraLng - deLng) * Math.PI) / 180
  const y = Math.sin(delta) * Math.cos(fi2)
  const x = Math.cos(fi1) * Math.sin(fi2) - Math.sin(fi1) * Math.cos(fi2) * Math.cos(delta)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

function criarBotaoCarro(rotulo: string, aoClicar: () => void) {
  const botao = document.createElement('button')
  botao.type = 'button'
  botao.className = 'ao-vivo-carro'
  botao.setAttribute('aria-label', rotulo)
  const giro = document.createElement('span')
  giro.className = 'ao-vivo-carro-giro'
  giro.innerHTML = CARRO
  botao.append(giro)
  botao.addEventListener('click', aoClicar)
  return botao
}

function apontarCarro(elemento: HTMLElement, graus: number | null) {
  if (graus == null) return
  const giro = elemento.querySelector('.ao-vivo-carro-giro')
  if (giro instanceof HTMLElement) giro.style.setProperty('--rumo', `${graus}deg`)
}

export function MapaFrotaEmpresa({
  viagens,
  selecionadaId,
  aoSelecionar,
  pontosMotorista,
  foco,
  aoFocarMotorista,
}: Props) {
  const caixaRef = useRef<HTMLDivElement>(null)
  const mapaRef = useRef<mapboxgl.Map | null>(null)
  const marcasRef = useRef<Map<string, mapboxgl.Marker>>(new Map())
  const viagensRef = useRef(viagens)
  const pontosRef = useRef(pontosMotorista)
  const selecionadaRef = useRef(selecionadaId)
  const focoIdRef = useRef<string | null>(foco?.id ?? null)
  const aoSelecionarRef = useRef(aoSelecionar)
  const aoFocarRef = useRef(aoFocarMotorista)
  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string | undefined

  viagensRef.current = viagens
  pontosRef.current = pontosMotorista
  selecionadaRef.current = selecionadaId
  focoIdRef.current = foco?.id ?? null
  aoSelecionarRef.current = aoSelecionar
  aoFocarRef.current = aoFocarMotorista

  useEffect(() => {
    if (!token || !caixaRef.current || mapaRef.current) return
    mapboxgl.accessToken = token
    const mapa = new mapboxgl.Map({
      container: caixaRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-118.35, 34.05],
      zoom: 10,
    })
    mapa.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
    mapaRef.current = mapa
    const observador = new ResizeObserver(() => mapa.resize())
    if (caixaRef.current) observador.observe(caixaRef.current)

    mapa.on('load', () => {
      mapa.resize()
      mapa.addSource('rota-selecionada', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })
      mapa.addLayer({
        id: 'rota-selecionada-linha',
        type: 'line',
        source: 'rota-selecionada',
        paint: {
          'line-color': '#c9a46c',
          'line-width': 3,
        },
      })
    })

    let quadro = 0
    let enquadrados = ''
    const pulsar = () => {
      try {
      const ativos = new Set<string>()
      for (const viagem of viagensRef.current) {
        if (!corridaEstaNoMapa(viagem.status)) continue
        const posicao = calcularPosicaoCorrida(viagem)
        if (!posicao) continue
        ativos.add(viagem.id)
        let marca = marcasRef.current.get(viagem.id)
        if (!marca) {
          const botao = criarBotaoCarro(viagem.codigo, () => aoSelecionarRef.current(viagem.id))
          marca = new mapboxgl.Marker({ element: botao, anchor: 'center' })
            .setLngLat([posicao.longitude, posicao.latitude])
            .addTo(mapa)
          marcasRef.current.set(viagem.id, marca)
        } else {
          marca.setLngLat([posicao.longitude, posicao.latitude])
        }
        const indoBuscar =
          viagem.status === 'motorista_a_caminho' || viagem.status === 'motorista_chegou'
        apontarCarro(
          marca.getElement(),
          rumoEmGraus(
            posicao.latitude,
            posicao.longitude,
            indoBuscar ? viagem.origem_lat : viagem.destino_lat,
            indoBuscar ? viagem.origem_lng : viagem.destino_lng,
          ),
        )
        marca.getElement().classList.toggle('ao-vivo-carro--ativo', viagem.id === selecionadaRef.current)
      }
      for (const ponto of pontosRef.current ?? []) {
        const chave = `ponto:${ponto.id}`
        ativos.add(chave)
        let marca = marcasRef.current.get(chave)
        if (!marca) {
          const botao = criarBotaoCarro(ponto.nome, () => aoFocarRef.current(ponto.id))
          marca = new mapboxgl.Marker({ element: botao, anchor: 'center' })
            .setLngLat([ponto.longitude, ponto.latitude])
            .addTo(mapa)
          marcasRef.current.set(chave, marca)
        } else {
          marca.setLngLat([ponto.longitude, ponto.latitude])
        }
        marca.getElement().classList.toggle('ao-vivo-carro--ativo', ponto.id === focoIdRef.current)
      }
      for (const [id, marca] of marcasRef.current) {
        if (ativos.has(id)) continue
        marca.remove()
        marcasRef.current.delete(id)
      }
      if (!selecionadaRef.current && !focoIdRef.current && ativos.size > 0 && mapa.isStyleLoaded()) {
        const chave = [...ativos].sort().join('|')
        if (chave !== enquadrados) {
          const limites = new mapboxgl.LngLatBounds()
          for (const viagem of viagensRef.current) {
            if (!ativos.has(viagem.id)) continue
            const posicao = calcularPosicaoCorrida(viagem)
            if (posicao) limites.extend([posicao.longitude, posicao.latitude])
          }
          for (const ponto of pontosRef.current ?? []) {
            limites.extend([ponto.longitude, ponto.latitude])
          }
          if (!limites.isEmpty()) {
            mapa.fitBounds(limites, { padding: 80, maxZoom: 12, duration: 700 })
          }
          enquadrados = chave
        }
      }
      } catch (erro) {
        console.error(erro)
      }
      quadro = window.requestAnimationFrame(pulsar)
    }
    pulsar()

    return () => {
      window.cancelAnimationFrame(quadro)
      observador.disconnect()
      for (const marca of marcasRef.current.values()) marca.remove()
      marcasRef.current.clear()
      mapa.remove()
      mapaRef.current = null
    }
  }, [token])

  const selecionada = viagens.find((item) => item.id === selecionadaId)
  useEffect(() => {
    const mapa = mapaRef.current
    if (!mapa) return
    const viagem = viagensRef.current.find((item) => item.id === selecionadaId)
    let cancelado = false
    const desenhar = () => {
      void (async () => {
        const fonte = mapa.getSource('rota-selecionada') as mapboxgl.GeoJSONSource | undefined
        if (!fonte) return
        if (
          !viagem ||
          typeof viagem.origem_lat !== 'number' ||
          typeof viagem.origem_lng !== 'number' ||
          typeof viagem.destino_lat !== 'number' ||
          typeof viagem.destino_lng !== 'number'
        ) {
          fonte.setData({ type: 'FeatureCollection', features: [] })
          return
        }
        const rota = await obterRotaRua(
          { latitude: viagem.origem_lat, longitude: viagem.origem_lng },
          { latitude: viagem.destino_lat, longitude: viagem.destino_lng },
        )
        if (cancelado) return
        if (rota.provedor !== 'mapbox' || rota.coordenadas.length < 2) {
          fonte.setData({ type: 'FeatureCollection', features: [] })
          return
        }
        fonte.setData({
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: rota.coordenadas },
        })
        const limites = new mapboxgl.LngLatBounds()
        for (const ponto of rota.coordenadas) limites.extend(ponto)
        const carro = calcularPosicaoCorrida(viagem)
        if (carro) limites.extend([carro.longitude, carro.latitude])
        if (focoIdRef.current || limites.isEmpty()) return
        mapa.fitBounds(limites, { padding: 80, maxZoom: 13, duration: 700 })
      })()
    }
    if (mapa.isStyleLoaded()) desenhar()
    else mapa.once('load', desenhar)
    return () => {
      cancelado = true
    }
  }, [
    selecionadaId,
    selecionada?.origem_lat,
    selecionada?.origem_lng,
    selecionada?.destino_lat,
    selecionada?.destino_lng,
  ])

  useEffect(() => {
    const mapa = mapaRef.current
    if (!mapa || !foco) return
    const ir = () => {
      mapa.flyTo({
        center: [foco.longitude, foco.latitude],
        zoom: 13,
        duration: 700,
      })
    }
    if (mapa.isStyleLoaded()) ir()
    else mapa.once('load', ir)
  }, [foco?.seq])

  return <div ref={caixaRef} className="ao-vivo-canvas" />
}
