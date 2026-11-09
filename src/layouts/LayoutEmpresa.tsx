import { useMemo } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Building2,
  CalendarDays,
  Car,
  LayoutDashboard,
  MapPinned,
  Users,
  Wallet,
  Inbox,
  User,
} from 'lucide-react'
import { MenuContaTopo } from '@/components/MenuContaTopo'
import { useAuth } from '@/contexts/AuthContext'
import { usarAvisoDoSistema } from '@/hooks/usarAvisoDoSistema'
import { usarIdioma } from '@/i18n/usarIdioma'
import type { ChaveTraducao } from '@/i18n/mensagens'
import { useDemoStore } from '@/store/demoStore'
import { cn } from '@/utils/format'
import './LayoutEmpresa.css'

const links: Array<{ to: string; chave: ChaveTraducao; icon: typeof Car; end?: boolean }> = [
  { to: '/empresa', chave: 'nav.empresa.dashboard', icon: LayoutDashboard, end: true },
  { to: '/empresa/solicitacoes', chave: 'nav.empresa.solicitacoes', icon: Inbox },
  { to: '/empresa/ao-vivo', chave: 'nav.empresa.viagens', icon: MapPinned },
  { to: '/empresa/viagens', chave: 'nav.empresa.historico', icon: Car },
  { to: '/empresa/motoristas', chave: 'nav.empresa.motoristas', icon: Users },
  { to: '/empresa/veiculos', chave: 'nav.empresa.veiculos', icon: Building2 },
  { to: '/empresa/agenda', chave: 'nav.empresa.agenda', icon: CalendarDays },
  { to: '/empresa/financeiro', chave: 'nav.empresa.financeiro', icon: Wallet },
  { to: '/empresa/perfil', chave: 'nav.empresa.perfil', icon: User },
]

function contarSolicitacoesEmpresa(
  empresaId: string,
  atribuicoes: ReturnType<typeof useDemoStore.getState>['atribuicoes'],
  viagens: ReturnType<typeof useDemoStore.getState>['viagens'],
) {
  const vistas = new Set<string>()
  let total = 0
  for (const a of atribuicoes) {
    if (a.empresa_id !== empresaId || a.status !== 'oferecida') continue
    if (vistas.has(a.viagem_id)) continue
    const viagem = viagens.find((v) => v.id === a.viagem_id)
    if (!viagem || !['aguardando_empresa', 'oferta_enviada', 'paid'].includes(viagem.status)) {
      continue
    }
    vistas.add(a.viagem_id)
    total += 1
  }
  return total
}

export function LayoutEmpresa() {
  const { usuario, sair } = useAuth()
  usarAvisoDoSistema(usuario?.id)
  const navigate = useNavigate()
  const caminho = useLocation()
  const { t } = usarIdioma()
  const empresa = useDemoStore((s) => s.obterEmpresaDoUsuario(usuario?.id ?? ''))
  const atribuicoes = useDemoStore((s) => s.atribuicoes)
  const viagens = useDemoStore((s) => s.viagens)
  const aoVivo = caminho.pathname.startsWith('/empresa/ao-vivo')
  const qtdSolicitacoes = useMemo(
    () => (empresa ? contarSolicitacoesEmpresa(empresa.id, atribuicoes, viagens) : 0),
    [empresa, atribuicoes, viagens],
  )

  async function handleSair() {
    await sair()
    navigate('/entrar')
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="painel-lateral lg:flex lg:flex-col lg:p-6">
        <div className="hidden lg:flex lg:items-start lg:justify-between lg:gap-3">
          <div>
            <p className="fonte-display text-3xl">Jemani</p>
            <p className="mt-1 text-sm text-white/55">
              {empresa?.nome_comercial ?? t('nav.empresa.fallback')}
            </p>
          </div>
          <MenuContaTopo variante="completo" tom="escuro" aoSair={handleSair} />
        </div>
        <div className="flex items-center justify-between gap-3 p-4 lg:hidden">
          <div>
            <p className="fonte-display text-2xl">Jemani</p>
            <p className="text-xs text-white/55">{empresa?.nome_comercial}</p>
          </div>
          <MenuContaTopo variante="completo" tom="escuro" aoSair={handleSair} />
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:mt-8 lg:flex-1 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
          {links.map((l) => {
            const alertaSolicitacoes = l.to === '/empresa/solicitacoes' && qtdSolicitacoes > 0
            return (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  cn(
                    'sidebar-link layout-empresa-link whitespace-nowrap',
                    isActive && 'ativo',
                  )
                }
              >
                <span className="layout-empresa-link-linha">
                  <l.icon size={18} />
                  {t(l.chave)}
                </span>
                {alertaSolicitacoes && (
                  <i
                    className="layout-empresa-alerta"
                    aria-label={t('empresa.solicitacoes.alerta', { n: qtdSolicitacoes })}
                  >
                    {qtdSolicitacoes > 9 ? '9+!' : `${qtdSolicitacoes}!`}
                  </i>
                )}
              </NavLink>
            )
          })}
        </nav>
      </aside>
      <main
        className={cn(
          'mx-auto w-full px-4 lg:px-8',
          aoVivo
            ? 'flex max-w-[92rem] flex-col py-3 lg:h-dvh lg:overflow-hidden'
            : 'max-w-6xl py-6',
        )}
      >
        <Outlet />
      </main>
    </div>
  )
}
