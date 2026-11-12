import { useMemo } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Building2,
  Car,
  Inbox,
  LayoutDashboard,
  LogOut,
  Settings,
  Tags,
  User,
  Users,
  Wallet,
  Percent,
  BadgeDollarSign,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { usarIdioma } from '@/i18n/usarIdioma'
import type { ChaveTraducao } from '@/i18n/mensagens'
import { listarCorridasAguardandoOferta } from '@/services/distribuicaoService'
import { useDemoStore } from '@/store/demoStore'
import { cn } from '@/utils/format'
import './LayoutAdmin.css'

const links: Array<{ to: string; chave: ChaveTraducao; icon: typeof Car; end?: boolean }> = [
  { to: '/admin', chave: 'nav.admin.dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/solicitacoes', chave: 'nav.admin.solicitacoes', icon: Inbox },
  { to: '/admin/viagens', chave: 'nav.admin.viagens', icon: Car },
  { to: '/admin/clientes', chave: 'nav.admin.clientes', icon: Users },
  { to: '/admin/empresas', chave: 'nav.admin.empresas', icon: Building2 },
  { to: '/admin/financeiro', chave: 'nav.admin.financeiro', icon: Wallet },
  { to: '/admin/comissoes', chave: 'nav.admin.comissoes', icon: Percent },
  { to: '/admin/categorias', chave: 'nav.admin.categorias', icon: Tags },
  { to: '/admin/precos', chave: 'nav.admin.precos', icon: BadgeDollarSign },
  { to: '/admin/configuracoes', chave: 'nav.admin.configuracoes', icon: Settings },
  { to: '/admin/perfil', chave: 'nav.admin.perfil', icon: User },
]

export function LayoutAdmin() {
  const { sair } = useAuth()
  const navigate = useNavigate()
  const caminho = useLocation()
  const { t } = usarIdioma()
  const viagens = useDemoStore((s) => s.viagens)
  const quadroAmplo = caminho.pathname.startsWith('/admin/viagens')
  const qtdSolicitacoes = useMemo(
    () => listarCorridasAguardandoOferta(viagens).length,
    [viagens],
  )

  async function handleSair() {
    await sair()
    navigate('/entrar')
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="painel-lateral">
        <div className="p-4 lg:p-6">
          <p className="fonte-display text-3xl">Jemani</p>
          <p className="mt-1 text-sm text-white/55">{t('nav.admin.subtitle')}</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:px-6 lg:pb-6">
          {links.map((l) => {
            const alertaSolicitacoes = l.to === '/admin/solicitacoes' && qtdSolicitacoes > 0
            return (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  cn('sidebar-link layout-admin-link whitespace-nowrap', isActive && 'ativo')
                }
              >
                <span className="layout-admin-link-linha">
                  <l.icon size={18} />
                  {t(l.chave)}
                </span>
                {alertaSolicitacoes && (
                  <i
                    className="layout-admin-alerta"
                    aria-label={t('admin.solicitacoes.alerta', { n: qtdSolicitacoes })}
                  >
                    {qtdSolicitacoes > 9 ? '9+!' : `${qtdSolicitacoes}!`}
                  </i>
                )}
              </NavLink>
            )
          })}
          <button
            type="button"
            className="sidebar-link layout-admin-link layout-admin-sair whitespace-nowrap"
            onClick={() => void handleSair()}
          >
            <span className="layout-admin-link-linha">
              <LogOut size={18} />
              {t('comum.sair')}
            </span>
          </button>
        </nav>
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
