import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Languages, LogOut, Menu, Moon, User, X } from 'lucide-react'
import { usarIdioma } from '@/i18n/usarIdioma'
import type { IdiomaApp } from '@/i18n/tipos'
import { useDemoStore } from '@/store/demoStore'
import { cn } from '@/utils/format'
import './MenuContaTopo.css'

const IDIOMAS: Array<{ valor: IdiomaApp; rotulo: string }> = [
  { valor: 'pt-BR', rotulo: 'Português' },
  { valor: 'en', rotulo: 'English' },
  { valor: 'es', rotulo: 'Español' },
]

type Props = {
  variante: 'completo' | 'admin'
  aoSair: () => void | Promise<void>
  className?: string
  /** Estilo claro sobre fundo escuro (sidebar). */
  tom?: 'claro' | 'escuro'
}

export function MenuContaTopo({ variante, aoSair, className, tom = 'claro' }: Props) {
  const { t, idioma, definirIdioma } = usarIdioma()
  const atualizarConfiguracao = useDemoStore((s) => s.atualizarConfiguracao)
  const temaAtual =
    useDemoStore((s) => s.configuracoes.find((c) => c.chave === 'tema_aparencia')?.valor) ?? 'claro'
  const [aberto, setAberto] = useState(false)
  const raizRef = useRef<HTMLDivElement>(null)
  const painelId = useId()

  const temas = [
    { valor: 'claro', rotulo: t('config.temaClaro') },
    { valor: 'escuro', rotulo: t('config.temaEscuro') },
    { valor: 'sistema', rotulo: t('config.temaSistema') },
  ]

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
          {variante === 'completo' && (
            <>
              <div className="menu-conta-bloco">
                <p className="menu-conta-rotulo">
                  <Moon size={14} aria-hidden />
                  {t('config.aparencia')}
                </p>
                <div className="menu-conta-opcoes" role="group" aria-label={t('config.aparencia')}>
                  {temas.map((opcao) => (
                    <button
                      key={opcao.valor}
                      type="button"
                      role="menuitemradio"
                      aria-checked={temaAtual === opcao.valor}
                      className={cn(
                        'menu-conta-chip',
                        temaAtual === opcao.valor && 'menu-conta-chip--ativo',
                      )}
                      onClick={() => atualizarConfiguracao('tema_aparencia', opcao.valor)}
                    >
                      {opcao.rotulo}
                    </button>
                  ))}
                </div>
              </div>

              <div className="menu-conta-bloco">
                <p className="menu-conta-rotulo">
                  <Languages size={14} aria-hidden />
                  {t('config.idioma')}
                </p>
                <div className="menu-conta-opcoes" role="group" aria-label={t('config.idioma')}>
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
            </>
          )}

          {variante === 'admin' && (
            <Link
              to="/admin/perfil"
              role="menuitem"
              className="menu-conta-item"
              onClick={() => setAberto(false)}
            >
              <User size={16} aria-hidden />
              {t('menu.perfil')}
            </Link>
          )}

          <button type="button" role="menuitem" className="menu-conta-item menu-conta-item--sair" onClick={() => void sair()}>
            <LogOut size={16} aria-hidden />
            {t('comum.sair')}
          </button>
        </div>
      )}
    </div>
  )
}
