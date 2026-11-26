import { useMemo, useState } from 'react'
import { PlanilhaMensalCorridas } from '@/components/PlanilhaMensalCorridas'
import {
  agruparPorEmpresa,
  agruparPorTipo,
  filtrarLancamentos,
  listarTiposPresentes,
  montarLancamentosFinanceiros,
  montarResumoFinanceiro,
  rotuloProvedor,
  rotuloStatusPagamento,
  type LancamentoFinanceiro,
  type QuinzenaFinanceiro,
  type TipoPagamentoFiltro,
  type VisaoFinanceiro,
} from '@/services/financeiroAdmin'
import { anosDisponiveisPlanilha } from '@/services/planilhaMensalCorridas'
import { usarIdioma } from '@/i18n/usarIdioma'
import type { ChaveTraducao } from '@/i18n/mensagens'
import { useDemoStore } from '@/store/demoStore'
import { formatarData, formatarMoeda } from '@/utils/format'
import './AdminFinanceiroPage.css'

const CHAVES_MES: Record<number, ChaveTraducao> = {
  1: 'planilha.mes.1',
  2: 'planilha.mes.2',
  3: 'planilha.mes.3',
  4: 'planilha.mes.4',
  5: 'planilha.mes.5',
  6: 'planilha.mes.6',
  7: 'planilha.mes.7',
  8: 'planilha.mes.8',
  9: 'planilha.mes.9',
  10: 'planilha.mes.10',
  11: 'planilha.mes.11',
  12: 'planilha.mes.12',
}

type EscopoRapido = 'todas' | 'parceiros' | 'empresa'

export function AdminFinanceiroPage() {
  const { t, locale } = usarIdioma()
  const viagens = useDemoStore((s) => s.viagens)
  const comissoes = useDemoStore((s) => s.comissoes)
  const pagamentos = useDemoStore((s) => s.pagamentos)
  const empresas = useDemoStore((s) => s.empresas)
  const categorias = useDemoStore((s) => s.categorias)
  const perfis = useDemoStore((s) => s.perfis)
  const motoristas = useDemoStore((s) => s.motoristas)

  const [empresaId, setEmpresaId] = useState('')
  const [tipo, setTipo] = useState<TipoPagamentoFiltro>('todos')
  const [categoriaId, setCategoriaId] = useState('')
  const [busca, setBusca] = useState('')
  const [visao, setVisao] = useState<VisaoFinanceiro>('empresas')
  const [ano, setAno] = useState<number | null>(() => new Date().getFullYear())
  const [mes, setMes] = useState<number | null>(() => new Date().getMonth() + 1)
  const [quinzena, setQuinzena] = useState<QuinzenaFinanceiro>('todas')

  const mapaClientes = useMemo(
    () => new Map(perfis.filter((p) => p.tipo === 'cliente').map((p) => [p.id, p])),
    [perfis],
  )
  const mapaMotoristas = useMemo(
    () => new Map(motoristas.map((m) => [m.id, m])),
    [motoristas],
  )
  const mapaCategorias = useMemo(
    () => new Map(categorias.map((c) => [c.id, c])),
    [categorias],
  )

  const todosLancamentos = useMemo(
    () =>
      montarLancamentosFinanceiros(pagamentos, viagens, empresas, categorias, comissoes),
    [pagamentos, viagens, empresas, categorias, comissoes],
  )

  const anosDisponiveis = useMemo(() => {
    const anoAtual = new Date().getFullYear()
    const dosPagamentos = todosLancamentos
      .map((item) => item.viagem?.data_viagem ?? item.pagamento.created_at?.slice(0, 10))
      .filter((data): data is string => Boolean(data))
      .map((data) => Number(data.slice(0, 4)))
      .filter((valor) => Number.isFinite(valor))
    const dosAnosViagem = anosDisponiveisPlanilha(viagens)
    return [...new Set([...dosAnosViagem, ...dosPagamentos, anoAtual])].sort((a, b) => b - a)
  }, [todosLancamentos, viagens])

  const filtrados = useMemo(
    () =>
      filtrarLancamentos(todosLancamentos, {
        empresaId,
        tipo,
        categoriaId,
        busca,
        ano,
        mes,
        quinzena,
      }),
    [todosLancamentos, empresaId, tipo, categoriaId, busca, ano, mes, quinzena],
  )

  const resumo = useMemo(() => montarResumoFinanceiro(filtrados), [filtrados])
  const tiposPresentes = useMemo(
    () => listarTiposPresentes(todosLancamentos),
    [todosLancamentos],
  )
  const gruposEmpresa = useMemo(() => agruparPorEmpresa(filtrados), [filtrados])
  const gruposTipo = useMemo(() => agruparPorTipo(filtrados), [filtrados])

  const empresasComVolume = useMemo(() => {
    const ids = new Set(
      todosLancamentos.map((l) => l.empresa?.id).filter((id): id is string => Boolean(id)),
    )
    return empresas
      .filter((e) => ids.has(e.id))
      .sort((a, b) => a.nome_comercial.localeCompare(b.nome_comercial, 'pt-BR'))
  }, [empresas, todosLancamentos])

  const temSemEmpresa = todosLancamentos.some(
    (l) => !l.empresa && l.viagem?.status !== 'parceiro_externo',
  )
  const qtdParceiros = useMemo(
    () => todosLancamentos.filter((l) => l.viagem?.status === 'parceiro_externo').length,
    [todosLancamentos],
  )
  const focoParceiros = empresaId === 'parceiros_externos'
  const periodoAtivo = Boolean(ano && mes)
  const escopoAtual: EscopoRapido =
    empresaId === 'parceiros_externos'
      ? 'parceiros'
      : empresaId && empresaId !== 'sem_empresa'
        ? 'empresa'
        : 'todas'

  const rotuloPeriodo = useMemo(() => {
    if (!ano || !mes) return t('admin.financeiro.todosPeriodos')
    const base = `${t(CHAVES_MES[mes])} ${ano}`
    if (quinzena === 'q1') return `${base} · ${t('planilha.quinzena1')}`
    if (quinzena === 'q2') return `${base} · ${t('planilha.quinzena2')}`
    return base
  }, [ano, mes, quinzena, t])

  function limparPeriodo() {
    setAno(null)
    setMes(null)
    setQuinzena('todas')
  }

  function ativarMesAtual() {
    const hoje = new Date()
    setAno(hoje.getFullYear())
    setMes(hoje.getMonth() + 1)
    setQuinzena('todas')
  }

  function escolherEscopo(escopo: EscopoRapido) {
    if (escopo === 'todas') setEmpresaId('')
    else if (escopo === 'parceiros') setEmpresaId('parceiros_externos')
  }

  return (
    <div className="animar-entrada fin-pagina">
      <header className="fin-topo">
        <div>
          <h1 className="fonte-display text-3xl">{t('admin.financeiro.titulo')}</h1>
          <p className="fin-sub">{t('admin.financeiro.sub')}</p>
        </div>
        <PlanilhaMensalCorridas
          key={focoParceiros ? 'parceiros' : 'geral'}
          viagens={viagens}
          empresas={empresas}
          mapaClientes={mapaClientes}
          mapaMotoristas={mapaMotoristas}
          mapaCategorias={mapaCategorias}
          focarParceirosExternos={focoParceiros}
          rotuloBotao={
            focoParceiros ? t('admin.financeiro.planilhaParceiros') : t('planilha.botao')
          }
        />
      </header>

      <section className="cartao fin-periodo" aria-label={t('planilha.periodo')}>
        <div className="fin-periodo-linha">
          <div className="fin-periodo-campos">
            <div>
              <label className="rotulo" htmlFor="fin-ano">
                {t('admin.financeiro.periodoAno')}
              </label>
              <select
                id="fin-ano"
                className="campo"
                value={ano ?? ''}
                onChange={(e) => {
                  const valor = e.target.value
                  if (!valor) {
                    limparPeriodo()
                    return
                  }
                  setAno(Number(valor))
                  if (!mes) setMes(new Date().getMonth() + 1)
                }}
              >
                <option value="">{t('admin.financeiro.todosPeriodos')}</option>
                {anosDisponiveis.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="rotulo" htmlFor="fin-mes">
                {t('admin.financeiro.periodoMes')}
              </label>
              <select
                id="fin-mes"
                className="campo"
                value={mes ?? ''}
                disabled={!ano}
                onChange={(e) => {
                  const valor = e.target.value
                  setMes(valor ? Number(valor) : null)
                  if (!valor) setQuinzena('todas')
                }}
              >
                <option value="">{t('admin.financeiro.todosMeses')}</option>
                {Array.from({ length: 12 }, (_, indice) => indice + 1).map((item) => (
                  <option key={item} value={item}>
                    {t(CHAVES_MES[item])}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="fin-quinzenas" role="tablist" aria-label={t('planilha.periodo')}>
            {(
              [
                ['todas', 'planilha.mesInteiro'],
                ['q1', 'planilha.quinzena1'],
                ['q2', 'planilha.quinzena2'],
              ] as const
            ).map(([id, chave]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={quinzena === id}
                className={`fin-seg ${quinzena === id ? 'fin-seg--ativo' : ''}`}
                disabled={!periodoAtivo}
                onClick={() => setQuinzena(id)}
              >
                {t(chave)}
              </button>
            ))}
          </div>

          <div className="fin-periodo-atalhos">
            <button type="button" className="fin-link" onClick={ativarMesAtual}>
              {t('admin.financeiro.mesAtual')}
            </button>
            {periodoAtivo && (
              <button type="button" className="fin-link" onClick={limparPeriodo}>
                {t('admin.financeiro.limparPeriodo')}
              </button>
            )}
          </div>
        </div>
        <p className="fin-periodo-resumo">
          {t('admin.financeiro.vendoPeriodo', { periodo: rotuloPeriodo })}
        </p>
      </section>

      <section className="fin-escopo" aria-label={t('comum.empresa')}>
        <div className="fin-escopo-pills" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={escopoAtual === 'todas' && empresaId !== 'sem_empresa'}
            className={`fin-pill ${!empresaId ? 'fin-pill--ativa' : ''}`}
            onClick={() => escolherEscopo('todas')}
          >
            {t('admin.financeiro.todas')}
            <span className="fin-pill-qtd">{todosLancamentos.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={focoParceiros}
            className={`fin-pill ${focoParceiros ? 'fin-pill--ativa' : ''}`}
            onClick={() => escolherEscopo('parceiros')}
          >
            {t('admin.financeiro.parceirosExternos')}
            <span className="fin-pill-qtd">{qtdParceiros}</span>
          </button>
          {temSemEmpresa && (
            <button
              type="button"
              role="tab"
              aria-selected={empresaId === 'sem_empresa'}
              className={`fin-pill ${empresaId === 'sem_empresa' ? 'fin-pill--ativa' : ''}`}
              onClick={() =>
                setEmpresaId(empresaId === 'sem_empresa' ? '' : 'sem_empresa')
              }
            >
              {t('admin.financeiro.chipSemEmpresa')}
            </button>
          )}
        </div>

        <div className="fin-escopo-empresa">
          <label className="rotulo" htmlFor="fin-empresa">
            {t('admin.financeiro.empresaEspecifica')}
          </label>
          <select
            id="fin-empresa"
            className="campo"
            value={
              empresaId === 'parceiros_externos' || empresaId === 'sem_empresa'
                ? ''
                : empresaId
            }
            onChange={(e) => setEmpresaId(e.target.value)}
          >
            <option value="">{t('admin.financeiro.escolherEmpresa')}</option>
            {empresasComVolume.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome_comercial}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="cartao fin-filtros">
        <div>
          <label className="rotulo" htmlFor="fin-tipo">
            {t('admin.financeiro.tipoStatus')}
          </label>
          <select
            id="fin-tipo"
            className="campo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoPagamentoFiltro)}
          >
            <option value="todos">{t('admin.financeiro.todosTipos')}</option>
            {tiposPresentes.map((status) => (
              <option key={status} value={status}>
                {rotuloStatusPagamento(status)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="rotulo" htmlFor="fin-cat">
            {t('admin.financeiro.categoria')}
          </label>
          <select
            id="fin-cat"
            className="campo"
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
          >
            <option value="">{t('admin.financeiro.todasCategorias')}</option>
            {categorias
              .filter((c) => c.ativo)
              .sort((a, b) => a.ordem - b.ordem)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
          </select>
        </div>
        <div className="fin-filtro-busca">
          <label className="rotulo" htmlFor="fin-busca">
            {t('admin.financeiro.busca')}
          </label>
          <input
            id="fin-busca"
            className="campo"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={t('admin.financeiro.buscaPlaceholder')}
          />
        </div>
      </section>

      <section className="fin-resumo" aria-label={t('admin.financeiro.titulo')}>
        <div className="cartao fin-resumo-item">
          <p className="fin-resumo-rotulo">{t('admin.financeiro.volume')}</p>
          <p className="fonte-display fin-resumo-valor">{formatarMoeda(resumo.volume, locale)}</p>
          <p className="fin-resumo-meta">
            {t('admin.financeiro.lancamentosN', { n: resumo.quantidade })}
          </p>
        </div>
        <div className="cartao fin-resumo-item">
          <p className="fin-resumo-rotulo">{t('admin.financeiro.comissao')}</p>
          <p className="fonte-display fin-resumo-valor">{formatarMoeda(resumo.comissao, locale)}</p>
          <p className="fin-resumo-meta">{t('admin.financeiro.plataforma')}</p>
        </div>
        <div className="cartao fin-resumo-item fin-resumo-item--destaque">
          <p className="fin-resumo-rotulo">
            {focoParceiros
              ? t('admin.financeiro.valorParceiros')
              : t('admin.financeiro.valorEmpresas')}
          </p>
          <p className="fonte-display fin-resumo-valor">
            {formatarMoeda(resumo.valorEmpresa, locale)}
          </p>
          <p className="fin-resumo-meta">{t('admin.financeiro.repasseFiltrado')}</p>
        </div>
        <div className="cartao fin-resumo-item">
          <p className="fin-resumo-rotulo">{t('admin.financeiro.situacao')}</p>
          <p className="fonte-display fin-resumo-valor">{resumo.pagos}</p>
          <p className="fin-resumo-meta">
            {t('admin.financeiro.situacaoMeta', {
              pendentes: resumo.pendentes,
              testes: resumo.testes,
            })}
          </p>
        </div>
      </section>

      <div className="fin-lista-topo">
        <p className="fin-lista-contagem">
          {t('admin.financeiro.resultadoFiltro', { n: filtrados.length })}
        </p>
        <div className="fin-visoes" role="tablist" aria-label={t('admin.financeiro.organizar')}>
          {(
            [
              ['empresas', 'admin.financeiro.porEmpresa'],
              ['tipos', 'admin.financeiro.porTipo'],
              ['lancamentos', 'admin.financeiro.lancamentos'],
            ] as const
          ).map(([id, chave]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={visao === id}
              className={`fin-visao ${visao === id ? 'fin-visao--ativa' : ''}`}
              onClick={() => setVisao(id)}
            >
              {t(chave)}
            </button>
          ))}
        </div>
      </div>

      {filtrados.length === 0 ? (
        <div className="cartao fin-vazio-caixa">
          <p className="fin-vazio">
            {focoParceiros
              ? t('admin.financeiro.vazioParceiros')
              : t('admin.financeiro.vazio')}
          </p>
          <p className="fin-vazio-dica">{t('admin.financeiro.vazioDica')}</p>
        </div>
      ) : visao === 'empresas' ? (
        <div className="fin-grupos">
          {gruposEmpresa.map((grupo) => (
            <section key={grupo.id} className="cartao fin-grupo">
              <div className="fin-grupo-cabeca">
                <div>
                  <h2 className="fonte-display fin-grupo-titulo">{grupo.titulo}</h2>
                  {grupo.subtitulo && <p className="fin-grupo-sub">{grupo.subtitulo}</p>}
                </div>
                <div className="fin-grupo-totais">
                  <span>
                    {t('admin.financeiro.volumeLinha', {
                      valor: formatarMoeda(grupo.volume, locale),
                    })}
                  </span>
                  <span>
                    {t('admin.financeiro.comissaoLinha', {
                      valor: formatarMoeda(grupo.comissao, locale),
                    })}
                  </span>
                  <span>
                    {t('admin.financeiro.empresaLinha', {
                      valor: formatarMoeda(grupo.valorEmpresa, locale),
                    })}
                  </span>
                  <span>{t('admin.financeiro.qtdLinha', { n: grupo.quantidade })}</span>
                </div>
              </div>
              <div className="fin-tabela-envolve">
                <TabelaLancamentos itens={grupo.lancamentos} />
              </div>
            </section>
          ))}
        </div>
      ) : visao === 'tipos' ? (
        <div className="fin-grupos">
          {gruposTipo.map((grupo) => (
            <section key={grupo.id} className="cartao fin-grupo">
              <div className="fin-grupo-cabeca">
                <div>
                  <h2 className="fonte-display fin-grupo-titulo">{grupo.titulo}</h2>
                  <p className="fin-grupo-sub">
                    {t('admin.financeiro.lancamentosTipo', { n: grupo.quantidade })}
                  </p>
                </div>
                <div className="fin-grupo-totais">
                  <span>
                    {t('admin.financeiro.volumeLinha', {
                      valor: formatarMoeda(grupo.volume, locale),
                    })}
                  </span>
                  <span>
                    {t('admin.financeiro.comissaoLinha', {
                      valor: formatarMoeda(grupo.comissao, locale),
                    })}
                  </span>
                </div>
              </div>
              <div className="fin-tabela-envolve">
                <TabelaLancamentos itens={grupo.lancamentos} />
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="cartao fin-tabela-envolve">
          <TabelaLancamentos itens={filtrados} />
        </div>
      )}
    </div>
  )
}

function TabelaLancamentos({ itens }: { itens: LancamentoFinanceiro[] }) {
  const { t, locale } = usarIdioma()

  return (
    <table className="fin-tabela">
      <thead>
        <tr>
          <th>{t('planilha.col.codigo')}</th>
          <th>{t('planilha.col.data')}</th>
          <th>{t('planilha.col.empresa')}</th>
          <th>{t('admin.financeiro.categoria')}</th>
          <th>{t('planilha.col.pagamento')}</th>
          <th>{t('planilha.col.total')}</th>
          <th>{t('planilha.col.plataforma')}</th>
          <th>{t('admin.financeiro.repasseCurto')}</th>
        </tr>
      </thead>
      <tbody>
        {itens.map((item) => {
          const { pagamento, viagem, empresa, categoria } = item
          const classeBadge =
            pagamento.status === 'pago'
              ? 'fin-badge--pago'
              : pagamento.status === 'teste' || pagamento.provider === 'dev_simulado'
                ? 'fin-badge--teste'
                : pagamento.status === 'pendente' || pagamento.status === 'pending_payment'
                  ? 'fin-badge--pendente'
                  : ''
          const nomeEmpresa =
            viagem?.status === 'parceiro_externo'
              ? empresa
                ? `${t('admin.financeiro.parceiroCurto')} · ${empresa.nome_comercial}`
                : t('admin.financeiro.parceirosExternos')
              : (empresa?.nome_comercial ?? t('admin.financeiro.semEmpresa'))

          return (
            <tr key={pagamento.id}>
              <td>
                <div className="fin-item-codigo">
                  {viagem?.codigo ?? pagamento.payment_id ?? pagamento.id}
                </div>
                <div className="fin-item-meta">
                  {rotuloProvedor(pagamento.provider)}
                  {pagamento.payment_method ? ` · ${pagamento.payment_method}` : ''}
                </div>
              </td>
              <td>
                {viagem ? (
                  <>
                    {formatarData(viagem.data_viagem, locale)}
                    <br />
                    <span className="fin-item-meta">{viagem.horario}</span>
                  </>
                ) : (
                  '—'
                )}
              </td>
              <td>{nomeEmpresa}</td>
              <td>{categoria?.nome ?? '—'}</td>
              <td>
                <span className={`fin-badge ${classeBadge}`}>
                  {rotuloStatusPagamento(pagamento.status)}
                </span>
              </td>
              <td className="fin-num">{formatarMoeda(pagamento.amount, locale)}</td>
              <td className="fin-num">{formatarMoeda(pagamento.platform_fee, locale)}</td>
              <td className="fin-num fin-num--repasse">
                {formatarMoeda(pagamento.company_amount, locale)}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
