import { lazy, Suspense, type ComponentType } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { AvisoAtualizacaoApp } from '@/components/AvisoAtualizacaoApp'
import { FiltrosVidroSvg } from '@/components/FiltrosVidroSvg'
import { SincronizarIdioma } from '@/components/SincronizarIdioma'
import { PrepararAlertas } from '@/components/PrepararAlertas'
import { PrepararPushNativo } from '@/components/PrepararPushNativo'
import { VigilanciaAlertas } from '@/components/VigilanciaAlertas'
import { VigilanciaHourly } from '@/components/VigilanciaHourly'
import { SincronizarNuvem } from '@/components/SincronizarNuvem'
import { RotaProtegida } from '@/components/RotaProtegida'

function carregarRota<TModulo, TNome extends keyof TModulo & string>(
  importar: () => Promise<TModulo>,
  nome: TNome,
) {
  return lazy(async () => {
    const modulo = await importar()
    const componente = modulo[nome]
    return { default: componente as ComponentType }
  })
}

const LayoutCliente = carregarRota(() => import('@/layouts/LayoutCliente'), 'LayoutCliente')
const LayoutEmpresa = carregarRota(() => import('@/layouts/LayoutEmpresa'), 'LayoutEmpresa')
const LayoutAdmin = carregarRota(() => import('@/layouts/LayoutAdmin'), 'LayoutAdmin')
const LayoutMotorista = carregarRota(() => import('@/layouts/LayoutMotorista'), 'LayoutMotorista')

const LandingPage = carregarRota(() => import('@/pages/LandingPage'), 'LandingPage')
const EntrarPage = carregarRota(() => import('@/pages/EntrarPage'), 'EntrarPage')
const CadastrarPage = carregarRota(() => import('@/pages/CadastrarPage'), 'CadastrarPage')
const ConviteOfertaPage = carregarRota(() => import('@/pages/ConviteOfertaPage'), 'ConviteOfertaPage')

const ClienteInicioPage = carregarRota(
  () => import('@/pages/cliente/ClienteInicioPage'),
  'ClienteInicioPage',
)
const ReservarPage = carregarRota(() => import('@/pages/cliente/ReservarPage'), 'ReservarPage')
const ClienteViagensPage = carregarRota(
  () => import('@/pages/cliente/ClienteViagensPage'),
  'ClienteViagensPage',
)
const ClienteHistoricoViagensPage = carregarRota(
  () => import('@/pages/cliente/ClienteHistoricoViagensPage'),
  'ClienteHistoricoViagensPage',
)
const ClienteViagemDetalhePage = carregarRota(
  () => import('@/pages/cliente/ClienteViagemDetalhePage'),
  'ClienteViagemDetalhePage',
)
const ClienteNotificacoesPage = carregarRota(
  () => import('@/pages/cliente/ClienteNotificacoesPage'),
  'ClienteNotificacoesPage',
)
const ClientePerfilPage = carregarRota(
  () => import('@/pages/cliente/ClientePerfilPage'),
  'ClientePerfilPage',
)

const EmpresaDashboardPage = carregarRota(
  () => import('@/pages/empresa/EmpresaDashboardPage'),
  'EmpresaDashboardPage',
)
const EmpresaSolicitacoesPage = carregarRota(
  () => import('@/pages/empresa/EmpresaSolicitacoesPage'),
  'EmpresaSolicitacoesPage',
)
const EmpresaViagensPage = carregarRota(
  () => import('@/pages/empresa/EmpresaViagensPage'),
  'EmpresaViagensPage',
)
const EmpresaViagemDetalhePage = carregarRota(
  () => import('@/pages/empresa/EmpresaViagemDetalhePage'),
  'EmpresaViagemDetalhePage',
)
const EmpresaMotoristasPage = carregarRota(
  () => import('@/pages/empresa/EmpresaMotoristasPage'),
  'EmpresaMotoristasPage',
)
const EmpresaVeiculosPage = carregarRota(
  () => import('@/pages/empresa/EmpresaVeiculosPage'),
  'EmpresaVeiculosPage',
)
const EmpresaAgendaPage = carregarRota(
  () => import('@/pages/empresa/EmpresaAgendaPage'),
  'EmpresaAgendaPage',
)
const EmpresaFinanceiroPage = carregarRota(
  () => import('@/pages/empresa/EmpresaFinanceiroPage'),
  'EmpresaFinanceiroPage',
)
const EmpresaConfiguracaoPage = carregarRota(
  () => import('@/pages/empresa/EmpresaConfiguracaoPage'),
  'EmpresaConfiguracaoPage',
)
const EmpresaPerfilPage = carregarRota(
  () => import('@/pages/empresa/EmpresaPerfilPage'),
  'EmpresaPerfilPage',
)

const MotoristaDashboardPage = carregarRota(
  () => import('@/pages/motorista/MotoristaDashboardPage'),
  'MotoristaDashboardPage',
)

const AdminDashboardPage = carregarRota(
  () => import('@/pages/admin/AdminDashboardPage'),
  'AdminDashboardPage',
)
const AdminViagensPage = carregarRota(
  () => import('@/pages/admin/AdminViagensPage'),
  'AdminViagensPage',
)
const AdminClientesPage = carregarRota(
  () => import('@/pages/admin/AdminClientesPage'),
  'AdminClientesPage',
)
const AdminClienteHistoricoPage = carregarRota(
  () => import('@/pages/admin/AdminClienteHistoricoPage'),
  'AdminClienteHistoricoPage',
)
const AdminEmpresasPage = carregarRota(
  () => import('@/pages/admin/AdminEmpresasPage'),
  'AdminEmpresasPage',
)
const AdminSolicitacoesPage = carregarRota(
  () => import('@/pages/admin/AdminSolicitacoesPage'),
  'AdminSolicitacoesPage',
)
const AdminEmpresaHistoricoPage = carregarRota(
  () => import('@/pages/admin/AdminEmpresaHistoricoPage'),
  'AdminEmpresaHistoricoPage',
)
const AdminFinanceiroPage = carregarRota(
  () => import('@/pages/admin/AdminFinanceiroPage'),
  'AdminFinanceiroPage',
)
const AdminComissoesPage = carregarRota(
  () => import('@/pages/admin/AdminComissoesPage'),
  'AdminComissoesPage',
)
const AdminCategoriasPage = carregarRota(
  () => import('@/pages/admin/AdminCategoriasPage'),
  'AdminCategoriasPage',
)
const AdminPrecosPage = carregarRota(
  () => import('@/pages/admin/AdminPrecosPage'),
  'AdminPrecosPage',
)
const AdminConfiguracoesPage = carregarRota(
  () => import('@/pages/admin/AdminConfiguracoesPage'),
  'AdminConfiguracoesPage',
)
const AdminPerfilPage = carregarRota(
  () => import('@/pages/admin/AdminPerfilPage'),
  'AdminPerfilPage',
)

function FallbackRota() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-[var(--color-slate)]">Carregando...</p>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <SincronizarIdioma>
        <>
          <FiltrosVidroSvg />
          <PrepararAlertas />
          <SincronizarNuvem />
          <VigilanciaHourly />
          <VigilanciaAlertas />
          <AvisoAtualizacaoApp />
          <BrowserRouter>
            <PrepararPushNativo />
            <Suspense fallback={<FallbackRota />}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/entrar" element={<EntrarPage />} />
                <Route path="/cadastrar" element={<CadastrarPage />} />
                <Route path="/convite/:token" element={<ConviteOfertaPage />} />

                <Route element={<RotaProtegida tipos={['cliente']} />}>
                  <Route path="/app" element={<LayoutCliente />}>
                    <Route index element={<ClienteInicioPage />} />
                    <Route path="reservar" element={<ReservarPage />} />
                    <Route path="viagens" element={<ClienteViagensPage />} />
                    <Route path="historico" element={<ClienteHistoricoViagensPage />} />
                    <Route
                      path="viagens/historico"
                      element={<Navigate to="/app/historico" replace />}
                    />
                    <Route path="viagens/:id" element={<ClienteViagemDetalhePage />} />
                    <Route path="notificacoes" element={<ClienteNotificacoesPage />} />
                    <Route path="perfil" element={<ClientePerfilPage />} />
                  </Route>
                </Route>

                <Route element={<RotaProtegida tipos={['empresa']} />}>
                  <Route path="/empresa" element={<LayoutEmpresa />}>
                    <Route index element={<EmpresaDashboardPage />} />
                    <Route path="solicitacoes" element={<EmpresaSolicitacoesPage />} />
                    <Route path="ao-vivo" element={null} />
                    <Route path="viagens" element={<EmpresaViagensPage />} />
                    <Route path="viagens/:id" element={<EmpresaViagemDetalhePage />} />
                    <Route path="motoristas" element={<EmpresaMotoristasPage />} />
                    <Route path="veiculos" element={<EmpresaVeiculosPage />} />
                    <Route path="agenda" element={<EmpresaAgendaPage />} />
                    <Route path="financeiro" element={<EmpresaFinanceiroPage />} />
                    <Route path="perfil" element={<EmpresaPerfilPage />} />
                    <Route path="configuracao" element={<EmpresaConfiguracaoPage />} />
                  </Route>
                </Route>

                <Route element={<RotaProtegida tipos={['motorista']} />}>
                  <Route path="/motorista" element={<LayoutMotorista />}>
                    <Route index element={<MotoristaDashboardPage />} />
                  </Route>
                </Route>

                <Route element={<RotaProtegida tipos={['admin']} />}>
                  <Route path="/admin" element={<LayoutAdmin />}>
                    <Route index element={<AdminDashboardPage />} />
                    <Route path="solicitacoes" element={<AdminSolicitacoesPage />} />
                    <Route path="viagens" element={<AdminViagensPage />} />
                    <Route path="clientes" element={<AdminClientesPage />} />
                    <Route path="clientes/:id" element={<AdminClienteHistoricoPage />} />
                    <Route path="empresas" element={<AdminEmpresasPage />} />
                    <Route path="empresas/:id" element={<AdminEmpresaHistoricoPage />} />
                    <Route path="financeiro" element={<AdminFinanceiroPage />} />
                    <Route path="comissoes" element={<AdminComissoesPage />} />
                    <Route path="categorias" element={<AdminCategoriasPage />} />
                    <Route path="precos" element={<AdminPrecosPage />} />
                    <Route path="configuracoes" element={<AdminConfiguracoesPage />} />
                    <Route path="perfil" element={<AdminPerfilPage />} />
                  </Route>
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </>
      </SincronizarIdioma>
    </AuthProvider>
  )
}
