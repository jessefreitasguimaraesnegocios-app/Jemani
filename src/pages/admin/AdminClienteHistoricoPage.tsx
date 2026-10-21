import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FotoPerfilCliente } from '@/components/FotoPerfilCliente'
import { ListaHistoricoCorridas } from '@/components/ListaHistoricoCorridas'
import { usarIdioma } from '@/i18n/usarIdioma'
import { excluirUsuarioAdmin } from '@/services/adminUsuarios'
import { montarResumoHistorico } from '@/services/historicoCorridas'
import { useDemoStore } from '@/store/demoStore'
import { formatarMoeda } from '@/utils/format'
import './AdminHistoricoPage.css'

export function AdminClienteHistoricoPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t, locale } = usarIdioma()
  const perfis = useDemoStore((s) => s.perfis)
  const viagens = useDemoStore((s) => s.viagens)
  const empresas = useDemoStore((s) => s.empresas)
  const categorias = useDemoStore((s) => s.categorias)
  const motoristas = useDemoStore((s) => s.motoristas)
  const removerUsuarioLocal = useDemoStore((s) => s.removerUsuarioLocal)

  const [confirmando, setConfirmando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')

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

  async function confirmarExclusao() {
    if (!cliente || excluindo) return
    setErro('')
    setMsg('')
    setExcluindo(true)
    try {
      await excluirUsuarioAdmin(cliente.id)
      removerUsuarioLocal(cliente.id)
      setConfirmando(false)
      setMsg(t('admin.clientes.excluido'))
      navigate('/admin/clientes', { replace: true })
    } catch (e) {
      setErro(e instanceof Error ? e.message : t('admin.clientes.erroExcluir'))
    } finally {
      setExcluindo(false)
    }
  }

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
          <div className="admin-historico-perfil">
            <FotoPerfilCliente
              url={cliente.avatar_url}
              nome={cliente.nome}
              tamanho="perfil"
            />
            <div>
              <p className="admin-historico-kicker">{t('hist.clienteTitulo')}</p>
              <h1 className="fonte-display text-3xl">{cliente.nome}</h1>
              <div className="admin-historico-contatos">
                <p>
                  <span>{t('comum.email')}</span>
                  <strong>{cliente.email}</strong>
                </p>
                <p>
                  <span>{t('comum.telefone')}</span>
                  <strong>{cliente.telefone ?? t('admin.clientes.semTel')}</strong>
                </p>
              </div>
            </div>
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
              {t('admin.clientes.excluir')}
            </button>
          </div>
        </div>
        {erro && <p className="admin-historico-erro">{erro}</p>}
        {msg && <p className="admin-historico-ok">{msg}</p>}
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
              aria-labelledby="admin-excluir-cliente-titulo"
              onClick={(evento) => evento.stopPropagation()}
            >
              <h2 id="admin-excluir-cliente-titulo" className="fonte-display text-2xl">
                {t('admin.clientes.excluirTitulo')}
              </h2>
              <p>{t('admin.clientes.excluirAviso', { email: cliente.email })}</p>
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
                  {excluindo ? t('admin.clientes.excluindo') : t('admin.clientes.excluir')}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
