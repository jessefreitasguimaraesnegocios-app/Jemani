import { Link } from 'react-router-dom'
import { SENHA_DEMO } from '@/data/seed'
import { usarIdioma } from '@/i18n/usarIdioma'
import type { IdiomaApp } from '@/i18n/tipos'
import { useDemoStore } from '@/store/demoStore'
import './AdminConfiguracoesPage.css'

const IDIOMAS: Array<{ valor: IdiomaApp; rotulo: string }> = [
  { valor: 'pt-BR', rotulo: 'Português (Brasil)' },
  { valor: 'en', rotulo: 'English' },
  { valor: 'es', rotulo: 'Español' },
]

export function AdminConfiguracoesPage() {
  const resetarDemo = useDemoStore((s) => s.resetarDemo)
  const configuracoes = useDemoStore((s) => s.configuracoes)
  const atualizarConfiguracao = useDemoStore((s) => s.atualizarConfiguracao)
  const { t, idioma, definirIdioma } = usarIdioma()

  function ler(chave: string, padrao = '') {
    return configuracoes.find((c) => c.chave === chave)?.valor ?? padrao
  }

  function ligado(chave: string) {
    return ler(chave, 'true') === 'true'
  }

  function alternar(chave: string) {
    atualizarConfiguracao(chave, ligado(chave) ? 'false' : 'true')
  }

  const temas = [
    { valor: 'claro', rotulo: t('config.temaClaro') },
    { valor: 'escuro', rotulo: t('config.temaEscuro') },
    { valor: 'sistema', rotulo: t('config.temaSistema') },
  ]

  return (
    <div className="animar-entrada space-y-5">
      <div className="config-topo">
        <h1 className="fonte-display text-3xl">{t('config.titulo')}</h1>
        <p className="config-sub">
          {t('config.sub')}{' '}
          <Link to="/admin/comissoes" className="config-link">
            {t('config.linkComissoes')}
          </Link>
          .
        </p>
      </div>

      <section className="cartao config-secao">
        <h2 className="fonte-display text-2xl">{t('config.idiomaAparencia')}</h2>
        <div className="config-grade">
          <div>
            <label className="rotulo" htmlFor="cfg-idioma">
              {t('config.idioma')}
            </label>
            <select
              id="cfg-idioma"
              className="campo"
              value={idioma}
              onChange={(e) => definirIdioma(e.target.value as IdiomaApp)}
            >
              {IDIOMAS.map((op) => (
                <option key={op.valor} value={op.valor}>
                  {op.rotulo}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="rotulo" htmlFor="cfg-tema">
              {t('config.aparencia')}
            </label>
            <select
              id="cfg-tema"
              className="campo"
              value={ler('tema_aparencia', 'claro')}
              onChange={(e) => atualizarConfiguracao('tema_aparencia', e.target.value)}
            >
              {temas.map((op) => (
                <option key={op.valor} value={op.valor}>
                  {op.rotulo}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="config-sub">{t('config.idiomaDica')}</p>
      </section>

      <section className="cartao config-secao">
        <h2 className="fonte-display text-2xl">{t('config.alertas')}</h2>
        <TogglePreferencia
          titulo={t('config.som')}
          descricao={t('config.somDesc')}
          ativo={ligado('som_notificacao')}
          onAlternar={() => alternar('som_notificacao')}
        />
        <TogglePreferencia
          titulo={t('config.vibracao')}
          descricao={t('config.vibracaoDesc')}
          ativo={ligado('vibracao')}
          onAlternar={() => alternar('vibracao')}
        />
        <TogglePreferencia
          titulo={t('config.push')}
          descricao={t('config.pushDesc')}
          ativo={ligado('notificacoes_push')}
          onAlternar={() => alternar('notificacoes_push')}
        />
      </section>

      <section className="cartao config-secao">
        <h2 className="fonte-display text-2xl">{t('config.demo')}</h2>
        <p className="config-sub">{t('config.demoTexto', { senha: SENHA_DEMO })}</p>
        <button
          type="button"
          className="btn-perigo"
          onClick={() => {
            if (confirm(t('config.resetConfirm'))) resetarDemo()
          }}
        >
          {t('config.resetDemo')}
        </button>
      </section>

      <section className="cartao config-tech">
        <p>
          <strong>{t('config.techPagamentos')}</strong>
        </p>
        <p>
          <strong>{t('config.techMapas')}</strong>
        </p>
        <p>
          <strong>{t('config.techSupabase')}</strong>
        </p>
        <p>
          <strong>{t('config.techComissoes')}</strong>{' '}
          <Link to="/admin/comissoes" className="config-link">
            /admin/comissoes
          </Link>
          .
        </p>
      </section>
    </div>
  )
}

function TogglePreferencia({
  titulo,
  descricao,
  ativo,
  onAlternar,
}: {
  titulo: string
  descricao: string
  ativo: boolean
  onAlternar: () => void
}) {
  return (
    <div className="config-toggle">
      <div className="config-toggle-texto">
        <strong>{titulo}</strong>
        <span>{descricao}</span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={ativo}
        aria-label={titulo}
        className={`config-switch ${ativo ? 'config-switch--ligado' : ''}`}
        onClick={onAlternar}
      >
        <span className="config-switch-bola" />
      </button>
    </div>
  )
}
