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
    return empresas.filter((e) => ids.has(e.id))
  }, [empresas, todosLancamentos])

  const temSemEmpresa = todosLancamentos.some(
    (l) => !l.empresa && l.viagem?.status !== 'parceiro_externo',
  )
  const focoParceiros = empresaId === 'parceiros_externos'
  const periodoAtivo = Boolean(ano && mes)

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

  return (
    <div className="animar-entrada space-y-5">
      <div className="fin-topo">
        <div>
          <h1 className="fonte-display text-3xl">{t('admin.financeiro.titulo')}</h1>
          <p className="fin-sub">{t('admin.financeiro.sub')}</p>
        </div>
        <div className="fin-topo-acoes">
          <PlanilhaMensalCorridas
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
          <div className="fin-visoes">
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
                className={`fin-visao ${visao === id ? 'fin-visao--ativa' : ''}`}
                onClick={() => setVisao(id)}
              >
                {t(chave)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="cartao fin-filtros">
        <div>
          <label className="rotulo" htmlFor="fin-empresa">
            {t('comum.empresa')}
          </label>
          <select
            id="fin-empresa"
            className="campo"
            value={empresaId}
            onChange={(e) => setEmpresaId(e.target.value)}
          >
            <option value="">{t('admin.financeiro.todasEmpresas')}</option>
            <option value="parceiros_externos">{t('admin.financeiro.parceirosExternos')}</option>
            {temSemEmpresa && (
              <option value="sem_empresa">{t('admin.financeiro.semEmpresa')}</option>
            )}
            {empresasComVolume.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome_comercial}
              </option>
            ))}
          </select>
        </div>
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
        <div>
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

      <div className="fin-periodo-barra">
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
              className={`fin-chip ${quinzena === id ? 'fin-chip--ativa' : ''}`}
              disabled={!periodoAtivo}
              onClick={() => setQuinzena(id)}
            >
              {t(chave)}
            </button>
          ))}
        </div>
        <div className="fin-periodo-acoes">
          <button type="button" className="fin-chip" onClick={ativarMesAtual}>
            {t('admin.financeiro.mesAtual')}
          </button>
          {periodoAtivo && (
            <button type="button" className="fin-chip" onClick={limparPeriodo}>
              {t('admin.financeiro.limparPeriodo')}
            </button>
          )}
        </div>
      </div>

      <div className="fin-empresa-chips">
        <button
          type="button"
          className={`fin-chip ${!empresaId ? 'fin-chip--ativa' : ''}`}
          onClick={() => setEmpresaId('')}
        >
          {t('admin.financeiro.todas')}
        </button>
        <button
          type="button"
          className={`fin-chip ${empresaId === 'parceiros_externos' ? 'fin-chip--ativa' : ''}`}
          onClick={() =>
            setEmpresaId(empresaId === 'parceiros_externos' ? '' : 'parceiros_externos')
          }
        >
          {t('admin.financeiro.parceirosExternos')}
        </button>
        {temSemEmpresa && (
          <button
            type="button"
            className={`fin-chip ${empresaId === 'sem_empresa' ? 'fin-chip--ativa' : ''}`}
            onClick={() => setEmpresaId(empresaId === 'sem_empresa' ? '' : 'sem_empresa')}
          >
            {t('admin.financeiro.chipSemEmpresa')}
          </button>
        )}
        {empresasComVolume.map((e) => (
          <button
            key={e.id}
            type="button"
            className={`fin-chip ${empresaId === e.id ? 'fin-chip--ativa' : ''}`}
            onClick={() => setEmpresaId(empresaId === e.id ? '' : e.id)}
          >
            {e.nome_comercial}
          </button>
        ))}
      </div>

      {focoParceiros && (
        <div className="cartao fin-aviso-parceiros">
          <div>
            <p className="fin-aviso-titulo">{t('admin.financeiro.avisoParceirosTitulo')}</p>
            <p className="fin-aviso-texto">{t('admin.financeiro.avisoParceirosTexto')}</p>
          </div>
          <PlanilhaMensalCorridas
            viagens={viagens}
            empresas={empresas}
            mapaClientes={mapaClientes}
            mapaMotoristas={mapaMotoristas}
            mapaCategorias={mapaCategorias}
            focarParceirosExternos
            rotuloBotao={t('admin.financeiro.abrirPlanilhaParceiros')}
          />
        </div>
      )}

      <div className="fin-resumo">
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
        <div className="cartao fin-resumo-item">
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
      </div>

      {filtrados.length === 0 ? (
        <div className="cartao">
          <p className="fin-vazio">
            {focoParceiros
              ? t('admin.financeiro.vazioParceiros')
              : t('admin.financeiro.vazio')}
          </p>
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
              <div className="fin-lista">
                {grupo.lancamentos.map((item) => (
                  <LinhaLancamento key={item.pagamento.id} item={item} />
                ))}
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
              <div className="fin-lista">
                {grupo.lancamentos.map((item) => (
                  <LinhaLancamento key={item.pagamento.id} item={item} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="fin-lista">
          {filtrados.map((item) => (
            <div key={item.pagamento.id} className="cartao">
              <LinhaLancamento item={item} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function LinhaLancamento({ item }: { item: LancamentoFinanceiro }) {
  const { t, locale } = usarIdioma()
  const { pagamento, viagem, empresa, categoria } = item
  const classeBadge =
    pagamento.status === 'pago'
      ? 'fin-badge--pago'
      : pagamento.status === 'teste' || pagamento.provider === 'dev_simulado'
        ? 'fin-badge--teste'
        : pagamento.status === 'pendente' || pagamento.status === 'pending_payment'
          ? 'fin-badge--pendente'
          : ''

  return (
    <div className="fin-item">
      <div>
        <p className="fin-item-codigo">{viagem?.codigo ?? pagamento.payment_id ?? pagamento.id}</p>
        <p className="fin-item-meta">
          {viagem?.status === 'parceiro_externo'
            ? `${t('admin.financeiro.parceirosExternos')}${
                empresa ? ` · ${empresa.nome_comercial}` : ''
              }`
            : (empresa?.nome_comercial ?? t('admin.financeiro.semEmpresa'))}
          {categoria ? ` · ${categoria.nome}` : ''}
          {viagem ? ` · ${formatarData(viagem.data_viagem, locale)} ${viagem.horario}` : ''}
        </p>
        <p className="fin-item-meta">
          {rotuloProvedor(pagamento.provider)} · {pagamento.payment_method}
          {pagamento.payment_id ? ` · ${pagamento.payment_id}` : ''}
        </p>
        <span className={`fin-badge ${classeBadge}`}>
          {rotuloStatusPagamento(pagamento.status)}
        </span>
      </div>
      <div className="fin-item-valores">
        <strong>{formatarMoeda(pagamento.amount, locale)}</strong>
        <p className="fin-item-fee">
          {t('admin.financeiro.comissao')} {formatarMoeda(pagamento.platform_fee, locale)} ·{' '}
          {t('admin.financeiro.repasseCurto')}{' '}
          {formatarMoeda(pagamento.company_amount, locale)}
        </p>
      </div>
    </div>
  )
}
