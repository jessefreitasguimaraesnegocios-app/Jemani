import { useAuth } from '@/contexts/AuthContext'
import { usarIdioma } from '@/i18n/usarIdioma'
import { useDemoStore } from '@/store/demoStore'
import { dispararFeedbackAlerta } from '@/utils/feedbackAlerta'
import './ClientePerfilPage.css'

export function ClientePerfilPage() {
  const { usuario } = useAuth()
  const { t } = usarIdioma()
  const configuracoes = useDemoStore((s) => s.configuracoes)
  const atualizarConfiguracao = useDemoStore((s) => s.atualizarConfiguracao)

  function ligado(chave: string) {
    return (configuracoes.find((item) => item.chave === chave)?.valor ?? 'true') === 'true'
  }

  function alternar(chave: 'som_notificacao' | 'vibracao') {
    const proximo = ligado(chave) ? 'false' : 'true'
    atualizarConfiguracao(chave, proximo)
    if (proximo === 'true') {
      dispararFeedbackAlerta(
        configuracoes.map((item) => (item.chave === chave ? { ...item, valor: 'true' } : item)),
        chave === 'vibracao' ? 'status' : 'mensagem',
      )
    }
  }

  return (
    <div className="animar-entrada space-y-4">
      <h1 className="fonte-display text-3xl">{t('cliente.perfil.titulo')}</h1>
      <div className="cartao cliente-alertas">
        <Interruptor
          titulo={t('config.som')}
          descricao={t('config.somDesc')}
          ativo={ligado('som_notificacao')}
          aoAlternar={() => alternar('som_notificacao')}
        />
        <Interruptor
          titulo={t('config.vibracao')}
          descricao={t('config.vibracaoDesc')}
          ativo={ligado('vibracao')}
          aoAlternar={() => alternar('vibracao')}
        />
      </div>
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

function Interruptor({
  titulo,
  descricao,
  ativo,
  aoAlternar,
}: {
  titulo: string
  descricao: string
  ativo: boolean
  aoAlternar: () => void
}) {
  return (
    <div className="cliente-interruptor">
      <div>
        <strong>{titulo}</strong>
        <p>{descricao}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={ativo}
        aria-label={titulo}
        className={`cliente-switch ${ativo ? 'cliente-switch-ligado' : ''}`}
        onClick={aoAlternar}
      >
        <span />
      </button>
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
