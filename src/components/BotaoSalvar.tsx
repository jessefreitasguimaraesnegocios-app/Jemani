import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react'
import './BotaoSalvar.css'

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> & {
  children: ReactNode
  /** Texto enquanto mostra a confirmação (padrão: Salvo) */
  rotuloOk?: string
  duracaoMs?: number
  /**
   * Se informado, o clique chama esta função (type vira button se não passar type).
   * Mostra o verde só se a Promise resolver sem erro.
   */
  aoSalvar?: () => void | Promise<void>
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void
}

export function BotaoSalvar({
  children,
  className = 'btn-primario',
  rotuloOk = 'Salvo',
  duracaoMs = 2000,
  aoSalvar,
  onClick,
  type,
  disabled,
  ...rest
}: Props) {
  const [ok, setOk] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const timerRef = useRef(0)

  useEffect(() => {
    return () => window.clearTimeout(timerRef.current)
  }, [])

  function mostrarOk() {
    setOk(true)
    window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setOk(false), duracaoMs)
  }

  async function aoClicar(e: MouseEvent<HTMLButtonElement>) {
    if (ok || enviando) {
      e.preventDefault()
      return
    }

    if (aoSalvar) {
      e.preventDefault()
      setEnviando(true)
      try {
        await aoSalvar()
        mostrarOk()
      } catch {
        /* erro tratado pelo chamador */
      } finally {
        setEnviando(false)
      }
      return
    }

    onClick?.(e)
    if (e.defaultPrevented) return

    const tipo = type ?? 'submit'
    if (tipo === 'submit') {
      const form = e.currentTarget.form
      if (form && !form.checkValidity()) return
      // Formulário válido: confirma visualmente (o onSubmit do form grava os dados).
      mostrarOk()
    } else {
      mostrarOk()
    }
  }

  const classes = [
    className,
    'btn-salvar',
    ok ? 'btn-salvar--ok' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type={aoSalvar ? 'button' : (type ?? 'submit')}
      className={classes}
      disabled={disabled || enviando}
      onClick={(e) => void aoClicar(e)}
      {...rest}
    >
      {ok ? (
        <>
          <span className="btn-salvar-check" aria-hidden>
            ✓
          </span>
          {rotuloOk}
        </>
      ) : (
        children
      )}
    </button>
  )
}
