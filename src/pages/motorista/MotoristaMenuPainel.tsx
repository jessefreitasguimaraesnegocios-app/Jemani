import { useMemo, useState } from 'react'
import { BadgeStatus } from '@/components/BadgeStatus'
import { FotoPerfilCliente } from '@/components/FotoPerfilCliente'
import { useAuth } from '@/contexts/AuthContext'
import type { ChaveTraducao } from '@/i18n/mensagens'
import type { IdiomaApp } from '@/i18n/tipos'
import { usarIdioma } from '@/i18n/usarIdioma'
import { dispararFeedbackAlerta } from '@/utils/feedbackAlerta'
import {
  filtrarCorridas,
  montarHistoricoMotorista,
  type PeriodoMotorista,
} from '@/services/historicoMotorista'
import { useDemoStore } from '@/store/demoStore'
import type { Motorista } from '@/types'
import { formatarData, formatarDuracao, formatarMoeda } from '@/utils/format'
import './MotoristaMenuPainel.css'

const IDIOMAS: Array<{ valor: IdiomaApp; rotulo: string }> = [
  { valor: 'pt-BR', rotulo: 'Português (Brasil)' },
  { valor: 'en', rotulo: 'English' },
  { valor: 'es', rotulo: 'Español' },
]

const PERIODOS: Array<{ id: PeriodoMotorista; chave: ChaveTraducao }> = [
  { id: 'dia', chave: 'motorista.historico.dia' },
  { id: 'semana', chave: 'motorista.historico.semana' },
  { id: 'mes', chave: 'motorista.historico.mes' },
  { id: 'tudo', chave: 'motorista.historico.tudo' },
]

export function MotoristaMenuPainel({
  aba,
  motorista,
}: {
  aba: 'perfil' | 'historico' | 'configuracao'
  motorista: Motorista
}) {
  if (aba === 'perfil') return <PerfilMotorista motorista={motorista} />
  if (aba === 'historico') return <HistoricoMotorista motorista={motorista} />
  return <ConfiguracaoMotorista />
}

function PerfilMotorista({ motorista }: { motorista: Motorista }) {
  const { usuario } = useAuth()
  const { t } = usarIdioma()
  const empresas = useDemoStore((s) => s.empresas)
  const empresa = empresas.find((item) => item.id === motorista.empresa_id)
  const situacao =
    motorista.status === 'inativo'
      ? t('motorista.perfil.inativo')
      : motorista.status === 'ocupado'
        ? t('comum.ocupado')
        : t('comum.disponivel')

  return (
    <div className="motorista-painel">
      <h1 className="fonte-display">{t('motorista.perfil.titulo')}</h1>
      <section className="motorista-cartao motorista-perfil-foto">
        <FotoPerfilCliente
          url={motorista.foto_url}
          nome={motorista.nome}
          tamanho="perfil"
        />
        <p className="motorista-foto-aviso">{t('motorista.perfil.fotoAviso')}</p>
      </section>
      <section className="motorista-cartao">
        <Linha rotulo={t('comum.nome')} valor={motorista.nome} />
        <Linha rotulo={t('comum.email')} valor={usuario?.email ?? '—'} />
        <Linha rotulo={t('comum.telefone')} valor={motorista.telefone || usuario?.telefone || '—'} />
        <Linha rotulo={t('comum.empresa')} valor={empresa?.nome_comercial ?? '—'} />
        <Linha rotulo={t('motorista.perfil.cnh')} valor={motorista.cnh || '—'} />
        <Linha rotulo={t('motorista.perfil.categoriaCnh')} valor={motorista.categoria_cnh || '—'} />
        <Linha
          rotulo={t('motorista.perfil.experiencia')}
          valor={t('motorista.perfil.anos', { n: motorista.experiencia_anos })}
        />
        <Linha
          rotulo={t('motorista.perfil.avaliacao')}
          valor={motorista.avaliacao_media ? motorista.avaliacao_media.toFixed(1) : '—'}
        />
        <Linha rotulo={t('motorista.perfil.situacao')} valor={situacao} />
      </section>
    </div>
  )
}

function HistoricoMotorista({ motorista }: { motorista: Motorista }) {
  const { t, locale } = usarIdioma()
  const viagens = useDemoStore((s) => s.viagens)
  const historicos = useDemoStore((s) => s.historicos)
  const turnos = useDemoStore((s) => s.turnos)
  const [periodo, setPeriodo] = useState<PeriodoMotorista>('tudo')

  const historico = useMemo(
    () =>
      montarHistoricoMotorista({
        motoristaId: motorista.id,
        empresaId: motorista.empresa_id,
        viagens,
        historicos,
        turnos,
      }),
    [motorista.id, motorista.empresa_id, viagens, historicos, turnos],
  )
  const lista = useMemo(
    () => filtrarCorridas(historico.corridas, periodo),
    [historico.corridas, periodo],
  )
  const kmVisivel = lista.reduce((soma, corrida) => soma + (corrida.km ?? 0), 0)
  const temKm = lista.some((corrida) => corrida.km != null)

  return (
    <div className="motorista-painel">
      <div>
        <h1 className="fonte-display">{t('motorista.historico.titulo')}</h1>
        <p className="motorista-sub">{t('motorista.historico.sub')}</p>
      </div>
      <div className="motorista-periodos">
        {PERIODOS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`motorista-periodo ${periodo === item.id ? 'motorista-periodo--ativo' : ''}`}
            onClick={() => setPeriodo(item.id)}
          >
            {t(item.chave)}
          </button>
        ))}
      </div>
      <p className="motorista-resumo">
        {t(lista.length === 1 ? 'motorista.historico.resumoUm' : 'motorista.historico.resumo', {
          n: lista.length,
          km: temKm ? kmVisivel.toFixed(1) : '—',
        })}
      </p>
      {lista.length === 0 ? (
        <p className="motorista-vazio">{t('motorista.historico.vazio')}</p>
      ) : (
        <div className="motorista-lista">
          {lista.map((corrida) => (
            <article key={corrida.id} className="motorista-cartao motorista-corrida">
              <div className="motorista-corrida-topo">
                <strong>{corrida.codigo}</strong>
                <BadgeStatus status={corrida.status} />
              </div>
              <p>
                {corrida.origem} → {corrida.destino}
              </p>
              <p className="motorista-meta">
                {formatarData(corrida.data, locale)} {corrida.horario}
                {corrida.km != null ? ` · ${corrida.km.toFixed(1)} km` : ''}
                {corrida.duracaoMs != null ? ` · ${formatarDuracao(corrida.duracaoMs)}` : ''}
                {` · ${formatarMoeda(corrida.preco, locale)}`}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

function ConfiguracaoMotorista() {
  const { t, idioma, definirIdioma } = usarIdioma()
  const configuracoes = useDemoStore((s) => s.configuracoes)
  const atualizarConfiguracao = useDemoStore((s) => s.atualizarConfiguracao)

  function ler(chave: string, padrao = '') {
    return configuracoes.find((item) => item.chave === chave)?.valor ?? padrao
  }

  function ligado(chave: string) {
    return ler(chave, 'true') === 'true'
  }

  function alternar(chave: string) {
    const proximo = ligado(chave) ? 'false' : 'true'
    atualizarConfiguracao(chave, proximo)
    if (proximo === 'true' && (chave === 'som_notificacao' || chave === 'vibracao')) {
      dispararFeedbackAlerta(
        configuracoes.map((item) => (item.chave === chave ? { ...item, valor: 'true' } : item)),
        chave === 'vibracao' ? 'status' : 'mensagem',
      )
    }
  }

  const temas = [
    { valor: 'claro', rotulo: t('config.temaClaro') },
    { valor: 'escuro', rotulo: t('config.temaEscuro') },
    { valor: 'sistema', rotulo: t('config.temaSistema') },
  ]

  return (
    <div className="motorista-painel">
      <div>
        <h1 className="fonte-display">{t('motorista.configuracao.titulo')}</h1>
        <p className="motorista-sub">{t('motorista.configuracao.sub')}</p>
      </div>
      <section className="motorista-cartao motorista-form">
        <label className="rotulo" htmlFor="motorista-idioma">
          {t('config.idioma')}
        </label>
        <select
          id="motorista-idioma"
          className="campo"
          value={idioma}
          onChange={(evento) => definirIdioma(evento.target.value as IdiomaApp)}
        >
          {IDIOMAS.map((opcao) => (
            <option key={opcao.valor} value={opcao.valor}>
              {opcao.rotulo}
            </option>
          ))}
        </select>
        <label className="rotulo" htmlFor="motorista-tema">
          {t('config.aparencia')}
        </label>
        <select
          id="motorista-tema"
          className="campo"
          value={ler('tema_aparencia', 'claro')}
          onChange={(evento) => atualizarConfiguracao('tema_aparencia', evento.target.value)}
        >
          {temas.map((opcao) => (
            <option key={opcao.valor} value={opcao.valor}>
              {opcao.rotulo}
            </option>
          ))}
        </select>
      </section>
      <section className="motorista-cartao">
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
        <Interruptor
          titulo={t('config.push')}
          descricao={t('config.pushDesc')}
          ativo={ligado('notificacoes_push')}
          aoAlternar={() => alternar('notificacoes_push')}
        />
      </section>
    </div>
  )
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <p className="motorista-linha">
      <span>{rotulo}</span>
      <strong>{valor}</strong>
    </p>
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
    <div className="motorista-interruptor">
      <div>
        <strong>{titulo}</strong>
        <p>{descricao}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={ativo}
        aria-label={titulo}
        className={`motorista-switch ${ativo ? 'motorista-switch--ligado' : ''}`}
        onClick={aoAlternar}
      >
        <span />
      </button>
    </div>
  )
}
