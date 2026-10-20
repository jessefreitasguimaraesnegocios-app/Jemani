import { useEffect, useState } from 'react'
import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSnow, Sun } from 'lucide-react'
import { buscarClima, type CodigoClima, type PrevisaoClima } from '@/services/clima'
import type { Viagem } from '@/types'
import './ClimaCorrida.css'

type Props = {
  viagem?: Pick<Viagem, 'origem_lat' | 'origem_lng' | 'destino_lat' | 'destino_lng' | 'motorista_lat' | 'motorista_lng'>
  gpsLat?: number
  gpsLng?: number
}

function Icone({ codigo }: { codigo: CodigoClima }) {
  const props = { size: 18, strokeWidth: 1.75 }
  switch (codigo) {
    case 'sol':
      return <Sun {...props} />
    case 'parcial':
      return <Cloud {...props} />
    case 'nublado':
      return <Cloud {...props} />
    case 'nevoa':
      return <CloudFog {...props} />
    case 'chuva':
      return <CloudRain {...props} />
    case 'neve':
      return <CloudSnow {...props} />
    case 'tempestade':
      return <CloudLightning {...props} />
  }
}

function LinhaLocal({
  titulo,
  previsao,
  carregando,
}: {
  titulo: string
  previsao?: PrevisaoClima | null
  carregando?: boolean
}) {
  if (carregando) {
    return (
      <div className="clima-local">
        <strong>{titulo}</strong>
        <span>Carregando...</span>
      </div>
    )
  }
  if (!previsao) {
    return (
      <div className="clima-local">
        <strong>{titulo}</strong>
        <span>Sem dados</span>
      </div>
    )
  }
  return (
    <div className="clima-local">
      <strong>{titulo}</strong>
      <span className="clima-local-linha">
        <Icone codigo={previsao.codigo} />
        {previsao.temperatura}°F · {previsao.rotulo}
        {previsao.maxima != null && previsao.minima != null
          ? ` · máx ${previsao.maxima}° / mín ${previsao.minima}°`
          : ''}
      </span>
    </div>
  )
}

export function ClimaCorrida({ viagem, gpsLat, gpsLng }: Props) {
  const [aberto, setAberto] = useState(false)
  const [aqui, setAqui] = useState<PrevisaoClima | null>(null)
  const [embarque, setEmbarque] = useState<PrevisaoClima | null>(null)
  const [destino, setDestino] = useState<PrevisaoClima | null>(null)
  const [carregando, setCarregando] = useState(true)

  const latAqui = Number.isFinite(gpsLat)
    ? gpsLat!
    : Number.isFinite(viagem?.motorista_lat)
      ? viagem!.motorista_lat!
      : Number.isFinite(viagem?.origem_lat)
        ? viagem!.origem_lat!
        : 34.0522
  const lngAqui = Number.isFinite(gpsLng)
    ? gpsLng!
    : Number.isFinite(viagem?.motorista_lng)
      ? viagem!.motorista_lng!
      : Number.isFinite(viagem?.origem_lng)
        ? viagem!.origem_lng!
        : -118.2437

  useEffect(() => {
    let vivo = true
    setCarregando(true)
    void Promise.all([
      buscarClima(latAqui, lngAqui).catch(() => null),
      Number.isFinite(viagem?.origem_lat) && Number.isFinite(viagem?.origem_lng)
        ? buscarClima(viagem!.origem_lat!, viagem!.origem_lng!).catch(() => null)
        : Promise.resolve(null),
      Number.isFinite(viagem?.destino_lat) && Number.isFinite(viagem?.destino_lng)
        ? buscarClima(viagem!.destino_lat!, viagem!.destino_lng!).catch(() => null)
        : Promise.resolve(null),
    ]).then(([cAqui, cEmb, cDes]) => {
      if (!vivo) return
      setAqui(cAqui)
      setEmbarque(cEmb)
      setDestino(cDes)
      setCarregando(false)
    })
    return () => {
      vivo = false
    }
  }, [
    latAqui,
    lngAqui,
    viagem?.origem_lat,
    viagem?.origem_lng,
    viagem?.destino_lat,
    viagem?.destino_lng,
  ])

  const resumo = aqui ?? embarque

  return (
    <div className="clima-corrida">
      <button
        type="button"
        className="clima-barra"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
      >
        {resumo ? (
          <>
            <span className="clima-icone">
              <Icone codigo={resumo.codigo} />
            </span>
            <span className="clima-temp">{resumo.temperatura}°F</span>
            <span className="clima-rotulo">{resumo.rotulo}</span>
          </>
        ) : (
          <span className="clima-rotulo">{carregando ? 'Clima...' : 'Clima indisponível'}</span>
        )}
        <span className="clima-dica">
          {aberto ? 'Fechar' : viagem ? 'Embarque / destino' : 'Detalhes'}
        </span>
      </button>
      {aberto && (
        <div className="clima-painel">
          <LinhaLocal titulo="Onde você está" previsao={aqui} carregando={carregando} />
          {viagem && (
            <>
              <LinhaLocal
                titulo="Embarque do passageiro"
                previsao={embarque}
                carregando={carregando}
              />
              <LinhaLocal
                titulo="Destino do passageiro"
                previsao={destino}
                carregando={carregando}
              />
            </>
          )}
        </div>
      )}
    </div>
  )
}
