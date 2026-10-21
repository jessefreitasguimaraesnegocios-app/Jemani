import { useEffect, useState } from 'react'
import {
  acompanharVoo,
  atualizarProgressoStatus,
  type StatusAcompanhamentoVoo,
} from '@/services/acompanharVoo'
import type { Viagem } from '@/types'
import './PainelVoo.css'

function formatarTrechoTempo(minutos: number | null) {
  if (minutos == null) return '—'
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  if (h <= 0) return `${m}m`
  return `${h}h ${m.toString().padStart(2, '0')}m`
}

export function PainelVoo({ viagem }: { viagem: Viagem }) {
  const [status, setStatus] = useState<StatusAcompanhamentoVoo | null>(null)
  const [aberto, setAberto] = useState(false)

  useEffect(() => {
    let vivo = true
    const carregar = () => {
      void acompanharVoo(viagem).then((dados) => {
        if (vivo) setStatus(dados)
      })
    }
    carregar()
    const id = window.setInterval(carregar, 60_000)
    return () => {
      vivo = false
      window.clearInterval(id)
    }
  }, [
    viagem.id,
    viagem.numero_voo,
    viagem.data_viagem,
    viagem.horario,
    viagem.origem,
    viagem.destino,
    viagem.origem_endereco,
    viagem.destino_endereco,
  ])

  useEffect(() => {
    if (!status?.decolagemIso || !status.pousoIso) return
    const id = window.setInterval(() => {
      setStatus((atual) => (atual ? atualizarProgressoStatus(atual) : atual))
    }, 15_000)
    return () => window.clearInterval(id)
  }, [status?.decolagemIso, status?.pousoIso, status?.codigo])

  if (!status) return null

  const pct = Math.round(status.progresso * 100)
  const aviaoNoFim = status.progresso >= 0.98

  return (
    <section
      className={`painel-voo${status.atrasado ? ' painel-voo--atraso' : ''}${
        aberto ? '' : ' painel-voo--compacto'
      }`}
    >
      <button
        type="button"
        className="painel-voo-topo"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
      >
        <span>{status.titulo}</span>
        <div className="painel-voo-topo-direita">
          <strong>{status.codigo}</strong>
          <em>{aberto ? 'Minimizar' : 'Abrir'}</em>
        </div>
      </button>

      <div className="painel-voo-rota" aria-hidden="true">
        <div className="painel-voo-cidade">
          <strong>{status.origemCodigo}</strong>
          {aberto && <span>{status.origemNome}</span>}
        </div>
        <div className="painel-voo-cidade painel-voo-cidade--direita">
          <strong>{status.destinoCodigo}</strong>
          {aberto && <span>{status.destinoNome}</span>}
        </div>
      </div>

      <div
        className="painel-voo-trilha"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={`Progresso do voo: ${pct}%`}
      >
        <div className="painel-voo-trilha-fundo" />
        <div className="painel-voo-trilha-verde" style={{ width: `${pct}%` }} />
        <span
          className={`painel-voo-aviao${aviaoNoFim ? ' painel-voo-aviao--fim' : ''}`}
          style={{ left: `${Math.min(100, Math.max(0, pct))}%` }}
        >
          ✈
        </span>
      </div>

      {aberto && (
        <>
          <div className="painel-voo-tempos">
            <span>{formatarTrechoTempo(status.minutosDecorridos)} decorridos</span>
            <span>{formatarTrechoTempo(status.minutosRestantes)} restantes</span>
          </div>
          {status.duracaoTotalMin != null && (
            <p className="painel-voo-duracao">
              {formatarTrechoTempo(status.duracaoTotalMin)} de voo no total
            </p>
          )}
          <p className="painel-voo-status">{status.status}</p>
          <p className="painel-voo-detalhe">{status.detalhe}</p>
          <p className="painel-voo-hora">Horário previsto (LA): {status.horarioPrevisto}</p>
        </>
      )}
    </section>
  )
}
