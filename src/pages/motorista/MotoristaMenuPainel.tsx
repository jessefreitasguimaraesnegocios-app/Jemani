import { useMemo, useState } from 'react'
import { BadgeStatus } from '@/components/BadgeStatus'
import { FotoPerfilCliente } from '@/components/FotoPerfilCliente'
import { PlanilhaMensalCorridas } from '@/components/PlanilhaMensalCorridas'
import { useAuth } from '@/contexts/AuthContext'
import type { ChaveTraducao } from '@/i18n/mensagens'
import type { IdiomaApp } from '@/i18n/tipos'
import { usarIdioma } from '@/i18n/usarIdioma'
import { dispararFeedbackAlerta } from '@/utils/feedbackAlerta'
import {
  dataEstaNoPeriodo,
  filtrarCorridas,
  montarHistoricoMotorista,
  type PeriodoMotorista,
} from '@/services/historicoMotorista'
import { useDemoStore } from '@/store/demoStore'
import type { Motorista } from '@/types'
import { formatarData, formatarDuracao, formatarMoeda } from '@/utils/format'
import './MotoristaMenuPainel.css'

function textoKm(km: number | null, locale: string) {
  if (km == null) return '—'
  const numero = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
    minimumFractionDigits: Number.isInteger(km) ? 0 : 1,
  }).format(km)
  return `${numero} km`
}

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

const LIMITE_CORRIDAS_HISTORICO = 5

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
  const veiculos = useDemoStore((s) => s.veiculos)
  const empresas = useDemoStore((s) => s.empresas)
  const perfis = useDemoStore((s) => s.perfis)
  const categorias = useDemoStore((s) => s.categorias)
  const agendamentos = useDemoStore((s) => s.agendamentosVeiculo)
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
  const listaVisivel = useMemo(
    () => lista.slice(0, LIMITE_CORRIDAS_HISTORICO),
    [lista],
  )
  const temMaisCorridas = lista.length > LIMITE_CORRIDAS_HISTORICO
  const resumo = historico.resumos[periodo]
  const agendamentosPeriodo = useMemo(
    () =>
      (agendamentos ?? [])
        .filter(
          (item) =>
            item.motorista_id === motorista.id &&
            item.empresa_id === motorista.empresa_id &&
            dataEstaNoPeriodo(item.data, periodo),
        )
        .sort((a, b) => `${b.data}T${b.horario}`.localeCompare(`${a.data}T${a.horario}`)),
    [agendamentos, motorista.id, motorista.empresa_id, periodo],
  )
  const viagensDoMotorista = useMemo(
    () => viagens.filter((item) => item.motorista_id === motorista.id),
    [viagens, motorista.id],
  )
  const mapaVeiculos = useMemo(() => new Map(veiculos.map((item) => [item.id, item])), [veiculos])
  const mapaClientes = useMemo(() => new Map(perfis.map((item) => [item.id, item])), [perfis])
  const mapaCategorias = useMemo(
    () => new Map(categorias.map((item) => [item.id, item])),
    [categorias],
  )
  const mapaMotoristas = useMemo(
    () => new Map([[motorista.id, motorista]]),
    [motorista],
  )

  return (
    <div className="motorista-painel">
      <div className="motorista-historico-topo">
        <div>
          <h1 className="fonte-display">{t('motorista.historico.titulo')}</h1>
          <p className="motorista-sub">{t('motorista.historico.sub')}</p>
        </div>
        <PlanilhaMensalCorridas
          viagens={viagensDoMotorista}
          empresas={empresas}
          mapaClientes={mapaClientes}
          mapaMotoristas={mapaMotoristas}
          mapaCategorias={mapaCategorias}
          empresaFixaId={motorista.empresa_id}
        />
      </div>

      <div className="motorista-periodos motorista-periodos--grade">
        {PERIODOS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`motorista-periodo motorista-periodo--card ${periodo === item.id ? 'motorista-periodo--ativo' : ''}`}
            onClick={() => setPeriodo(item.id)}
          >
            <span>{t(item.chave)}</span>
            <strong>{historico.resumos[item.id].corridas}</strong>
          </button>
        ))}
      </div>

      <div className="motorista-metricas">
        <div className="motorista-metrica">
          <span>{t('empresa.motoristas.horasCorrida')}</span>
          <strong>{formatarDuracao(resumo.horasCorridaMs)}</strong>
        </div>
        <div className="motorista-metrica">
          <span>{t('empresa.motoristas.km')}</span>
          <strong>{textoKm(resumo.km, locale)}</strong>
        </div>
        <div className="motorista-metrica">
          <span>{t('empresa.motoristas.horasInativo')}</span>
          <strong>{formatarDuracao(resumo.horasInativasMs)}</strong>
        </div>
        <div className="motorista-metrica">
          <span>{t('empresa.motoristas.horasTurno')}</span>
          <strong>{formatarDuracao(resumo.horasTurnoMs)}</strong>
        </div>
        <div className="motorista-metrica">
          <span>{t('empresa.veiculos.mecanica')}</span>
          <strong>
            {agendamentosPeriodo.filter((item) => item.tipo === 'mecanica').length}
          </strong>
        </div>
        <div className="motorista-metrica">
          <span>{t('empresa.veiculos.lavaJato')}</span>
          <strong>
            {agendamentosPeriodo.filter((item) => item.tipo === 'lava_jato').length}
          </strong>
        </div>
      </div>

      <section className="motorista-cartao motorista-bloco-lista">
        <p className="motorista-bloco-titulo">{t('empresa.motoristas.corridas')}</p>
        {listaVisivel.length === 0 ? (
          <p className="motorista-vazio">{t('motorista.historico.vazio')}</p>
        ) : (
          <div className="motorista-lista">
            {listaVisivel.map((corrida) => {
              const veiculo = corrida.veiculoId ? mapaVeiculos.get(corrida.veiculoId) : undefined
              const detalhes = [
                `${formatarData(corrida.data, locale)} · ${corrida.horario}`,
                textoKm(corrida.km, locale),
                formatarDuracao(corrida.duracaoMs),
                formatarMoeda(corrida.preco, locale),
                t(
                  corrida.passageiros === 1
                    ? 'empresa.motoristas.passageiro'
                    : 'empresa.motoristas.passageiros',
                  { n: corrida.passageiros },
                ),
                veiculo ? `${veiculo.marca} ${veiculo.modelo}` : '',
                corrida.nomePassageiro ?? '',
                corrida.numeroVoo
                  ? t('empresa.motoristas.voo', { codigo: corrida.numeroVoo })
                  : '',
              ].filter(Boolean)
              return (
                <article key={corrida.id} className="motorista-corrida">
                  <div className="motorista-corrida-topo">
                    <strong>{corrida.codigo}</strong>
                    <BadgeStatus status={corrida.status} />
                  </div>
                  <p className="motorista-corrida-rota">
                    {corrida.origem} → {corrida.destino}
                  </p>
                  <p className="motorista-meta">{detalhes.join(' · ')}</p>
                </article>
              )
            })}
          </div>
        )}
        {temMaisCorridas && (
          <p className="motorista-historico-mais">{t('motorista.historico.maisPlanilha')}</p>
        )}
      </section>

      <section className="motorista-cartao motorista-bloco-lista">
        <p className="motorista-bloco-titulo">{t('empresa.motoristas.agendamentos')}</p>
        {agendamentosPeriodo.length === 0 ? (
          <p className="motorista-vazio">{t('empresa.motoristas.semAgendamento')}</p>
        ) : (
          <div className="motorista-lista">
            {agendamentosPeriodo.map((item) => {
              const veiculo = mapaVeiculos.get(item.veiculo_id)
              return (
                <article key={item.id} className="motorista-corrida">
                  <div className="motorista-corrida-topo">
                    <strong>
                      {item.tipo === 'mecanica'
                        ? t('empresa.veiculos.mecanica')
                        : t('empresa.veiculos.lavaJato')}
                    </strong>
                  </div>
                  <p className="motorista-meta">
                    {[
                      `${formatarData(item.data, locale)} · ${item.horario.slice(0, 5)}`,
                      veiculo ? `${veiculo.marca} ${veiculo.modelo}` : '',
                      item.observacao ?? '',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </article>
              )
            })}
          </div>
        )}
      </section>
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
