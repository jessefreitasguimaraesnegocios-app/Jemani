import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ListaHistoricoCorridas } from '@/components/ListaHistoricoCorridas'
import { usarIdioma } from '@/i18n/usarIdioma'
import { montarResumoHistorico } from '@/services/historicoCorridas'
import { useDemoStore } from '@/store/demoStore'
import { formatarMoeda } from '@/utils/format'
import './AdminHistoricoPage.css'

export function AdminEmpresaHistoricoPage() {
  const { id } = useParams()
  const { t, locale } = usarIdioma()
  const empresas = useDemoStore((s) => s.empresas)
  const viagens = useDemoStore((s) => s.viagens)
  const perfis = useDemoStore((s) => s.perfis)
  const categorias = useDemoStore((s) => s.categorias)
  const motoristas = useDemoStore((s) => s.motoristas)

  const empresa = useMemo(() => empresas.find((e) => e.id === id), [empresas, id])
  const corridas = useMemo(
    () => viagens.filter((v) => v.empresa_id === id),
    [viagens, id],
  )
  const resumo = useMemo(() => montarResumoHistorico(corridas, 'empresa'), [corridas])
  const mapaEmpresas = useMemo(() => new Map(empresas.map((e) => [e.id, e])), [empresas])
  const mapaClientes = useMemo(() => new Map(perfis.map((p) => [p.id, p])), [perfis])
  const mapaCategorias = useMemo(() => new Map(categorias.map((c) => [c.id, c])), [categorias])
  const mapaMotoristas = useMemo(() => new Map(motoristas.map((m) => [m.id, m])), [motoristas])

  if (!empresa) {
    return (
      <div className="cartao">
        {t('hist.empresaAusente')}{' '}
        <Link to="/admin/empresas">{t('hist.voltarParaEmpresas')}</Link>
      </div>
    )
  }

  return (
    <div className="animar-entrada space-y-6">
      <div>
        <Link to="/admin/empresas" className="admin-historico-voltar">
          {t('hist.voltarEmpresas')}
        </Link>
        <div className="admin-historico-cabecalho">
          <div>
            <h1 className="fonte-display text-3xl">{t('hist.empresaTitulo')}</h1>
            <p className="admin-historico-sub">
              {empresa.nome_comercial} · {empresa.cidade} · {empresa.email}
            </p>
          </div>
        </div>
      </div>

      <div className="historico-resumo">
        <div className="cartao historico-resumo-item">
          <p className="historico-resumo-rotulo">{t('hist.corridasAceitas')}</p>
          <p className="historico-resumo-valor">{resumo.total}</p>
        </div>
        <div className="cartao historico-resumo-item">
          <p className="historico-resumo-rotulo">{t('hist.realizadas')}</p>
          <p className="historico-resumo-valor">{resumo.realizadas}</p>
        </div>
        <div className="cartao historico-resumo-item">
          <p className="historico-resumo-rotulo">{t('status.cancelada')}</p>
          <p className="historico-resumo-valor">{resumo.canceladas}</p>
        </div>
        <div className="cartao historico-resumo-item">
          <p className="historico-resumo-rotulo">{t('hist.valor')}</p>
          <p className="historico-resumo-valor">{formatarMoeda(resumo.valor, locale)}</p>
        </div>
      </div>

      <ListaHistoricoCorridas
        viagens={corridas}
        visao="empresa"
        mapaEmpresas={mapaEmpresas}
        mapaClientes={mapaClientes}
        mapaCategorias={mapaCategorias}
        mapaMotoristas={mapaMotoristas}
      />
    </div>
  )
}
