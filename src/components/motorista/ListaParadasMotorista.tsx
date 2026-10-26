import { linkMapa } from '@/components/MapaCorrida'
import { paradasOrdenadas, proximaParadaPendente } from '@/services/paradasHourly'
import type { Viagem } from '@/types'
import './ListaParadasMotorista.css'

type Props = {
  viagem: Viagem
  onChegou: (paradaId: string) => void
}

export function ListaParadasMotorista({ viagem, onChegou }: Props) {
  const lista = paradasOrdenadas(viagem)
  if (!lista.length) return null
  const atual = proximaParadaPendente(viagem)

  return (
    <section className="lista-paradas-mot">
      <p className="lista-paradas-mot-titulo">Próximos endereços</p>
      <ol className="lista-paradas-mot-lista">
        {lista.map((parada, idx) => {
          const chegou = parada.status === 'chegou'
          const ehAtual = atual?.id === parada.id
          return (
            <li
              key={parada.id}
              className={`lista-paradas-mot-item${chegou ? ' lista-paradas-mot-item--feito' : ''}${
                ehAtual ? ' lista-paradas-mot-item--atual' : ''
              }`}
            >
              <div className="lista-paradas-mot-info">
                <span>{chegou ? 'Chegou' : ehAtual ? 'Agora' : `${idx + 1}º`}</span>
                <a
                  href={linkMapa(parada.endereco, parada.latitude, parada.longitude)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {parada.endereco}
                </a>
              </div>
              {ehAtual && (
                <button type="button" className="lista-paradas-mot-btn" onClick={() => onChegou(parada.id)}>
                  Cheguei neste endereço
                </button>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
