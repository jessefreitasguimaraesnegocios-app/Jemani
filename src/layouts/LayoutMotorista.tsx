import { Outlet, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { usarIdioma } from '@/i18n/usarIdioma'

export function LayoutMotorista() {
  const { usuario, sair } = useAuth()
  const navigate = useNavigate()
  const { t } = usarIdioma()

  async function handleSair() {
    await sair()
    navigate('/entrar')
  }

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-2xl items-center justify-between px-4 py-5">
        <div>
          <p className="fonte-display text-3xl">Jemani</p>
          <p className="text-sm text-[var(--color-slate)]">{t('nav.motorista.subtitle')}</p>
        </div>
        <button type="button" className="btn-secundario !py-2" onClick={handleSair}>
          <LogOut size={16} />
          {t('comum.sair')}
        </button>
      </header>
      <main className="mx-auto max-w-2xl px-4 pb-10">
        <p className="mb-4 text-[var(--color-slate)]">
          {t('comum.olaNome', { nome: usuario?.nome ?? '' })}
        </p>
        <Outlet />
      </main>
    </div>
  )
}
