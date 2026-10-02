import { Navigate, Outlet } from 'react-router-dom'
import { useAuth, rotaPorTipo } from '@/contexts/AuthContext'
import type { TipoUsuario } from '@/types'

export function RotaProtegida({ tipos }: { tipos?: TipoUsuario[] }) {
  const { usuario, carregando } = useAuth()

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[var(--color-slate)]">Carregando...</p>
      </div>
    )
  }

  if (!usuario) return <Navigate to="/entrar" replace />

  if (tipos && !tipos.includes(usuario.tipo)) {
    return <Navigate to={rotaPorTipo(usuario.tipo)} replace />
  }

  return <Outlet />
}
