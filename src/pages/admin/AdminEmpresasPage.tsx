import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { FormularioEditarEmpresa } from '@/components/FormularioEditarEmpresa'
import { FormularioNovaEmpresa } from '@/components/FormularioNovaEmpresa'
import { usarIdioma } from '@/i18n/usarIdioma'
import { AdminCatalogoVeiculos } from '@/pages/admin/AdminCatalogoVeiculos'
import { AdminFrotaVeiculos } from '@/pages/admin/AdminFrotaVeiculos'
import { excluirEmpresaAdmin } from '@/services/adminUsuarios'
import { listarEmpresasNuvem } from '@/services/nuvemCatalogo'
import { useDemoStore } from '@/store/demoStore'
import './AdminEmpresasPage.css'

function fraseConfirmacaoExclusao(nome: string) {
  return `excluir ${nome.trim()}`.replace(/\s+/g, ' ').trim()
}

function normalizarFrase(texto: string) {
  return texto.trim().replace(/\s+/g, ' ').toLowerCase()
}

type AbaAdminEmpresas = 'empresas' | 'veiculos'

export function AdminEmpresasPage() {
  const { t } = usarIdioma()
  const empresas = useDemoStore((s) => s.empresas)
  const categorias = useDemoStore((s) => s.categorias)
  const salvarEmpresa = useDemoStore((s) => s.salvarEmpresa)
  const criarEmpresa = useDemoStore((s) => s.criarEmpresa)
  const removerEmpresaLocal = useDemoStore((s) => s.removerEmpresaLocal)
  const motoristas = useDemoStore((s) => s.motoristas)
  const veiculos = useDemoStore((s) => s.veiculos)
  const [aba, setAba] = useState<AbaAdminEmpresas>('empresas')
  const [empresaAbertaId, setEmpresaAbertaId] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const [erro, setErro] = useState('')
  const [mostrarForm, setMostrarForm] = useState(false)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  const [fraseExclusao, setFraseExclusao] = useState('')
  const [excluindo, setExcluindo] = useState(false)
  const [erroExclusao, setErroExclusao] = useState('')

  const empresaAberta = useMemo(
    () => empresas.find((e) => e.id === empresaAbertaId) ?? null,
    [empresas, empresaAbertaId],
  )
  const aplicarEmpresasNuvem = useDemoStore((s) => s.aplicarEmpresasNuvem)

  useEffect(() => {
    let ativo = true
    void listarEmpresasNuvem()
      .then((lista) => {
        if (!ativo || !lista.length) return
        aplicarEmpresasNuvem(lista)
      })
      .catch((err) => {
        if (!ativo) return
        setErro(err instanceof Error ? err.message : t('admin.empresas.erroExcluir'))
      })
    return () => {
      ativo = false
    }
  }, [aplicarEmpresasNuvem, t])

  async function confirmarExclusaoEmpresa() {
    if (!empresaAberta || excluindo) return
    const esperada = fraseConfirmacaoExclusao(empresaAberta.nome_comercial)
    if (normalizarFrase(fraseExclusao) !== normalizarFrase(esperada)) {
      setErroExclusao(t('admin.empresas.fraseIncorreta'))
      return
    }
    setErroExclusao('')
    setExcluindo(true)
    try {
      await excluirEmpresaAdmin(empresaAberta.id)
      removerEmpresaLocal(empresaAberta.id)
      setConfirmandoExclusao(false)
      setFraseExclusao('')
      setEmpresaAbertaId(null)
      setMsg(t('admin.empresas.excluido'))
      setErro('')
    } catch (e) {
      const texto = e instanceof Error ? e.message.toLowerCase() : ''
      if (texto.includes('encontrado') || texto.includes('not found')) {
        removerEmpresaLocal(empresaAberta.id)
        setConfirmandoExclusao(false)
        setFraseExclusao('')
        setEmpresaAbertaId(null)
        setMsg(t('admin.empresas.excluido'))
        setErro('')
        return
      }
      setErroExclusao(e instanceof Error ? e.message : t('admin.empresas.erroExcluir'))
    } finally {
      setExcluindo(false)
    }
  }

  return (
    <div className="animar-entrada space-y-6">
      <div className="admin-empresas-cabecalho">
        <div>
          <h1 className="fonte-display text-3xl">{t('admin.empresas.titulo')}</h1>
          <p className="mt-1 text-sm text-[var(--color-slate)]">{t('admin.empresas.sub')}</p>
        </div>
        {aba === 'empresas' && !mostrarForm && !empresaAberta && (
          <button type="button" className="btn-ouro" onClick={() => setMostrarForm(true)}>
            {t('admin.empresas.add')}
          </button>
        )}
      </div>

      <div className="admin-empresas-abas" role="tablist" aria-label={t('admin.empresas.titulo')}>
        <button
          type="button"
          role="tab"
          aria-selected={aba === 'empresas'}
          className={`admin-empresas-aba${aba === 'empresas' ? ' admin-empresas-aba--ativa' : ''}`}
          onClick={() => setAba('empresas')}
        >
          {t('admin.empresas.abaEmpresas')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={aba === 'veiculos'}
          className={`admin-empresas-aba${aba === 'veiculos' ? ' admin-empresas-aba--ativa' : ''}`}
          onClick={() => {
            setAba('veiculos')
            setEmpresaAbertaId(null)
            setMostrarForm(false)
          }}
        >
          {t('admin.empresas.abaVeiculos')}
        </button>
      </div>

      {aba === 'veiculos' ? (
        <div className="space-y-8">
          <AdminCatalogoVeiculos />
          <AdminFrotaVeiculos />
        </div>
      ) : (
        <>
          {mostrarForm && (
            <FormularioNovaEmpresa
              categorias={categorias}
              onCancelar={() => setMostrarForm(false)}
              onCriada={(empresa, senha) => {
                criarEmpresa(empresa, senha)
                setMostrarForm(false)
                setErro('')
                setMsg(`Empresa ${empresa.nome_comercial} salva no Supabase e já aparece na lista.`)
              }}
            />
          )}

          {!empresaAberta && (
            <>
              {(msg || erro) && (
                <div className="cartao">
                  {msg && <p className="text-sm text-[var(--color-success)]">{msg}</p>}
                  {erro && <p className="text-sm text-[var(--color-danger)]">{erro}</p>}
                </div>
              )}

              <section className="admin-empresas-secao">
                <h2 className="fonte-display text-2xl">
                  {t('admin.empresas.parceiras', { n: empresas.length })}
                </h2>
                <div className="admin-empresas-lista-nomes">
                  {empresas.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      className="cartao admin-empresa-nome"
                      onClick={() => setEmpresaAbertaId(e.id)}
                    >
                      <span className="font-medium">{e.nome_comercial}</span>
                      <span className="badge-status">{e.status}</span>
                    </button>
                  ))}
                </div>
              </section>
            </>
          )}

          {empresaAberta && (
            <section className="admin-empresas-secao">
              <button
                type="button"
                className="btn-secundario admin-empresa-voltar"
                onClick={() => setEmpresaAbertaId(null)}
              >
                {t('admin.empresas.voltarLista')}
              </button>
              {(msg || erro) && (
                <div className="cartao">
                  {msg && <p className="text-sm text-[var(--color-success)]">{msg}</p>}
                  {erro && <p className="text-sm text-[var(--color-danger)]">{erro}</p>}
                </div>
              )}
              {(() => {
                const e = empresaAberta
                return (
                  <div className="cartao admin-empresa-card">
                    <div className="admin-empresa-topo">
                      <div>
                        <p className="font-medium">{e.nome_comercial}</p>
                        <p className="text-sm text-[var(--color-slate)]">
                          {e.razao_social} · {e.cnpj} · {e.cidade}
                        </p>
                        <p className="text-sm text-[var(--color-slate)]">
                          {e.endereco_base ?? '—'}
                          {typeof e.latitude === 'number'
                            ? ` · ${e.latitude.toFixed(4)}, ${e.longitude?.toFixed(4)}`
                            : ''}
                        </p>
                        <p className="text-sm text-[var(--color-slate)]">
                          {e.email} · {motoristas.filter((m) => m.empresa_id === e.id).length}{' '}
                          motoristas · {veiculos.filter((v) => v.empresa_id === e.id).length} veículos
                        </p>
                      </div>
                      <span className="badge-status">{e.status}</span>
                    </div>

                    <div className="admin-empresa-bloco">
                      <FormularioEditarEmpresa
                        empresa={e}
                        categorias={categorias}
                        onSalvar={(patch) => {
                          salvarEmpresa(patch)
                          setMsg(`Empresa ${patch.nome_comercial ?? e.nome_comercial} atualizada.`)
                          setErro('')
                        }}
                      />
                    </div>

                    <div className="admin-empresa-bloco">
                      <h3>Gestão de status</h3>
                      <div className="admin-empresa-acoes">
                        <button
                          type="button"
                          className="btn-secundario !py-2"
                          onClick={() =>
                            salvarEmpresa({
                              id: e.id,
                              status: 'aprovada',
                              habilitada_receber: true,
                            })
                          }
                        >
                          Aprovar
                        </button>
                        <button
                          type="button"
                          className="btn-secundario !py-2"
                          onClick={() =>
                            salvarEmpresa({ id: e.id, status: 'ativa', habilitada_receber: true })
                          }
                        >
                          Ativar
                        </button>
                        <button
                          type="button"
                          className="btn-secundario !py-2"
                          onClick={() =>
                            salvarEmpresa({
                              id: e.id,
                              status: 'inativa',
                              habilitada_receber: false,
                            })
                          }
                        >
                          Desativar
                        </button>
                        <button
                          type="button"
                          className="btn-perigo !py-2"
                          onClick={() =>
                            salvarEmpresa({
                              id: e.id,
                              status: 'bloqueada',
                              habilitada_receber: false,
                            })
                          }
                        >
                          Bloquear
                        </button>
                        <button
                          type="button"
                          className="btn-perigo !py-2"
                          onClick={() => {
                            setErroExclusao('')
                            setFraseExclusao('')
                            setConfirmandoExclusao(true)
                          }}
                        >
                          {t('admin.empresas.excluir')}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </section>
          )}
        </>
      )}

      {confirmandoExclusao &&
        empresaAberta &&
        createPortal(
          <div
            className="admin-empresa-popup"
            role="presentation"
            onClick={() => {
              if (!excluindo) setConfirmandoExclusao(false)
            }}
          >
            <div
              className="admin-empresa-popup-painel"
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
                  nome: empresaAberta.nome_comercial,
                  email: empresaAberta.email,
                })}
              </p>
              <p className="admin-empresa-popup-dica">
                {t('admin.empresas.excluirDigite')}
                <strong> {fraseConfirmacaoExclusao(empresaAberta.nome_comercial)}</strong>
              </p>
              <input
                className="campo"
                autoFocus
                value={fraseExclusao}
                disabled={excluindo}
                placeholder={t('admin.empresas.excluirPlaceholder', {
                  nome: empresaAberta.nome_comercial,
                })}
                onChange={(evento) => {
                  setFraseExclusao(evento.target.value)
                  if (erroExclusao) setErroExclusao('')
                }}
                onKeyDown={(evento) => {
                  if (evento.key === 'Enter') {
                    evento.preventDefault()
                    void confirmarExclusaoEmpresa()
                  }
                }}
              />
              {erroExclusao && <p className="admin-empresa-popup-erro">{erroExclusao}</p>}
              <div className="admin-empresa-popup-acoes">
                <button
                  type="button"
                  className="btn-secundario"
                  disabled={excluindo}
                  onClick={() => setConfirmandoExclusao(false)}
                >
                  {t('comum.cancelar')}
                </button>
                <button
                  type="button"
                  className="btn-perigo"
                  disabled={excluindo || !fraseExclusao.trim()}
                  onClick={() => void confirmarExclusaoEmpresa()}
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
