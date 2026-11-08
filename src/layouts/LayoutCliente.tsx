import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Bell, CalendarCheck, CalendarPlus, History, Home, User } from 'lucide-react'
import { MenuContaTopo } from '@/components/MenuContaTopo'
import { useAuth } from '@/contexts/AuthContext'
import { usarIdioma } from '@/i18n/usarIdioma'
import type { ChaveTraducao } from '@/i18n/mensagens'
import { usarAvisoDoSistema } from '@/hooks/usarAvisoDoSistema'
import { usarRolagemSuave } from '@/hooks/usarRolagemSuave'
import { useDemoStore } from '@/store/demoStore'
import { cn } from '@/utils/format'
import './LayoutCliente.css'

const links: Array<{ to: string; chave: ChaveTraducao; icon: typeof Home; end?: boolean }> = [
  { to: '/app', chave: 'nav.cliente.inicio', icon: Home, end: true },
  { to: '/app/viagens', chave: 'nav.cliente.viagens', icon: CalendarCheck, end: true },
  { to: '/app/historico', chave: 'nav.cliente.historico', icon: History },
  { to: '/app/reservar', chave: 'nav.cliente.reservar', icon: CalendarPlus },
  { to: '/app/notificacoes', chave: 'nav.cliente.alertas', icon: Bell },
  { to: '/app/perfil', chave: 'nav.cliente.perfil', icon: User },
]

export function LayoutCliente() {
  const { usuario, sair } = useAuth()
  usarAvisoDoSistema(usuario?.id)
  const navigate = useNavigate()
  const { t } = usarIdioma()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [topoRolado, setTopoRolado] = useState(false)
  usarRolagemSuave(wrapperRef, contentRef)

  const todasNotificacoes = useDemoStore((s) => s.notificacoes)
  const notificacoes = useMemo(
    () => todasNotificacoes.filter((n) => n.usuario_id === usuario?.id && !n.lida),
    [todasNotificacoes, usuario?.id],
  )

  useEffect(() => {
    const painel = wrapperRef.current
    if (!painel) return
    function aoRolar() {
      setTopoRolado((painel?.scrollTop ?? 0) > 8)
    }
    aoRolar()
    painel.addEventListener('scroll', aoRolar, { passive: true })
    return () => painel.removeEventListener('scroll', aoRolar)
  }, [])

  async function handleSair() {
    await sair()
    navigate('/entrar')
  }

  return (
    <div className="layout-cliente">
      <aside className="layout-cliente-aside painel-lateral">
        <div className="layout-cliente-marca layout-cliente-marca-linha">
          <div>
            <p className="fonte-display layout-cliente-marca-titulo">Jemani</p>
            <p className="layout-cliente-marca-sub">{t('nav.cliente.subtitle')}</p>
          </div>
          <MenuContaTopo variante="completo" tom="escuro" aoSair={handleSair} />
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
      </aside>

      <div ref={wrapperRef} className="layout-cliente-scroll">
        <div ref={contentRef} className="layout-cliente-conteudo">
          <header
            className={cn('layout-cliente-topo', topoRolado && 'layout-cliente-topo--rolado')}
          >
            <div>
              <p className="layout-cliente-topo-ola">{t('comum.ola')}</p>
              <h1 className="fonte-display layout-cliente-topo-nome">{usuario?.nome}</h1>
            </div>
            <MenuContaTopo
              variante="completo"
              className="layout-cliente-topo-menu"
              aoSair={handleSair}
            />
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
