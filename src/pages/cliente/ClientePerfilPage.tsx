import { useAuth } from '@/contexts/AuthContext'
import { usarIdioma } from '@/i18n/usarIdioma'

export function ClientePerfilPage() {
  const { usuario } = useAuth()
  const { t } = usarIdioma()

  return (
    <div className="animar-entrada space-y-4">
      <h1 className="fonte-display text-3xl">{t('cliente.perfil.titulo')}</h1>
      <div className="cartao space-y-3">
        <Campo label={t('comum.nome')} valor={usuario?.nome ?? ''} />
        <Campo label={t('comum.email')} valor={usuario?.email ?? ''} />
        <Campo label={t('comum.telefone')} valor={usuario?.telefone ?? '—'} />
        <Campo label={t('comum.cliente')} valor={usuario?.tipo ?? ''} />
      </div>
      <div className="cartao">
        <h2 className="fonte-display text-2xl">Ajuda</h2>
        <p className="mt-2 text-sm text-[var(--color-slate)]">
          Em caso de dúvidas sobre sua reserva, acompanhe o status na viagem ou fale com o suporte
          pelo e-mail suporte@jemani.app.
        </p>
      </div>
    </div>
  )
}

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="rotulo">{label}</p>
      <p className="font-medium">{valor}</p>
    </div>
  )
}
