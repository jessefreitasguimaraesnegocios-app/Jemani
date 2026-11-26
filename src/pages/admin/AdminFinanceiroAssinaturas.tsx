import { useMemo, useState } from 'react'
import {
  competenciaDeData,
  montarLinhasAssinatura,
  resumirAssinaturas,
  rotuloCompetencia,
  type LinhaAssinatura,
} from '@/services/assinaturasEmpresas'
import { usarIdioma } from '@/i18n/usarIdioma'
import type { ChaveTraducao } from '@/i18n/mensagens'
import type { PlanoAcessoEmpresa, StatusMensalidade } from '@/types'
import { useDemoStore } from '@/store/demoStore'
import { formatarMoeda } from '@/utils/format'

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

function rotuloCompetenciaLocal(competencia: string, t: (chave: ChaveTraducao, vars?: Record<string, string | number>) => string) {
  const [ano, mes] = competencia.split('-').map(Number)
  if (!ano || !mes || !CHAVES_MES[mes]) return rotuloCompetencia(competencia)
  return `${t(CHAVES_MES[mes])} ${ano}`
}

export function AdminFinanceiroAssinaturas() {
  const { t, locale } = usarIdioma()
  const empresas = useDemoStore((s) => s.empresas)
  const mensalidades = useDemoStore((s) => s.mensalidades)
  const configuracoes = useDemoStore((s) => s.configuracoes)
  const definirPlanoEmpresa = useDemoStore((s) => s.definirPlanoEmpresa)
  const marcarMensalidade = useDemoStore((s) => s.marcarMensalidade)
  const atualizarConfiguracao = useDemoStore((s) => s.atualizarConfiguracao)

  const [competencia, setCompetencia] = useState(() => competenciaDeData())
  const [filtroPlano, setFiltroPlano] = useState<'todos' | PlanoAcessoEmpresa>('todos')
  const valorPadrao = useMemo(
    () => Number(configuracoes.find((c) => c.chave === 'mensalidade_padrao')?.valor ?? 1500),
    [configuracoes],
  )
  const [rascunhoPadrao, setRascunhoPadrao] = useState(String(valorPadrao))

  const linhas = useMemo(
    () => montarLinhasAssinatura(empresas, mensalidades, competencia, configuracoes),
    [empresas, mensalidades, competencia, configuracoes],
  )
  const filtradas = useMemo(
    () =>
      filtroPlano === 'todos' ? linhas : linhas.filter((linha) => linha.plano === filtroPlano),
    [linhas, filtroPlano],
  )
  const resumo = useMemo(() => resumirAssinaturas(linhas), [linhas])

  const anos = useMemo(() => {
    const atual = new Date().getFullYear()
    return [atual - 1, atual, atual + 1]
  }, [])

  function alterarCompetencia(ano: number, mes: number) {
    setCompetencia(`${ano}-${String(mes).padStart(2, '0')}`)
  }

  function salvarPadrao() {
    const valor = Number(rascunhoPadrao)
    if (!Number.isFinite(valor) || valor < 0) return
    atualizarConfiguracao('mensalidade_padrao', String(valor))
  }

  const [anoSel, mesSel] = competencia.split('-').map(Number)

  return (
    <div className="fin-assinaturas">
      <div className="cartao fin-assinaturas-intro">
        <div>
          <h2 className="fin-assinaturas-titulo">{t('admin.financeiro.assinaturasTitulo')}</h2>
          <p className="fin-assinaturas-texto">{t('admin.financeiro.assinaturasSub')}</p>
        </div>
        <div className="fin-assinaturas-padrao">
          <label className="rotulo" htmlFor="fin-mensalidade-padrao">
            {t('admin.financeiro.mensalidadePadrao')}
          </label>
          <div className="fin-assinaturas-padrao-linha">
            <input
              id="fin-mensalidade-padrao"
              className="campo"
              type="number"
              min={0}
              step={50}
              value={rascunhoPadrao}
              onChange={(e) => setRascunhoPadrao(e.target.value)}
            />
            <button type="button" className="btn-ouro !py-2" onClick={salvarPadrao}>
              {t('comum.salvar')}
            </button>
          </div>
        </div>
      </div>

      <div className="cartao fin-periodo">
        <div className="fin-periodo-linha">
          <div className="fin-periodo-campos">
            <div>
              <label className="rotulo" htmlFor="fin-ass-ano">
                {t('admin.financeiro.periodoAno')}
              </label>
              <select
                id="fin-ass-ano"
                className="campo"
                value={anoSel}
                onChange={(e) => alterarCompetencia(Number(e.target.value), mesSel)}
              >
                {anos.map((ano) => (
                  <option key={ano} value={ano}>
                    {ano}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="rotulo" htmlFor="fin-ass-mes">
                {t('admin.financeiro.periodoMes')}
              </label>
              <select
                id="fin-ass-mes"
                className="campo"
                value={mesSel}
                onChange={(e) => alterarCompetencia(anoSel, Number(e.target.value))}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((mes) => (
                  <option key={mes} value={mes}>
                    {t(CHAVES_MES[mes])}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="fin-periodo-resumo">
            {t('admin.financeiro.vendoPeriodo', {
              periodo: rotuloCompetenciaLocal(competencia, t),
            })}
          </p>
        </div>
      </div>

      <div className="fin-resumo">
        <div className="cartao fin-resumo-item">
          <p className="fin-resumo-rotulo">{t('admin.financeiro.assinantes')}</p>
          <p className="fonte-display fin-resumo-valor">{resumo.assinantes}</p>
          <p className="fin-resumo-meta">
            {t('admin.financeiro.soEmailMeta', { n: resumo.soEmail })}
          </p>
        </div>
        <div className="cartao fin-resumo-item fin-resumo-item--destaque">
          <p className="fin-resumo-rotulo">{t('admin.financeiro.receitaEsperada')}</p>
          <p className="fonte-display fin-resumo-valor">
            {formatarMoeda(resumo.receitaEsperada, locale)}
          </p>
          <p className="fin-resumo-meta">{t('admin.financeiro.doMes')}</p>
        </div>
        <div className="cartao fin-resumo-item">
          <p className="fin-resumo-rotulo">{t('admin.financeiro.receitaPaga')}</p>
          <p className="fonte-display fin-resumo-valor">
            {formatarMoeda(resumo.receitaPaga, locale)}
          </p>
          <p className="fin-resumo-meta">
            {t('admin.financeiro.pagosPendentes', {
              pagos: resumo.pagos,
              pendentes: resumo.pendentes,
            })}
          </p>
        </div>
        <div className="cartao fin-resumo-item">
          <p className="fin-resumo-rotulo">{t('admin.financeiro.atrasados')}</p>
          <p className="fonte-display fin-resumo-valor">{resumo.atrasados}</p>
          <p className="fin-resumo-meta">{t('admin.financeiro.empresasCadastradas', { n: empresas.length })}</p>
        </div>
      </div>

      <div className="fin-escopo-pills" role="tablist">
        {(
          [
            ['todos', 'admin.financeiro.todas'],
            ['assinatura', 'admin.financeiro.planoAssinatura'],
            ['repasse_email', 'admin.financeiro.planoEmail'],
          ] as const
        ).map(([id, chave]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={filtroPlano === id}
            className={`fin-pill ${filtroPlano === id ? 'fin-pill--ativa' : ''}`}
            onClick={() => setFiltroPlano(id)}
          >
            {t(chave)}
          </button>
        ))}
      </div>

      {filtradas.length === 0 ? (
        <div className="cartao fin-vazio-caixa">
          <p className="fin-vazio">
            {empresas.length === 0
              ? t('admin.financeiro.semEmpresasAssinatura')
              : t('admin.financeiro.semEmpresasNoFiltro')}
          </p>
        </div>
      ) : (
        <div className="cartao fin-tabela-envolve">
          <table className="fin-tabela">
            <thead>
              <tr>
                <th>{t('planilha.col.empresa')}</th>
                <th>{t('admin.financeiro.plano')}</th>
                <th>{t('admin.financeiro.mensalidade')}</th>
                <th>{t('admin.financeiro.statusMes')}</th>
                <th>{t('admin.financeiro.acoes')}</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((linha) => (
                <LinhaAssinaturaUi
                  key={linha.empresa.id}
                  linha={linha}
                  onPlano={(plano) => definirPlanoEmpresa(linha.empresa.id, plano)}
                  onStatus={(status) =>
                    marcarMensalidade(linha.empresa.id, competencia, status, linha.valor)
                  }
                  onValor={(valor) =>
                    definirPlanoEmpresa(linha.empresa.id, linha.plano, valor)
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function LinhaAssinaturaUi({
  linha,
  onPlano,
  onStatus,
  onValor,
}: {
  linha: LinhaAssinatura
  onPlano: (plano: PlanoAcessoEmpresa) => void
  onStatus: (status: StatusMensalidade) => void
  onValor: (valor: number) => void
}) {
  const { t, locale } = usarIdioma()
  const [valorEdit, setValorEdit] = useState(String(linha.valor))

  const classeStatus =
    linha.statusMes === 'pago'
      ? 'fin-badge--pago'
      : linha.statusMes === 'atrasado'
        ? 'fin-badge--pendente'
        : linha.statusMes === 'isento' || linha.statusMes === 'nao_cobrado'
          ? 'fin-badge--teste'
          : 'fin-badge--pendente'

  const rotuloStatus =
    linha.statusMes === 'nao_cobrado'
      ? t('admin.financeiro.naoCobrado')
      : t(`admin.financeiro.statusMensalidade.${linha.statusMes}` as ChaveTraducao)

  return (
    <tr>
      <td>
        <div className="fin-item-codigo">{linha.empresa.nome_comercial}</div>
        <div className="fin-item-meta">
          {linha.empresa.cidade}
          {linha.empresa.email ? ` · ${linha.empresa.email}` : ''}
        </div>
      </td>
      <td>
        <select
          className="campo"
          value={linha.plano}
          onChange={(e) => onPlano(e.target.value as PlanoAcessoEmpresa)}
          aria-label={t('admin.financeiro.plano')}
        >
          <option value="assinatura">{t('admin.financeiro.planoAssinatura')}</option>
          <option value="repasse_email">{t('admin.financeiro.planoEmail')}</option>
        </select>
      </td>
      <td>
        {linha.plano === 'repasse_email' ? (
          <span className="fin-item-meta">—</span>
        ) : (
          <div className="fin-assinaturas-valor">
            <input
              className="campo"
              type="number"
              min={0}
              step={50}
              value={valorEdit}
              onChange={(e) => setValorEdit(e.target.value)}
              onBlur={() => {
                const valor = Number(valorEdit)
                if (Number.isFinite(valor) && valor >= 0 && valor !== linha.valor) {
                  onValor(valor)
                } else {
                  setValorEdit(String(linha.valor))
                }
              }}
              aria-label={t('admin.financeiro.mensalidade')}
            />
            <span className="fin-item-meta">{formatarMoeda(linha.valor, locale)}</span>
          </div>
        )}
      </td>
      <td>
        <span className={`fin-badge ${classeStatus}`}>{rotuloStatus}</span>
      </td>
      <td>
        {linha.plano === 'assinatura' ? (
          <div className="fin-assinaturas-acoes">
            <button
              type="button"
              className="btn-ouro !py-1.5"
              onClick={() => onStatus('pago')}
              disabled={linha.statusMes === 'pago'}
            >
              {t('admin.financeiro.marcarPago')}
            </button>
            <button
              type="button"
              className="btn-secundario !py-1.5"
              onClick={() => onStatus('pendente')}
            >
              {t('admin.financeiro.marcarPendente')}
            </button>
            <button
              type="button"
              className="btn-secundario !py-1.5"
              onClick={() => onStatus('atrasado')}
            >
              {t('admin.financeiro.marcarAtrasado')}
            </button>
          </div>
        ) : (
          <span className="fin-item-meta">{t('admin.financeiro.soRecebeEmail')}</span>
        )}
      </td>
    </tr>
  )
}
