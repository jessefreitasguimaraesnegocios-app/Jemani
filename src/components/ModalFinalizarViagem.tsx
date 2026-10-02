import { useState } from 'react'
import type { Viagem } from '@/types'
import { formatarData, formatarMoeda } from '@/utils/format'

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
  const [etapa, setEtapa] = useState<1 | 2>(1)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="cartao animar-entrada w-full max-w-lg space-y-4">
        <h2 className="fonte-display text-2xl">
          {etapa === 1 ? 'Finalizar corrida?' : 'Confirme novamente'}
        </h2>
        <p className="text-sm text-[var(--color-slate)]">
          {etapa === 1
            ? 'Revise os dados. A finalização exige uma segunda confirmação.'
            : 'Última verificação antes de marcar como concluída.'}
        </p>
        <div className="space-y-2 rounded-xl bg-[rgba(12,18,34,0.04)] p-3 text-sm">
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
            <strong>Destino:</strong> {viagem.destino}
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
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secundario" onClick={onCancelar} disabled={carregando}>
            Cancelar
          </button>
          {etapa === 1 ? (
            <button type="button" className="btn-primario" onClick={() => setEtapa(2)}>
              Continuar
            </button>
          ) : (
            <button type="button" className="btn-ouro" onClick={onConfirmar} disabled={carregando}>
              {carregando ? 'Finalizando...' : 'Confirmar finalização'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
