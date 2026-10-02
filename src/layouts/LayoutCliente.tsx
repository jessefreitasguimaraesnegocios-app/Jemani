import { useMemo, useRef } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Bell, Car, Home, LogOut, User, CalendarPlus } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { usarIdioma } from '@/i18n/usarIdioma'
import type { ChaveTraducao } from '@/i18n/mensagens'
import { usarRolagemSuave } from '@/hooks/usarRolagemSuave'
import { useDemoStore } from '@/store/demoStore'
import { cn } from '@/utils/format'
import './LayoutCliente.css'

const links: Array<{ to: string; chave: ChaveTraducao; icon: typeof Car; end?: boolean }> = [
  { to: '/app', chave: 'nav.cliente.inicio', icon: Home, end: true },
  { to: '/app/viagens', chave: 'nav.cliente.viagens', icon: Car },
  { to: '/app/reservar', chave: 'nav.cliente.reservar', icon: CalendarPlus },
  { to: '/app/notificacoes', chave: 'nav.cliente.alertas', icon: Bell },
  { to: '/app/perfil', chave: 'nav.cliente.perfil', icon: User },
]

export function LayoutCliente() {
  const { usuario, sair } = useAuth()
  const navigate = useNavigate()
  const { t } = usarIdioma()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  usarRolagemSuave(wrapperRef, contentRef)

  const todasNotificacoes = useDemoStore((s) => s.notificacoes)
  const notificacoes = useMemo(
    () => todasNotificacoes.filter((n) => n.usuario_id === usuario?.id && !n.lida),
    [todasNotificacoes, usuario?.id],
  )

  async function handleSair() {
    await sair()
    navigate('/entrar')
  }

  return (
    <div className="layout-cliente">
      <aside className="layout-cliente-aside painel-lateral">
        <div className="layout-cliente-marca">
          <p className="fonte-display layout-cliente-marca-titulo">Jemani</p>
          <p className="layout-cliente-marca-sub">{t('nav.cliente.subtitle')}</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => cn('sidebar-link', isActive && 'ativo')}
            >
              <l.icon size={18} />
              {t(l.chave)}
              {l.to.includes('notificacoes') && notificacoes.length > 0 && (
                <span className="ml-auto rounded-full bg-[var(--color-gold)] px-2 py-0.5 text-xs text-white">
                  {notificacoes.length}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <button
          type="button"
          onClick={handleSair}
          className="sidebar-link mt-4 w-full border-0 bg-transparent text-left"
        >
          <LogOut size={18} />
          {t('comum.sair')}
        </button>
      </aside>

      <div ref={wrapperRef} className="layout-cliente-scroll">
        <div ref={contentRef} className="layout-cliente-conteudo">
          <header className="layout-cliente-topo">
            <div>
              <p className="layout-cliente-topo-ola">{t('comum.ola')}</p>
              <h1 className="fonte-display layout-cliente-topo-nome">{usuario?.nome}</h1>
            </div>
            <button type="button" className="layout-cliente-topo-sair" onClick={handleSair}>
              {t('comum.sair')}
            </button>
          </header>
          <main className="layout-cliente-main">
            <Outlet />
          </main>
        </div>
      </div>

      <nav className="layout-cliente-nav" aria-label="Menu do cliente">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) => cn('layout-cliente-nav-item', isActive && 'ativo')}
          >
            <l.icon size={20} strokeWidth={1.75} />
            {t(l.chave)}
            {l.to.includes('notificacoes') && notificacoes.length > 0 && (
              <span className="layout-cliente-nav-badge">{notificacoes.length}</span>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
