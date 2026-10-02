import { useMemo, useState } from 'react'
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
  type TipoPagamentoFiltro,
  type VisaoFinanceiro,
} from '@/services/financeiroAdmin'
import { usarIdioma } from '@/i18n/usarIdioma'
import { useDemoStore } from '@/store/demoStore'
import { formatarData, formatarMoeda } from '@/utils/format'
import './AdminFinanceiroPage.css'

export function AdminFinanceiroPage() {
  const { t, locale } = usarIdioma()
  const viagens = useDemoStore((s) => s.viagens)
  const comissoes = useDemoStore((s) => s.comissoes)
  const pagamentos = useDemoStore((s) => s.pagamentos)
  const empresas = useDemoStore((s) => s.empresas)
  const categorias = useDemoStore((s) => s.categorias)

  const [empresaId, setEmpresaId] = useState('')
  const [tipo, setTipo] = useState<TipoPagamentoFiltro>('todos')
  const [categoriaId, setCategoriaId] = useState('')
  const [busca, setBusca] = useState('')
  const [visao, setVisao] = useState<VisaoFinanceiro>('empresas')

  const todosLancamentos = useMemo(
    () =>
      montarLancamentosFinanceiros(pagamentos, viagens, empresas, categorias, comissoes),
    [pagamentos, viagens, empresas, categorias, comissoes],
  )

  const filtrados = useMemo(
    () =>
      filtrarLancamentos(todosLancamentos, {
        empresaId,
        tipo,
        categoriaId,
        busca,
      }),
    [todosLancamentos, empresaId, tipo, categoriaId, busca],
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

  const temSemEmpresa = todosLancamentos.some((l) => !l.empresa)

  return (
    <div className="animar-entrada space-y-5">
      <div className="fin-topo">
        <div>
          <h1 className="fonte-display text-3xl">{t('admin.financeiro.titulo')}</h1>
          <p className="fin-sub">{t('admin.financeiro.sub')}</p>
        </div>
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
            <option value="">Todas as empresas</option>
            {temSemEmpresa && <option value="sem_empresa">Sem empresa atribuída</option>}
            {empresasComVolume.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome_comercial}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="rotulo" htmlFor="fin-tipo">
            Tipo / status
          </label>
          <select
            id="fin-tipo"
            className="campo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoPagamentoFiltro)}
          >
            <option value="todos">Todos os tipos</option>
            {tiposPresentes.map((status) => (
              <option key={status} value={status}>
                {rotuloStatusPagamento(status)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="rotulo" htmlFor="fin-cat">
            Categoria
          </label>
          <select
            id="fin-cat"
            className="campo"
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
          >
            <option value="">Todas as categorias</option>
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
            Busca
          </label>
          <input
            id="fin-busca"
            className="campo"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Código, empresa, payment id..."
          />
        </div>
      </div>

      <div className="fin-empresa-chips">
        <button
          type="button"
          className={`fin-chip ${!empresaId ? 'fin-chip--ativa' : ''}`}
          onClick={() => setEmpresaId('')}
        >
          Todas
        </button>
        {temSemEmpresa && (
          <button
            type="button"
            className={`fin-chip ${empresaId === 'sem_empresa' ? 'fin-chip--ativa' : ''}`}
            onClick={() => setEmpresaId('sem_empresa')}
          >
            Sem empresa
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

      <div className="fin-resumo">
        <div className="cartao fin-resumo-item">
          <p className="fin-resumo-rotulo">{t('admin.financeiro.volume')}</p>
          <p className="fonte-display fin-resumo-valor">{formatarMoeda(resumo.volume, locale)}</p>
          <p className="fin-resumo-meta">{resumo.quantidade} lançamentos</p>
        </div>
        <div className="cartao fin-resumo-item">
          <p className="fin-resumo-rotulo">{t('admin.financeiro.comissao')}</p>
          <p className="fonte-display fin-resumo-valor">{formatarMoeda(resumo.comissao, locale)}</p>
          <p className="fin-resumo-meta">Plataforma</p>
        </div>
        <div className="cartao fin-resumo-item">
          <p className="fin-resumo-rotulo">{t('admin.financeiro.valorEmpresas')}</p>
          <p className="fonte-display fin-resumo-valor">{formatarMoeda(resumo.valorEmpresa, locale)}</p>
          <p className="fin-resumo-meta">Repasse filtrado</p>
        </div>
        <div className="cartao fin-resumo-item">
          <p className="fin-resumo-rotulo">{t('admin.financeiro.situacao')}</p>
          <p className="fonte-display fin-resumo-valor">{resumo.pagos}</p>
          <p className="fin-resumo-meta">
            pagos · {resumo.pendentes} pendentes · {resumo.testes} teste/DEV
          </p>
        </div>
      </div>

      {filtrados.length === 0 ? (
        <div className="cartao">
          <p className="fin-vazio">Nenhum lançamento com esses filtros.</p>
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
                    Volume <strong>{formatarMoeda(grupo.volume, locale)}</strong>
                  </span>
                  <span>
                    Comissão <strong>{formatarMoeda(grupo.comissao, locale)}</strong>
                  </span>
                  <span>
                    Empresa <strong>{formatarMoeda(grupo.valorEmpresa, locale)}</strong>
                  </span>
                  <span>
                    Qtd <strong>{grupo.quantidade}</strong>
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
      ) : visao === 'tipos' ? (
        <div className="fin-grupos">
          {gruposTipo.map((grupo) => (
            <section key={grupo.id} className="cartao fin-grupo">
              <div className="fin-grupo-cabeca">
                <div>
                  <h2 className="fonte-display fin-grupo-titulo">{grupo.titulo}</h2>
                  <p className="fin-grupo-sub">{grupo.quantidade} lançamentos neste tipo</p>
                </div>
                <div className="fin-grupo-totais">
                  <span>
                    Volume <strong>{formatarMoeda(grupo.volume, locale)}</strong>
                  </span>
                  <span>
                    Comissão <strong>{formatarMoeda(grupo.comissao, locale)}</strong>
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
  const { locale } = usarIdioma()
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
          {empresa?.nome_comercial ?? 'Sem empresa'}
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
          Comissão {formatarMoeda(pagamento.platform_fee, locale)} · Empresa{' '}
          {formatarMoeda(pagamento.company_amount, locale)}
        </p>
      </div>
    </div>
  )
}
