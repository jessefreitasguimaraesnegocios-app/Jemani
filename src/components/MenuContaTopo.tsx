import { useEffect, useId, useRef, useState } from 'react'
import { Languages, LogOut, Menu, Moon, X } from 'lucide-react'
import { usarTemaConta } from '@/hooks/usarPreferenciasConta'
import { usarIdioma } from '@/i18n/usarIdioma'
import type { IdiomaApp } from '@/i18n/tipos'
import type { TemaAparencia } from '@/lib/preferenciasConta'
import { cn } from '@/utils/format'
import './MenuContaTopo.css'

const IDIOMAS: Array<{ valor: IdiomaApp; rotulo: string }> = [
  { valor: 'pt-BR', rotulo: 'PT' },
  { valor: 'en', rotulo: 'EN' },
  { valor: 'es', rotulo: 'ES' },
]

const TEMAS: Array<{ valor: Exclude<TemaAparencia, 'sistema'>; chave: 'config.temaClaro' | 'config.temaEscuro' }> =
  [
    { valor: 'claro', chave: 'config.temaClaro' },
    { valor: 'escuro', chave: 'config.temaEscuro' },
  ]

type Props = {
  aoSair: () => void | Promise<void>
  className?: string
  /** Estilo claro sobre fundo escuro (sidebar). */
  tom?: 'claro' | 'escuro'
}

export function MenuContaTopo({ aoSair, className, tom = 'claro' }: Props) {
  const { t, idioma, definirIdioma } = usarIdioma()
  const { tema: temaAtual, definirTema } = usarTemaConta()
  const [aberto, setAberto] = useState(false)
  const raizRef = useRef<HTMLDivElement>(null)
  const painelId = useId()

  const temaAtivo: Exclude<TemaAparencia, 'sistema'> =
    temaAtual === 'escuro'
      ? 'escuro'
      : temaAtual === 'claro'
        ? 'claro'
        : typeof window !== 'undefined' &&
            window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'escuro'
          : 'claro'

  useEffect(() => {
    if (temaAtual === 'sistema') definirTema(temaAtivo)
  }, [temaAtual, temaAtivo, definirTema])

  useEffect(() => {
    if (!aberto) return
    function fecharFora(evento: MouseEvent | TouchEvent) {
      const alvo = evento.target as Node
      if (raizRef.current && !raizRef.current.contains(alvo)) setAberto(false)
    }
    function fecharEsc(evento: KeyboardEvent) {
      if (evento.key === 'Escape') setAberto(false)
    }
    document.addEventListener('mousedown', fecharFora)
    document.addEventListener('touchstart', fecharFora)
    document.addEventListener('keydown', fecharEsc)
    return () => {
      document.removeEventListener('mousedown', fecharFora)
      document.removeEventListener('touchstart', fecharFora)
      document.removeEventListener('keydown', fecharEsc)
    }
  }, [aberto])

  async function sair() {
    setAberto(false)
    await aoSair()
  }

  return (
    <div
      ref={raizRef}
      className={cn('menu-conta', tom === 'escuro' && 'menu-conta--escuro', className)}
    >
      <button
        type="button"
        className="menu-conta-botao"
        aria-expanded={aberto}
        aria-controls={painelId}
        aria-haspopup="menu"
        aria-label={t('menu.conta')}
        onClick={() => setAberto((v) => !v)}
      >
        {aberto ? <X size={20} strokeWidth={2} /> : <Menu size={20} strokeWidth={2} />}
      </button>

      {aberto && (
        <div id={painelId} className="menu-conta-painel" role="menu">
          <div className="menu-conta-bloco">
            <p className="menu-conta-rotulo">
              <Moon size={14} aria-hidden />
              {t('config.aparencia')}
            </p>
            <div
              className="menu-conta-opcoes menu-conta-opcoes--2"
              role="group"
              aria-label={t('config.aparencia')}
            >
              {TEMAS.map((opcao) => (
                <button
                  key={opcao.valor}
                  type="button"
                  role="menuitemradio"
                  aria-checked={temaAtivo === opcao.valor}
                  className={cn(
                    'menu-conta-chip',
                    temaAtivo === opcao.valor && 'menu-conta-chip--ativo',
                  )}
                  onClick={() => definirTema(opcao.valor)}
                >
                  {t(opcao.chave)}
                </button>
              ))}
            </div>
          </div>

          <div className="menu-conta-bloco">
            <p className="menu-conta-rotulo">
              <Languages size={14} aria-hidden />
              {t('config.idioma')}
            </p>
            <div
              className="menu-conta-opcoes menu-conta-opcoes--3"
              role="group"
              aria-label={t('config.idioma')}
            >
              {IDIOMAS.map((opcao) => (
                <button
                  key={opcao.valor}
                  type="button"
                  role="menuitemradio"
                  aria-checked={idioma === opcao.valor}
                  className={cn(
                    'menu-conta-chip',
                    idioma === opcao.valor && 'menu-conta-chip--ativo',
                  )}
                  onClick={() => definirIdioma(opcao.valor)}
                >
                  {opcao.rotulo}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            role="menuitem"
            className="menu-conta-item menu-conta-item--sair"
            onClick={() => void sair()}
          >
            <LogOut size={16} aria-hidden />
            {t('comum.sair')}
          </button>
        </div>
      )}
    </div>
  )
}
