import { useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BadgeStatus } from '@/components/BadgeStatus'
import { PainelDetalheViagem } from '@/components/PainelDetalheViagem'
import {
  agruparCorridasPorColuna,
  agruparDistribuicoesPorViagem,
  agruparHistoricosPorViagem,
  acharColunaDoStatus,
  COLUNAS_QUADRO,
  contarCorridasPorStatus,
  corridaCorrespondeBusca,
} from '@/services/quadroViagens'
import { usarIdioma } from '@/i18n/usarIdioma'
import type { ChaveTraducao } from '@/i18n/mensagens'
import { useDemoStore } from '@/store/demoStore'
import type { StatusViagem, Viagem } from '@/types'
import { formatarData } from '@/utils/format'
import './AdminViagensPage.css'

export function AdminViagensPage() {
  const { t, locale } = usarIdioma()
  const [params, setParams] = useSearchParams()
  const [busca, setBusca] = useState(params.get('busca') ?? '')
  const [statusFiltro, setStatusFiltro] = useState<StatusViagem | ''>(
    (params.get('status') as StatusViagem | null) ?? '',
  )

  const todasViagens = useDemoStore((s) => s.viagens)
  const empresas = useDemoStore((s) => s.empresas)
  const perfis = useDemoStore((s) => s.perfis)
  const motoristas = useDemoStore((s) => s.motoristas)
  const veiculos = useDemoStore((s) => s.veiculos)
  const categorias = useDemoStore((s) => s.categorias)
  const historicos = useDemoStore((s) => s.historicos)
  const distribuicoes = useDemoStore((s) => s.distribuicoes)

  const mapaEmpresas = useMemo(() => new Map(empresas.map((e) => [e.id, e])), [empresas])
  const mapaClientes = useMemo(() => new Map(perfis.map((p) => [p.id, p])), [perfis])
  const mapaMotoristas = useMemo(() => new Map(motoristas.map((m) => [m.id, m])), [motoristas])
  const mapaVeiculos = useMemo(() => new Map(veiculos.map((v) => [v.id, v])), [veiculos])
  const mapaCategorias = useMemo(() => new Map(categorias.map((c) => [c.id, c])), [categorias])
  const historicosPorViagem = useMemo(() => agruparHistoricosPorViagem(historicos), [historicos])
  const distribuicoesPorViagem = useMemo(
    () => agruparDistribuicoesPorViagem(distribuicoes),
    [distribuicoes],
  )

  const filtradas = useMemo(() => {
    return todasViagens.filter((viagem) => {
      if (statusFiltro && viagem.status !== statusFiltro) return false
      const cliente = mapaClientes.get(viagem.cliente_id)
      const empresa = viagem.empresa_id ? mapaEmpresas.get(viagem.empresa_id) : undefined
      return corridaCorrespondeBusca(
        viagem,
        busca,
        cliente?.nome,
        cliente?.email,
        empresa?.nome_comercial,
      )
    })
  }, [todasViagens, busca, statusFiltro, mapaClientes, mapaEmpresas])

  const porColuna = useMemo(() => agruparCorridasPorColuna(filtradas), [filtradas])
  const contagemStatus = useMemo(() => contarCorridasPorStatus(todasViagens), [todasViagens])
  const colunasVisiveis = useMemo(() => {
    if (!statusFiltro) return COLUNAS_QUADRO
    const coluna = acharColunaDoStatus(statusFiltro)
    return coluna ? [coluna] : COLUNAS_QUADRO
  }, [statusFiltro])

  const selecionadaId = params.get('corrida')
  const selecionada = useMemo(
    () => todasViagens.find((v) => v.id === selecionadaId),
    [todasViagens, selecionadaId],
  )

  function gravarParams(corrida?: string, termo = busca, status = statusFiltro) {
    const proximo = new URLSearchParams()
    if (termo.trim()) proximo.set('busca', termo.trim())
    if (status) proximo.set('status', status)
    if (corrida) proximo.set('corrida', corrida)
    setParams(proximo, { replace: true })
  }

  function abrirCorrida(id: string) {
    gravarParams(id)
  }

  function fecharPainel() {
    gravarParams(undefined)
  }

  function confirmarBusca(evento: FormEvent) {
    evento.preventDefault()
    if (filtradas.length === 1) abrirCorrida(filtradas[0].id)
    else gravarParams(selecionadaId ?? undefined)
  }

  function alternarStatus(status: StatusViagem | '') {
    const proximo = statusFiltro === status ? '' : status
    setStatusFiltro(proximo)
    gravarParams(selecionadaId ?? undefined, busca, proximo)
  }

  return (
    <div className="animar-entrada space-y-5">
      <div className="quadro-topo">
        <div>
          <h1 className="fonte-display text-3xl">{t('admin.viagens.titulo')}</h1>
          <p className="quadro-sub">
            {t('admin.viagens.sub', {
              filtradas: filtradas.length,
              total: todasViagens.length,
            })}
          </p>
        </div>
        <form className="quadro-busca" onSubmit={confirmarBusca}>
          <input
            className="campo"
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value)
              gravarParams(selecionadaId ?? undefined, e.target.value)
            }}
            placeholder={t('admin.viagens.busca')}
            aria-label={t('comum.buscar')}
          />
          <button type="submit" className="btn-ouro !py-2">
            {t('comum.abrir')}
          </button>
        </form>
      </div>

      <div className="quadro-pills">
        <button
          type="button"
          className={`quadro-pill ${!statusFiltro ? 'quadro-pill--ativa' : ''}`}
          onClick={() => alternarStatus('')}
        >
          {t('comum.todas')}
          <span className="quadro-pill-qtd">{todasViagens.length}</span>
        </button>
        {contagemStatus.map((item) => (
          <button
            key={item.status}
            type="button"
            className={`quadro-pill ${statusFiltro === item.status ? 'quadro-pill--ativa' : ''}`}
            onClick={() => alternarStatus(item.status)}
          >
            {t(`status.${item.status}` as ChaveTraducao)}
            <span className="quadro-pill-qtd">{item.quantidade}</span>
          </button>
        ))}
      </div>

      <div className="quadro-colunas">
        {colunasVisiveis.map((coluna) => {
          const lista = porColuna.get(coluna.id) ?? []
          return (
            <section
              key={coluna.id}
              className={`quadro-coluna ${colunasVisiveis.length === 1 ? 'quadro-coluna--unica' : ''}`}
            >
              <div className="quadro-coluna-cabeca">
                <h2 className="quadro-coluna-titulo">{t(coluna.chaveTitulo)}</h2>
                <span className="quadro-coluna-qtd">{lista.length}</span>
              </div>
              <div className="quadro-coluna-lista">
                {lista.length === 0 && <p className="quadro-vazio">{t('admin.viagens.vazio')}</p>}
                {lista.map((viagem) => (
                  <CartaoQuadro
                    key={viagem.id}
                    viagem={viagem}
                    nomeCliente={mapaClientes.get(viagem.cliente_id)?.nome}
                    ativo={viagem.id === selecionadaId}
                    onAbrir={() => abrirCorrida(viagem.id)}
                    locale={locale}
                  />
                ))}
              </div>
            </section>
          )
        })}
      </div>

      {selecionada && (
        <PainelDetalheViagem
          viagem={selecionada}
          cliente={mapaClientes.get(selecionada.cliente_id)}
          empresa={selecionada.empresa_id ? mapaEmpresas.get(selecionada.empresa_id) : undefined}
          motorista={
            selecionada.motorista_id ? mapaMotoristas.get(selecionada.motorista_id) : undefined
          }
          veiculo={selecionada.veiculo_id ? mapaVeiculos.get(selecionada.veiculo_id) : undefined}
          categoria={mapaCategorias.get(selecionada.categoria_id)}
          historicos={historicosPorViagem.get(selecionada.id) ?? []}
          distribuicoes={distribuicoesPorViagem.get(selecionada.id) ?? []}
          mapaEmpresas={mapaEmpresas}
          onFechar={fecharPainel}
        />
      )}
    </div>
  )
}

function CartaoQuadro({
  viagem,
  nomeCliente,
  ativo,
  onAbrir,
  locale,
}: {
  viagem: Viagem
  nomeCliente?: string
  ativo: boolean
  onAbrir: () => void
  locale: string
}) {
  return (
    <button
      type="button"
      className={`quadro-card ${ativo ? 'quadro-card--ativo' : ''}`}
      onClick={onAbrir}
    >
      <p className="quadro-card-codigo">{viagem.codigo}</p>
      <p className="quadro-card-rota">
        {viagem.origem} → {viagem.destino}
      </p>
      <p className="quadro-card-meta">
        {formatarData(viagem.data_viagem, locale)} · {viagem.horario}
        {nomeCliente ? ` · ${nomeCliente}` : ''}
      </p>
      <div className="mt-2">
        <BadgeStatus status={viagem.status} />
      </div>
    </button>
  )
}
