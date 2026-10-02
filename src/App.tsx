import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { SincronizarIdioma } from '@/components/SincronizarIdioma'
import { RotaProtegida } from '@/components/RotaProtegida'
import { LayoutCliente } from '@/layouts/LayoutCliente'
import { LayoutEmpresa } from '@/layouts/LayoutEmpresa'
import { LayoutAdmin } from '@/layouts/LayoutAdmin'
import { LayoutMotorista } from '@/layouts/LayoutMotorista'
import { LandingPage } from '@/pages/LandingPage'
import { EntrarPage } from '@/pages/EntrarPage'
import { CadastrarPage } from '@/pages/CadastrarPage'
import { ClienteInicioPage } from '@/pages/cliente/ClienteInicioPage'
import { ReservarPage } from '@/pages/cliente/ReservarPage'
import { ClienteViagensPage } from '@/pages/cliente/ClienteViagensPage'
import { ClienteViagemDetalhePage } from '@/pages/cliente/ClienteViagemDetalhePage'
import { ClienteNotificacoesPage } from '@/pages/cliente/ClienteNotificacoesPage'
import { ClientePerfilPage } from '@/pages/cliente/ClientePerfilPage'
import { EmpresaDashboardPage } from '@/pages/empresa/EmpresaDashboardPage'
import { EmpresaSolicitacoesPage } from '@/pages/empresa/EmpresaSolicitacoesPage'
import { EmpresaViagensPage } from '@/pages/empresa/EmpresaViagensPage'
import { EmpresaViagemDetalhePage } from '@/pages/empresa/EmpresaViagemDetalhePage'
import { EmpresaMotoristasPage } from '@/pages/empresa/EmpresaMotoristasPage'
import { EmpresaVeiculosPage } from '@/pages/empresa/EmpresaVeiculosPage'
import { EmpresaAgendaPage } from '@/pages/empresa/EmpresaAgendaPage'
import { EmpresaFinanceiroPage } from '@/pages/empresa/EmpresaFinanceiroPage'
import { EmpresaPerfilPage } from '@/pages/empresa/EmpresaPerfilPage'
import { MotoristaDashboardPage } from '@/pages/motorista/MotoristaDashboardPage'
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage'
import { AdminViagensPage } from '@/pages/admin/AdminViagensPage'
import { AdminClientesPage } from '@/pages/admin/AdminClientesPage'
import { AdminClienteHistoricoPage } from '@/pages/admin/AdminClienteHistoricoPage'
import { AdminEmpresasPage } from '@/pages/admin/AdminEmpresasPage'
import { AdminEmpresaHistoricoPage } from '@/pages/admin/AdminEmpresaHistoricoPage'
import { AdminFinanceiroPage } from '@/pages/admin/AdminFinanceiroPage'
import { AdminComissoesPage } from '@/pages/admin/AdminComissoesPage'
import { AdminCategoriasPage } from '@/pages/admin/AdminCategoriasPage'
import { AdminPrecosPage } from '@/pages/admin/AdminPrecosPage'
import { AdminConfiguracoesPage } from '@/pages/admin/AdminConfiguracoesPage'

export default function App() {
  return (
    <AuthProvider>
      <SincronizarIdioma>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/entrar" element={<EntrarPage />} />
          <Route path="/cadastrar" element={<CadastrarPage />} />

          <Route element={<RotaProtegida tipos={['cliente']} />}>
            <Route path="/app" element={<LayoutCliente />}>
              <Route index element={<ClienteInicioPage />} />
              <Route path="reservar" element={<ReservarPage />} />
              <Route path="viagens" element={<ClienteViagensPage />} />
              <Route path="viagens/:id" element={<ClienteViagemDetalhePage />} />
              <Route path="notificacoes" element={<ClienteNotificacoesPage />} />
              <Route path="perfil" element={<ClientePerfilPage />} />
            </Route>
          </Route>

          <Route element={<RotaProtegida tipos={['empresa']} />}>
            <Route path="/empresa" element={<LayoutEmpresa />}>
              <Route index element={<EmpresaDashboardPage />} />
              <Route path="solicitacoes" element={<EmpresaSolicitacoesPage />} />
              <Route path="viagens" element={<EmpresaViagensPage />} />
              <Route path="viagens/:id" element={<EmpresaViagemDetalhePage />} />
              <Route path="motoristas" element={<EmpresaMotoristasPage />} />
              <Route path="veiculos" element={<EmpresaVeiculosPage />} />
              <Route path="agenda" element={<EmpresaAgendaPage />} />
              <Route path="financeiro" element={<EmpresaFinanceiroPage />} />
              <Route path="perfil" element={<EmpresaPerfilPage />} />
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
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </SincronizarIdioma>
    </AuthProvider>
  )
}
