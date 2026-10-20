import { useEffect, useState } from 'react'
import { acompanharVoo, type StatusAcompanhamentoVoo } from '@/services/acompanharVoo'
import type { Viagem } from '@/types'
import './PainelVoo.css'

export function PainelVoo({ viagem }: { viagem: Viagem }) {
  const [status, setStatus] = useState<StatusAcompanhamentoVoo | null>(null)

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

  if (!status) return null

  return (
    <section className={`painel-voo ${status.atrasado ? 'painel-voo--atraso' : ''}`}>
      <div className="painel-voo-topo">
        <span>{status.titulo}</span>
        <strong>{status.codigo}</strong>
      </div>
      <p className="painel-voo-status">{status.status}</p>
      <p className="painel-voo-detalhe">{status.detalhe}</p>
      <p className="painel-voo-hora">Horário previsto (LA): {status.horarioPrevisto}</p>
    </section>
  )
}
