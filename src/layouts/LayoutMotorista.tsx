import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import './LayoutMotorista.css'

export function LayoutMotorista() {
  const { sair } = useAuth()
  const navigate = useNavigate()

  async function handleSair() {
    await sair()
    navigate('/entrar')
  }

  return (
    <div className="layout-motorista">
      <header className="layout-motorista-topo">
        <p>Jemani</p>
        <button type="button" onClick={handleSair}>
          Sair
        </button>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
