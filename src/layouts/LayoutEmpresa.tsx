import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Building2,
  CalendarDays,
  Car,
  LayoutDashboard,
  LogOut,
  Users,
  Wallet,
  Inbox,
  User,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { usarIdioma } from '@/i18n/usarIdioma'
import type { ChaveTraducao } from '@/i18n/mensagens'
import { useDemoStore } from '@/store/demoStore'
import { cn } from '@/utils/format'

const links: Array<{ to: string; chave: ChaveTraducao; icon: typeof Car; end?: boolean }> = [
  { to: '/empresa', chave: 'nav.empresa.dashboard', icon: LayoutDashboard, end: true },
  { to: '/empresa/solicitacoes', chave: 'nav.empresa.solicitacoes', icon: Inbox },
  { to: '/empresa/viagens', chave: 'nav.empresa.historico', icon: Car },
  { to: '/empresa/motoristas', chave: 'nav.empresa.motoristas', icon: Users },
  { to: '/empresa/veiculos', chave: 'nav.empresa.veiculos', icon: Building2 },
  { to: '/empresa/agenda', chave: 'nav.empresa.agenda', icon: CalendarDays },
  { to: '/empresa/financeiro', chave: 'nav.empresa.financeiro', icon: Wallet },
  { to: '/empresa/perfil', chave: 'nav.empresa.perfil', icon: User },
]

export function LayoutEmpresa() {
  const { usuario, sair } = useAuth()
  const navigate = useNavigate()
  const { t } = usarIdioma()
  const empresa = useDemoStore((s) => s.obterEmpresaDoUsuario(usuario?.id ?? ''))

  async function handleSair() {
    await sair()
    navigate('/entrar')
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="painel-lateral lg:flex lg:flex-col lg:p-6">
        <div className="hidden lg:block">
          <p className="fonte-display text-3xl">Jemani</p>
          <p className="mt-1 text-sm text-white/55">
            {empresa?.nome_comercial ?? t('nav.empresa.fallback')}
          </p>
        </div>
        <div className="flex items-center justify-between p-4 lg:hidden">
          <div>
            <p className="fonte-display text-2xl">Jemani</p>
            <p className="text-xs text-white/55">{empresa?.nome_comercial}</p>
          </div>
          <button type="button" className="btn-secundario !py-2 !text-sm" onClick={handleSair}>
            {t('comum.sair')}
          </button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:mt-8 lg:flex-1 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                cn('sidebar-link whitespace-nowrap', isActive && 'ativo')
              }
            >
              <l.icon size={18} />
              {t(l.chave)}
            </NavLink>
          ))}
        </nav>
        <button
          type="button"
          onClick={handleSair}
          className="sidebar-link mt-4 hidden w-full border-0 bg-transparent text-left lg:flex"
        >
          <LogOut size={18} />
          {t('comum.sair')}
        </button>
      </aside>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  )
}
