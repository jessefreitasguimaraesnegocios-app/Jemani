import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Building2,
  Car,
  LayoutDashboard,
  LogOut,
  Settings,
  Tags,
  Users,
  Wallet,
  Percent,
  BadgeDollarSign,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { usarIdioma } from '@/i18n/usarIdioma'
import type { ChaveTraducao } from '@/i18n/mensagens'
import { cn } from '@/utils/format'

const links: Array<{ to: string; chave: ChaveTraducao; icon: typeof Car; end?: boolean }> = [
  { to: '/admin', chave: 'nav.admin.dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/viagens', chave: 'nav.admin.viagens', icon: Car },
  { to: '/admin/clientes', chave: 'nav.admin.clientes', icon: Users },
  { to: '/admin/empresas', chave: 'nav.admin.empresas', icon: Building2 },
  { to: '/admin/financeiro', chave: 'nav.admin.financeiro', icon: Wallet },
  { to: '/admin/comissoes', chave: 'nav.admin.comissoes', icon: Percent },
  { to: '/admin/categorias', chave: 'nav.admin.categorias', icon: Tags },
  { to: '/admin/precos', chave: 'nav.admin.precos', icon: BadgeDollarSign },
  { to: '/admin/configuracoes', chave: 'nav.admin.configuracoes', icon: Settings },
]

export function LayoutAdmin() {
  const { sair } = useAuth()
  const navigate = useNavigate()
  const caminho = useLocation()
  const { t } = usarIdioma()
  const quadroAmplo = caminho.pathname.startsWith('/admin/viagens')

  async function handleSair() {
    await sair()
    navigate('/entrar')
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="painel-lateral">
        <div className="flex items-center justify-between p-4 lg:block lg:p-6">
          <div>
            <p className="fonte-display text-3xl">Jemani</p>
            <p className="mt-1 text-sm text-white/55">{t('nav.admin.subtitle')}</p>
          </div>
          <button type="button" className="btn-secundario !py-2 lg:hidden" onClick={handleSair}>
            {t('comum.sair')}
          </button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:px-6">
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
          className="sidebar-link mx-6 mb-6 hidden border-0 bg-transparent lg:flex"
        >
          <LogOut size={18} />
          {t('comum.sair')}
        </button>
      </aside>
      <main
        className={cn(
          'mx-auto w-full px-4 py-6 lg:px-8',
          quadroAmplo ? 'max-w-[92rem]' : 'max-w-6xl',
        )}
      >
        <Outlet />
      </main>
    </div>
  )
}
