import { useEffect, useRef, useState } from 'react'
import { Star } from 'lucide-react'
import './AvaliacaoEstrelas.css'

type Props = {
  rotulo: string
  valor: number
  aoMudar: (nota: number) => void
  desabilitado?: boolean
}

export function AvaliacaoEstrelas({ rotulo, valor, aoMudar, desabilitado }: Props) {
  const [hover, setHover] = useState(0)
  const [efeito, setEfeito] = useState<'sobe' | 'desce' | null>(null)
  const anterior = useRef(valor)

  useEffect(() => {
    if (valor === anterior.current) return
    setEfeito(valor > anterior.current ? 'sobe' : 'desce')
    anterior.current = valor
    const id = window.setTimeout(() => setEfeito(null), 420)
    return () => window.clearTimeout(id)
  }, [valor])

  const destaque = hover || valor

  return (
    <div className={`avaliacao-estrelas ${efeito ? `avaliacao-estrelas--${efeito}` : ''}`}>
      <div className="avaliacao-estrelas-topo">
        <span className="avaliacao-estrelas-rotulo">{rotulo}</span>
        <strong
          key={`${valor}-${efeito ?? 'ok'}`}
          className={`avaliacao-estrelas-numero ${efeito ? `avaliacao-estrelas-numero--${efeito}` : ''}`}
        >
          {valor}
        </strong>
      </div>
      <div
        className="avaliacao-estrelas-linha"
        onMouseLeave={() => setHover(0)}
        role="radiogroup"
        aria-label={rotulo}
      >
        {[1, 2, 3, 4, 5].map((nota) => {
          const ativa = nota <= destaque
          return (
            <button
              key={nota}
              type="button"
              className={`avaliacao-estrela avaliacao-estrela--n${nota} ${
                ativa ? 'avaliacao-estrela--ativa' : ''
              } ${efeito && nota <= valor ? `avaliacao-estrela--${efeito}` : ''}`}
              disabled={desabilitado}
              aria-label={`${nota} de 5`}
              aria-checked={valor === nota}
              role="radio"
              onMouseEnter={() => !desabilitado && setHover(nota)}
              onFocus={() => !desabilitado && setHover(nota)}
              onClick={() => aoMudar(nota)}
            >
              <Star size={28} strokeWidth={1.6} fill={ativa ? 'currentColor' : 'none'} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
