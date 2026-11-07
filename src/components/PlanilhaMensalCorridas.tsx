import { useEffect, useMemo, useState } from 'react'
import { BadgeStatus } from '@/components/BadgeStatus'
import { usarIdioma } from '@/i18n/usarIdioma'
import type { ChaveTraducao } from '@/i18n/mensagens'
import {
  anosDisponiveisPlanilha,
  contarEmpresasDoMes,
  contarMesesDoAno,
  filtrarViagensDoMes,
  somarPlanilha,
  type MesPlanilha,
} from '@/services/planilhaMensalCorridas'
import type { CategoriaVeiculo, Empresa, Motorista, Perfil, Viagem } from '@/types'
import { formatarData, formatarMoeda } from '@/utils/format'
import './PlanilhaMensalCorridas.css'

type EtapaPlanilha = 'mes' | 'empresa' | 'planilha'

interface Props {
  viagens: Viagem[]
  empresas: Empresa[]
  mapaClientes: Map<string, Perfil>
  mapaMotoristas: Map<string, Motorista>
  mapaCategorias: Map<string, CategoriaVeiculo>
  /** Quando definido, pula a escolha de empresa (visão da própria empresa). */
  empresaFixaId?: string
  rotuloBotao?: string
}

const CHAVES_MES: Record<MesPlanilha, ChaveTraducao> = {
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

function escaparCsv(valor: string) {
  if (/[",\n;]/.test(valor)) return `"${valor.replace(/"/g, '""')}"`
  return valor
}

export function PlanilhaMensalCorridas({
  viagens,
  empresas,
  mapaClientes,
  mapaMotoristas,
  mapaCategorias,
  empresaFixaId,
  rotuloBotao,
}: Props) {
  const { t, locale } = usarIdioma()
  const [aberta, setAberta] = useState(false)
  const [etapa, setEtapa] = useState<EtapaPlanilha>('mes')
  const [ano, setAno] = useState<number>(() => new Date().getFullYear())
  const [mes, setMes] = useState<MesPlanilha | null>(null)
  const [empresaId, setEmpresaId] = useState<string | undefined>(empresaFixaId)

  const anos = useMemo(() => anosDisponiveisPlanilha(viagens), [viagens])
  const viagensBase = useMemo(
    () => (empresaFixaId ? viagens.filter((item) => item.empresa_id === empresaFixaId) : viagens),
    [viagens, empresaFixaId],
  )
  const contagemMeses = useMemo(() => contarMesesDoAno(viagensBase, ano), [viagensBase, ano])
  const contagemEmpresas = useMemo(
    () => (mes ? contarEmpresasDoMes(viagensBase, ano, mes, empresas) : []),
    [viagensBase, ano, mes, empresas],
  )
  const linhas = useMemo(() => {
    if (!mes) return []
    return filtrarViagensDoMes(viagensBase, ano, mes, empresaId)
  }, [viagensBase, ano, mes, empresaId])
  const resumo = useMemo(() => somarPlanilha(linhas), [linhas])
  const nomeEmpresa =
    empresaId
      ? empresas.find((item) => item.id === empresaId)?.nome_comercial ?? t('comum.empresa')
      : t('planilha.todasEmpresas')

  useEffect(() => {
    if (!aberta) return
    const anosUteis = anosDisponiveisPlanilha(viagensBase)
    if (anosUteis.length && !anosUteis.includes(ano)) setAno(anosUteis[0])
  }, [aberta, anos, ano, viagensBase])

  useEffect(() => {
    if (!aberta) return
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function aoTecla(evento: KeyboardEvent) {
      if (evento.key === 'Escape') fechar()
    }
    window.addEventListener('keydown', aoTecla)
    return () => {
      document.body.style.overflow = anterior
      window.removeEventListener('keydown', aoTecla)
    }
  }, [aberta])

  function abrir() {
    setAberta(true)
    setEtapa('mes')
    setMes(null)
    setEmpresaId(empresaFixaId)
  }

  function fechar() {
    setAberta(false)
  }

  function escolherMes(proximo: MesPlanilha) {
    setMes(proximo)
    if (empresaFixaId) {
      setEmpresaId(empresaFixaId)
      setEtapa('planilha')
      return
    }
    setEmpresaId(undefined)
    setEtapa('empresa')
  }

  function escolherEmpresa(id: string) {
    setEmpresaId(id)
    setEtapa('planilha')
  }

  function voltar() {
    if (etapa === 'planilha') {
      if (empresaFixaId) {
        setEtapa('mes')
        setMes(null)
        return
      }
      setEtapa('empresa')
      setEmpresaId(undefined)
      return
    }
    if (etapa === 'empresa') {
      setEtapa('mes')
      setMes(null)
    }
  }

  function exportarCsv() {
    if (!mes) return
    const cabecalho = [
      t('planilha.col.codigo'),
      t('planilha.col.data'),
      t('planilha.col.horario'),
      t('planilha.col.status'),
      t('planilha.col.pagamento'),
      t('planilha.col.cliente'),
      t('planilha.col.passageiro'),
      t('planilha.col.empresa'),
      t('planilha.col.motorista'),
      t('planilha.col.categoria'),
      t('planilha.col.origem'),
      t('planilha.col.destino'),
      t('planilha.col.passageiros'),
      t('planilha.col.modalidade'),
      t('planilha.col.total'),
      t('planilha.col.plataforma'),
      t('planilha.col.empresaValor'),
      t('planilha.col.comissao'),
    ]
    const corpo = linhas.map((viagem) => {
      const cliente = mapaClientes.get(viagem.cliente_id)
      const empresa = viagem.empresa_id
        ? empresas.find((item) => item.id === viagem.empresa_id)
        : undefined
      const motorista = viagem.motorista_id ? mapaMotoristas.get(viagem.motorista_id) : undefined
      const categoria = mapaCategorias.get(viagem.categoria_id)
      return [
        viagem.codigo,
        viagem.data_viagem,
        viagem.horario,
        t(`status.${viagem.status}` as ChaveTraducao),
        viagem.payment_status,
        cliente?.nome ?? '',
        viagem.nome_passageiro ?? '',
        empresa?.nome_comercial ?? '',
        motorista?.nome ?? '',
        categoria?.nome ?? '',
        viagem.origem,
        viagem.destino,
        String(viagem.passageiros),
        viagem.modalidade === 'hourly' ? t('planilha.hourly') : t('planilha.oneWay'),
        String(viagem.preco_total),
        String(viagem.valor_plataforma),
        String(viagem.valor_empresa),
        String(viagem.comissao_percentual),
      ]
        .map((celula) => escaparCsv(celula))
        .join(';')
    })
    const csv = `\uFEFF${cabecalho.join(';')}\n${corpo.join('\n')}`
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const mesNome = t(CHAVES_MES[mes]).toLowerCase().replace(/\s+/g, '-')
    const empresaSlug = nomeEmpresa.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')
    link.href = url
    link.download = `jemani-${mesNome}-${ano}-${empresaSlug || 'planilha'}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <button type="button" className="btn-secundario planilha-mensal-gatilho" onClick={abrir}>
        {rotuloBotao ?? t('planilha.botao')}
      </button>

      {aberta && (
        <div
          className="planilha-mensal-fundo"
          role="dialog"
          aria-modal="true"
          aria-labelledby="planilha-titulo"
          onClick={(evento) => {
            if (evento.target === evento.currentTarget) fechar()
          }}
        >
          <div className="planilha-mensal-painel">
            <header className="planilha-mensal-cabeca">
              <div>
                <h2 id="planilha-titulo" className="planilha-mensal-titulo">
                  {t('planilha.titulo')}
                </h2>
                <p className="planilha-mensal-sub">
                  {etapa === 'mes' && t('planilha.subMes')}
                  {etapa === 'empresa' &&
                    t('planilha.subEmpresa', {
                      mes: mes ? t(CHAVES_MES[mes]) : '',
                      ano: String(ano),
                    })}
                  {etapa === 'planilha' &&
                    t('planilha.subPlanilha', {
                      mes: mes ? t(CHAVES_MES[mes]) : '',
                      ano: String(ano),
                      empresa: nomeEmpresa,
                    })}
                </p>
              </div>
              <button type="button" className="btn-secundario !py-2" onClick={fechar}>
                {t('comum.fechar')}
              </button>
            </header>

            <div className="planilha-mensal-passos" aria-hidden="true">
              <span className={`planilha-mensal-passo ${etapa === 'mes' ? 'planilha-mensal-passo--ativo' : 'planilha-mensal-passo--feito'}`}>
                1 · {t('planilha.passoMes')}
              </span>
              {!empresaFixaId && (
                <span
                  className={`planilha-mensal-passo ${
                    etapa === 'empresa'
                      ? 'planilha-mensal-passo--ativo'
                      : etapa === 'planilha'
                        ? 'planilha-mensal-passo--feito'
                        : ''
                  }`}
                >
                  2 · {t('planilha.passoEmpresa')}
                </span>
              )}
              <span className={`planilha-mensal-passo ${etapa === 'planilha' ? 'planilha-mensal-passo--ativo' : ''}`}>
                {empresaFixaId ? '2' : '3'} · {t('planilha.passoPlanilha')}
              </span>
            </div>

            <div className="planilha-mensal-corpo">
              {etapa === 'mes' && (
                <>
                  {anos.length > 0 && (
                    <div className="planilha-mensal-anos" role="tablist" aria-label={t('planilha.ano')}>
                      {anos.map((item) => (
                        <button
                          key={item}
                          type="button"
                          role="tab"
                          aria-selected={item === ano}
                          className={`planilha-mensal-ano ${item === ano ? 'planilha-mensal-ano--ativo' : ''}`}
                          onClick={() => setAno(item)}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="planilha-mensal-meses">
                    {contagemMeses.map((item) => (
                      <button
                        key={item.mes}
                        type="button"
                        className="planilha-mensal-mes"
                        disabled={item.quantidade === 0}
                        onClick={() => escolherMes(item.mes)}
                      >
                        <span className="planilha-mensal-mes-nome">{t(CHAVES_MES[item.mes])}</span>
                        <span className="planilha-mensal-mes-qtd">
                          {item.quantidade === 0
                            ? t('planilha.semCorridas')
                            : t('planilha.qtdCorridas', { n: item.quantidade })}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {etapa === 'empresa' && (
                <div className="planilha-mensal-empresas">
                  {contagemEmpresas.length === 0 ? (
                    <p className="planilha-mensal-vazio">{t('planilha.semEmpresaMes')}</p>
                  ) : (
                    contagemEmpresas.map((item) => (
                      <button
                        key={item.empresaId}
                        type="button"
                        className="planilha-mensal-empresa"
                        onClick={() => escolherEmpresa(item.empresaId)}
                      >
                        <div>
                          <p className="planilha-mensal-empresa-nome">{item.nome}</p>
                          <p className="planilha-mensal-empresa-meta">
                            {t('planilha.qtdCorridas', { n: item.quantidade })} ·{' '}
                            {formatarMoeda(item.valorEmpresa, locale)}
                          </p>
                        </div>
                        <span className="planilha-mensal-empresa-selo">{t('planilha.abrir')}</span>
                      </button>
                    ))
                  )}
                </div>
              )}

              {etapa === 'planilha' && mes && (
                <>
                  <div className="planilha-mensal-toolbar">
                    <div className="planilha-mensal-resumo">
                      <span className="planilha-mensal-chip">
                        {t('planilha.qtdCorridas', { n: resumo.quantidade })}
                      </span>
                      <span className="planilha-mensal-chip">
                        {t('planilha.finalizadas')}: {resumo.finalizadas}
                      </span>
                      <span className="planilha-mensal-chip">
                        {t('planilha.canceladas')}: {resumo.canceladas}
                      </span>
                      <span className="planilha-mensal-chip">
                        {t('planilha.total')}: {formatarMoeda(resumo.precoTotal, locale)}
                      </span>
                      <span className="planilha-mensal-chip">
                        {t('planilha.repasse')}: {formatarMoeda(resumo.valorEmpresa, locale)}
                      </span>
                    </div>
                    <div className="planilha-mensal-acoes">
                      <button type="button" className="btn-ouro !py-2" onClick={exportarCsv} disabled={linhas.length === 0}>
                        {t('planilha.exportar')}
                      </button>
                    </div>
                  </div>

                  {linhas.length === 0 ? (
                    <p className="planilha-mensal-vazio">{t('planilha.vazio')}</p>
                  ) : (
                    <div className="planilha-mensal-tabela-envolve">
                      <table className="planilha-mensal-tabela">
                        <thead>
                          <tr>
                            <th>{t('planilha.col.codigo')}</th>
                            <th>{t('planilha.col.data')}</th>
                            <th>{t('planilha.col.status')}</th>
                            <th>{t('planilha.col.cliente')}</th>
                            {!empresaFixaId && <th>{t('planilha.col.empresa')}</th>}
                            <th>{t('planilha.col.motorista')}</th>
                            <th>{t('planilha.col.rota')}</th>
                            <th>{t('planilha.col.total')}</th>
                            <th>{t('planilha.col.empresaValor')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {linhas.map((viagem) => {
                            const cliente = mapaClientes.get(viagem.cliente_id)
                            const empresa = viagem.empresa_id
                              ? empresas.find((item) => item.id === viagem.empresa_id)
                              : undefined
                            const motorista = viagem.motorista_id
                              ? mapaMotoristas.get(viagem.motorista_id)
                              : undefined
                            const categoria = mapaCategorias.get(viagem.categoria_id)
                            return (
                              <tr key={viagem.id}>
                                <td>
                                  <div className="planilha-mensal-codigo">{viagem.codigo}</div>
                                  <div className="text-[var(--color-slate)]">
                                    {categoria?.nome ?? '—'} ·{' '}
                                    {viagem.modalidade === 'hourly'
                                      ? t('planilha.hourly')
                                      : t('planilha.oneWay')}
                                  </div>
                                </td>
                                <td>
                                  {formatarData(viagem.data_viagem, locale)}
                                  <br />
                                  {viagem.horario}
                                </td>
                                <td>
                                  <BadgeStatus status={viagem.status} />
                                </td>
                                <td>
                                  {cliente?.nome ?? '—'}
                                  {viagem.nome_passageiro ? (
                                    <>
                                      <br />
                                      <span className="text-[var(--color-slate)]">
                                        {viagem.nome_passageiro}
                                      </span>
                                    </>
                                  ) : null}
                                </td>
                                {!empresaFixaId && <td>{empresa?.nome_comercial ?? '—'}</td>}
                                <td>{motorista?.nome ?? '—'}</td>
                                <td className="planilha-mensal-rota">
                                  {viagem.origem} → {viagem.destino}
                                </td>
                                <td>{formatarMoeda(viagem.preco_total, locale)}</td>
                                <td>{formatarMoeda(viagem.valor_empresa, locale)}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>

            <footer className="planilha-mensal-rodape">
              <div>
                {etapa !== 'mes' && (
                  <button type="button" className="btn-secundario !py-2" onClick={voltar}>
                    {t('comum.voltar')}
                  </button>
                )}
              </div>
              <p className="planilha-mensal-dica">{t('planilha.dica')}</p>
            </footer>
          </div>
        </div>
      )}
    </>
  )
}
