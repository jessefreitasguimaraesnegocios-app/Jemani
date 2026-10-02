import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ListaHistoricoCorridas } from '@/components/ListaHistoricoCorridas'
import { usarIdioma } from '@/i18n/usarIdioma'
import { montarResumoHistorico } from '@/services/historicoCorridas'
import { useDemoStore } from '@/store/demoStore'
import { formatarMoeda } from '@/utils/format'
import './AdminHistoricoPage.css'

export function AdminClienteHistoricoPage() {
  const { id } = useParams()
  const { t, locale } = usarIdioma()
  const perfis = useDemoStore((s) => s.perfis)
  const viagens = useDemoStore((s) => s.viagens)
  const empresas = useDemoStore((s) => s.empresas)
  const categorias = useDemoStore((s) => s.categorias)
  const motoristas = useDemoStore((s) => s.motoristas)

  const cliente = useMemo(() => perfis.find((p) => p.id === id && p.tipo === 'cliente'), [perfis, id])
  const corridas = useMemo(
    () => viagens.filter((v) => v.cliente_id === id),
    [viagens, id],
  )
  const resumo = useMemo(() => montarResumoHistorico(corridas, 'cliente'), [corridas])
  const mapaEmpresas = useMemo(() => new Map(empresas.map((e) => [e.id, e])), [empresas])
  const mapaClientes = useMemo(() => new Map(perfis.map((p) => [p.id, p])), [perfis])
  const mapaCategorias = useMemo(() => new Map(categorias.map((c) => [c.id, c])), [categorias])
  const mapaMotoristas = useMemo(() => new Map(motoristas.map((m) => [m.id, m])), [motoristas])

  if (!cliente) {
    return (
      <div className="cartao">
        {t('hist.clienteAusente')}{' '}
        <Link to="/admin/clientes">{t('hist.voltarParaClientes')}</Link>
      </div>
    )
  }

  return (
    <div className="animar-entrada space-y-6">
      <div>
        <Link to="/admin/clientes" className="admin-historico-voltar">
          {t('hist.voltarClientes')}
        </Link>
        <div className="admin-historico-cabecalho">
          <div>
            <h1 className="fonte-display text-3xl">{t('hist.clienteTitulo')}</h1>
            <p className="admin-historico-sub">
              {cliente.nome} · {cliente.email} · {cliente.telefone ?? t('admin.clientes.semTel')}
            </p>
          </div>
        </div>
      </div>

      <div className="historico-resumo">
        <div className="cartao historico-resumo-item">
          <p className="historico-resumo-rotulo">{t('hist.corridas')}</p>
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
        visao="cliente"
        mapaEmpresas={mapaEmpresas}
        mapaClientes={mapaClientes}
        mapaCategorias={mapaCategorias}
        mapaMotoristas={mapaMotoristas}
      />
    </div>
  )
}
