import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ListaHistoricoCorridas } from '@/components/ListaHistoricoCorridas'
import { usarIdioma } from '@/i18n/usarIdioma'
import { excluirEmpresaAdmin } from '@/services/adminUsuarios'
import { montarResumoHistorico } from '@/services/historicoCorridas'
import { useDemoStore } from '@/store/demoStore'
import { formatarMoeda } from '@/utils/format'
import './AdminHistoricoPage.css'

export function AdminEmpresaHistoricoPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t, locale } = usarIdioma()
  const empresas = useDemoStore((s) => s.empresas)
  const viagens = useDemoStore((s) => s.viagens)
  const perfis = useDemoStore((s) => s.perfis)
  const categorias = useDemoStore((s) => s.categorias)
  const motoristas = useDemoStore((s) => s.motoristas)
  const removerEmpresaLocal = useDemoStore((s) => s.removerEmpresaLocal)

  const [confirmando, setConfirmando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [erro, setErro] = useState('')

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

  async function confirmarExclusao() {
    if (!empresa || excluindo) return
    setErro('')
    setExcluindo(true)
    try {
      await excluirEmpresaAdmin(empresa.id)
      removerEmpresaLocal(empresa.id)
      setConfirmando(false)
      navigate('/admin/empresas', { replace: true })
    } catch (e) {
      const texto = e instanceof Error ? e.message.toLowerCase() : ''
      if (texto.includes('encontrado') || texto.includes('not found')) {
        removerEmpresaLocal(empresa.id)
        setConfirmando(false)
        navigate('/admin/empresas', { replace: true })
        return
      }
      setErro(e instanceof Error ? e.message : t('admin.empresas.erroExcluir'))
    } finally {
      setExcluindo(false)
    }
  }

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
          <div className="admin-historico-acoes">
            <button
              type="button"
              className="btn-perigo"
              onClick={() => {
                setErro('')
                setConfirmando(true)
              }}
            >
              {t('admin.empresas.excluir')}
            </button>
          </div>
        </div>
        {erro && <p className="admin-historico-erro">{erro}</p>}
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

      {confirmando &&
        createPortal(
          <div
            className="admin-historico-popup"
            role="presentation"
            onClick={() => {
              if (!excluindo) setConfirmando(false)
            }}
          >
            <div
              className="admin-historico-popup-painel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="admin-excluir-empresa-titulo"
              onClick={(evento) => evento.stopPropagation()}
            >
              <h2 id="admin-excluir-empresa-titulo" className="fonte-display text-2xl">
                {t('admin.empresas.excluirTitulo')}
              </h2>
              <p>
                {t('admin.empresas.excluirAviso', {
                  nome: empresa.nome_comercial,
                  email: empresa.email,
                })}
              </p>
              {erro && <p className="admin-historico-erro">{erro}</p>}
              <div className="admin-historico-popup-acoes">
                <button
                  type="button"
                  className="btn-secundario"
                  disabled={excluindo}
                  onClick={() => setConfirmando(false)}
                >
                  {t('comum.cancelar')}
                </button>
                <button
                  type="button"
                  className="btn-perigo"
                  disabled={excluindo}
                  onClick={() => void confirmarExclusao()}
                >
                  {excluindo ? t('admin.empresas.excluindo') : t('admin.empresas.excluir')}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
