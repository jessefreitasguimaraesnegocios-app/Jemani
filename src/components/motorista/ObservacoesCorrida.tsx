import { useState } from 'react'
import { textoObservacaoCliente } from '@/services/acompanharVoo'
import './ObservacoesCorrida.css'

export function ObservacoesCorrida({ observacoes }: { observacoes?: string }) {
  const texto = textoObservacaoCliente(observacoes)
  const [aberto, setAberto] = useState(true)

  if (!texto) return null

  return (
    <section className="obs-corrida">
      <button
        type="button"
        className="obs-corrida-topo"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
      >
        <span>Observações do passageiro</span>
        <em>{aberto ? 'Minimizar' : 'Abrir'}</em>
      </button>
      {aberto && <p className="obs-corrida-texto">{texto}</p>}
    </section>
  )
}
