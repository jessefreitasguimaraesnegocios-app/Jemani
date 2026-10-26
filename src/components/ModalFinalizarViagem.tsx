import { useState } from 'react'
import type { Viagem } from '@/types'
import { formatarData, formatarMoeda } from '@/utils/format'
import './ModalFinalizarViagem.css'

interface Props {
  viagem: Viagem
  clienteNome?: string
  empresaNome?: string
  veiculoLabel?: string
  onCancelar: () => void
  onConfirmar: () => void
  carregando?: boolean
}

export function ModalFinalizarViagem({
  viagem,
  clienteNome,
  empresaNome,
  veiculoLabel,
  onCancelar,
  onConfirmar,
  carregando,
}: Props) {
  const [etapa, definirEtapa] = useState<1 | 2>(1)

  return (
    <div className="finalizar-fundo">
      <div className="finalizar-painel">
        <h2>{etapa === 1 ? 'Finalizar corrida?' : 'Confirme novamente'}</h2>
        <p>
          {etapa === 1
            ? 'Revise os dados. A finalização exige uma segunda confirmação.'
            : 'Última verificação antes de marcar como concluída.'}
        </p>
        <div className="finalizar-dados">
          <p>
            <strong>Código:</strong> {viagem.codigo}
          </p>
          <p>
            <strong>Cliente:</strong> {clienteNome ?? '—'}
          </p>
          <p>
            <strong>Origem:</strong> {viagem.origem}
          </p>
          <p>
            <strong>{viagem.modalidade === 'hourly' ? 'Serviço' : 'Destino'}:</strong>{' '}
            {viagem.modalidade === 'hourly' ? 'Hourly Chauffeur (as directed)' : viagem.destino}
          </p>
          <p>
            <strong>Data/hora:</strong> {formatarData(viagem.data_viagem)} · {viagem.horario}
          </p>
          <p>
            <strong>Empresa:</strong> {empresaNome ?? '—'}
          </p>
          <p>
            <strong>Veículo:</strong> {veiculoLabel ?? '—'}
          </p>
          <p>
            <strong>Valor:</strong> {formatarMoeda(viagem.preco_total)}
          </p>
        </div>
        <div className="finalizar-acoes">
          <button type="button" className="finalizar-cancelar" onClick={onCancelar} disabled={carregando}>
            Cancelar
          </button>
          {etapa === 1 ? (
            <button type="button" className="finalizar-seguir" onClick={() => definirEtapa(2)}>
              Continuar
            </button>
          ) : (
            <button type="button" className="finalizar-seguir" onClick={onConfirmar} disabled={carregando}>
              {carregando ? 'Finalizando...' : 'Confirmar finalização'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
