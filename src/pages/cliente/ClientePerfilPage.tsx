import { useRef, useState } from 'react'
import { FotoPerfilCliente } from '@/components/FotoPerfilCliente'
import { useAuth } from '@/contexts/AuthContext'
import { usarIdioma } from '@/i18n/usarIdioma'
import { enviarAvatarCliente, removerAvatarCliente } from '@/services/avatarCliente'
import { useDemoStore } from '@/store/demoStore'
import { dispararFeedbackAlerta } from '@/utils/feedbackAlerta'
import './ClientePerfilPage.css'

export function ClientePerfilPage() {
  const { usuario } = useAuth()
  const { t } = usarIdioma()
  const configuracoes = useDemoStore((s) => s.configuracoes)
  const atualizarConfiguracao = useDemoStore((s) => s.atualizarConfiguracao)
  const atualizarAvatarCliente = useDemoStore((s) => s.atualizarAvatarCliente)
  const inputRef = useRef<HTMLInputElement>(null)
  const [enviando, setEnviando] = useState(false)
  const [erroFoto, setErroFoto] = useState('')
  const [okFoto, setOkFoto] = useState('')

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

  async function aoEscolherFoto(arquivo?: File | null) {
    if (!usuario || !arquivo) return
    setErroFoto('')
    setOkFoto('')
    setEnviando(true)
    try {
      const url = await enviarAvatarCliente(usuario.id, arquivo)
      atualizarAvatarCliente(usuario.id, url)
      setOkFoto(t('cliente.perfil.fotoSalva'))
    } catch (erro) {
      setErroFoto(erro instanceof Error ? erro.message : t('cliente.perfil.fotoErro'))
    } finally {
      setEnviando(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function aoRemoverFoto() {
    if (!usuario?.avatar_url) return
    setErroFoto('')
    setOkFoto('')
    setEnviando(true)
    try {
      await removerAvatarCliente(usuario.id, usuario.avatar_url)
      atualizarAvatarCliente(usuario.id, null)
      setOkFoto(t('cliente.perfil.fotoRemovida'))
    } catch (erro) {
      setErroFoto(erro instanceof Error ? erro.message : t('cliente.perfil.fotoErro'))
    } finally {
      setEnviando(false)
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
        <div className="cliente-foto-bloco">
          <FotoPerfilCliente
            url={usuario?.avatar_url}
            nome={usuario?.nome ?? t('comum.cliente')}
            tamanho="perfil"
          />
          <div className="cliente-foto-acoes">
            <p className="rotulo">{t('cliente.perfil.foto')}</p>
            <p className="cliente-foto-dica">{t('cliente.perfil.fotoDica')}</p>
            <div className="cliente-foto-botoes">
              <button
                type="button"
                className="btn-secundario"
                disabled={enviando}
                onClick={() => inputRef.current?.click()}
              >
                {enviando ? t('cliente.perfil.enviando') : t('cliente.perfil.trocarFoto')}
              </button>
              {usuario?.avatar_url && (
                <button
                  type="button"
                  className="btn-perigo"
                  disabled={enviando}
                  onClick={() => void aoRemoverFoto()}
                >
                  {t('cliente.perfil.removerFoto')}
                </button>
              )}
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="cliente-foto-input"
              onChange={(evento) => void aoEscolherFoto(evento.target.files?.[0])}
            />
            {erroFoto && <p className="cliente-foto-erro">{erroFoto}</p>}
            {okFoto && <p className="cliente-foto-ok">{okFoto}</p>}
          </div>
        </div>
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
