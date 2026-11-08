import { useAuth } from '@/contexts/AuthContext'
import { usarIdioma } from '@/i18n/usarIdioma'
import './AdminPerfilPage.css'

export function AdminPerfilPage() {
  const { usuario } = useAuth()
  const { t } = usarIdioma()

  return (
    <div className="admin-perfil animar-entrada">
      <h1 className="fonte-display admin-perfil-titulo">{t('menu.perfil')}</h1>
      <p className="admin-perfil-sub">{t('admin.perfil.sub')}</p>
      <section className="cartao admin-perfil-cartao">
        <div>
          <p className="admin-perfil-rotulo">{t('comum.nome')}</p>
          <p className="admin-perfil-valor">{usuario?.nome ?? '—'}</p>
        </div>
        <div>
          <p className="admin-perfil-rotulo">{t('comum.email')}</p>
          <p className="admin-perfil-valor">{usuario?.email ?? '—'}</p>
        </div>
        <div>
          <p className="admin-perfil-rotulo">{t('admin.perfil.papel')}</p>
          <p className="admin-perfil-valor">{t('comum.admin')}</p>
        </div>
      </section>
    </div>
  )
}
