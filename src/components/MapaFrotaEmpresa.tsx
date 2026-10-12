import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { Viagem } from '@/types'
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

const CARRO = `<svg viewBox="0 0 34 34" aria-hidden="true"><circle cx="17" cy="17" r="16" fill="#111"/><path fill="#c9a46c" d="M8 19.2c.2-2.4 1.5-4.4 3.4-5.2l1.6-2.2c.4-.5 1-.8 1.6-.8h4.8c.6 0 1.2.3 1.6.8l1.6 2.2c1.9.8 3.2 2.8 3.4 5.2.4.2.7.6.7 1.1v2.2c0 .6-.5 1.1-1.1 1.1h-1.1c-.2 1-.9 1.6-1.8 1.6s-1.6-.6-1.8-1.6h-6.2c-.2 1-.9 1.6-1.8 1.6s-1.6-.6-1.8-1.6H8.4c-.6 0-1.1-.5-1.1-1.1v-2.2c0-.5.3-.9.7-1.1zm4.2-6.2 1.1 1.6h7.4l1.1-1.6H12.2z"/></svg>`

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
      const agora = Date.now()
      const ativos = new Set<string>()
      for (const viagem of viagensRef.current) {
        if (!corridaEstaNoMapa(viagem.status)) continue
        const posicao = calcularPosicaoCorrida(viagem, agora)
        if (!posicao) continue
        ativos.add(viagem.id)
        let marca = marcasRef.current.get(viagem.id)
        if (!marca) {
          const botao = document.createElement('button')
          botao.type = 'button'
          botao.className = 'ao-vivo-carro'
          botao.innerHTML = CARRO
          botao.setAttribute('aria-label', viagem.codigo)
          botao.addEventListener('click', () => aoSelecionarRef.current(viagem.id))
          marca = new mapboxgl.Marker({ element: botao, anchor: 'center' })
            .setLngLat([posicao.longitude, posicao.latitude])
            .addTo(mapa)
          marcasRef.current.set(viagem.id, marca)
        } else {
          marca.setLngLat([posicao.longitude, posicao.latitude])
        }
        marca.getElement().classList.toggle('ao-vivo-carro--ativo', viagem.id === selecionadaRef.current)
      }
      for (const ponto of pontosRef.current ?? []) {
        const chave = `ponto:${ponto.id}`
        ativos.add(chave)
        let marca = marcasRef.current.get(chave)
        if (!marca) {
          const botao = document.createElement('button')
          botao.type = 'button'
          botao.className = 'ao-vivo-carro'
          botao.innerHTML = CARRO
          botao.setAttribute('aria-label', ponto.nome)
          botao.addEventListener('click', () => aoFocarRef.current(ponto.id))
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
            const posicao = calcularPosicaoCorrida(viagem, agora)
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

  useEffect(() => {
    const mapa = mapaRef.current
    if (!mapa) return
    const viagem = viagensRef.current.find((item) => item.id === selecionadaId)
    const desenhar = () => {
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
      fonte.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [
            [viagem.origem_lng, viagem.origem_lat],
            [viagem.destino_lng, viagem.destino_lat],
          ],
        },
      })
      const limites = new mapboxgl.LngLatBounds()
      limites.extend([viagem.origem_lng, viagem.origem_lat])
      limites.extend([viagem.destino_lng, viagem.destino_lat])
      const carro = calcularPosicaoCorrida(viagem, Date.now())
      if (carro) limites.extend([carro.longitude, carro.latitude])
      if (focoIdRef.current) return
      mapa.fitBounds(limites, { padding: 80, maxZoom: 13, duration: 700 })
    }
    if (mapa.isStyleLoaded()) desenhar()
    else mapa.once('load', desenhar)
  }, [selecionadaId])

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
