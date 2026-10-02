import { useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ListaHistoricoCorridas } from '@/components/ListaHistoricoCorridas'
import { usarIdioma } from '@/i18n/usarIdioma'
import { montarResumoHistorico } from '@/services/historicoCorridas'
import { useDemoStore } from '@/store/demoStore'
import { formatarMoeda } from '@/utils/format'
import './EmpresaViagensPage.css'

export function EmpresaViagensPage() {
  const { t, locale } = usarIdioma()
  const { usuario } = useAuth()
  const empresa = useDemoStore((s) => s.obterEmpresaDoUsuario(usuario?.id ?? ''))
  const todasViagens = useDemoStore((s) => s.viagens)
  const empresas = useDemoStore((s) => s.empresas)
  const perfis = useDemoStore((s) => s.perfis)
  const categorias = useDemoStore((s) => s.categorias)
  const motoristas = useDemoStore((s) => s.motoristas)
  const viagens = useMemo(
    () => todasViagens.filter((v) => v.empresa_id === empresa?.id),
    [todasViagens, empresa?.id],
  )
  const resumo = useMemo(() => montarResumoHistorico(viagens, 'empresa'), [viagens])
  const mapaEmpresas = useMemo(() => new Map(empresas.map((e) => [e.id, e])), [empresas])
  const mapaClientes = useMemo(() => new Map(perfis.map((p) => [p.id, p])), [perfis])
  const mapaCategorias = useMemo(() => new Map(categorias.map((c) => [c.id, c])), [categorias])
  const mapaMotoristas = useMemo(() => new Map(motoristas.map((m) => [m.id, m])), [motoristas])

  return (
    <div className="animar-entrada space-y-6">
      <div>
        <h1 className="fonte-display text-3xl">{t('empresa.historico.titulo')}</h1>
        <p className="empresa-historico-sub">{t('empresa.historico.sub')}</p>
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

      {viagens.length === 0 ? (
        <div className="cartao">{t('hist.vazio')}</div>
      ) : (
        <ListaHistoricoCorridas
          viagens={viagens}
          visao="empresa"
          mapaEmpresas={mapaEmpresas}
          mapaClientes={mapaClientes}
          mapaCategorias={mapaCategorias}
          mapaMotoristas={mapaMotoristas}
          caminhoDetalhe={(id) => `/empresa/viagens/${id}`}
        />
      )}
    </div>
  )
}
