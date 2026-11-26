import { useEffect, useId, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Ellipsis } from 'lucide-react'
import { BotaoSalvar } from '@/components/BotaoSalvar'
import '@/components/BadgeStatus.css'
import { usarIdioma } from '@/i18n/usarIdioma'
import type { ChaveTraducao } from '@/i18n/mensagens'
import { supabaseConfigurado } from '@/lib/supabase'
import {
  aplicarConfiguracaoDistribuicao,
  configurarDistribuicaoAutomatica,
  linhaInicialDistribuicao,
  listarControleDistribuicao,
  migracaoDistribuicaoAusente,
  reiniciarContadorDistribuicao,
  reiniciarContadorLocal,
  type LinhaDistribuicao,
  type PeriodoDistribuicao,
} from '@/services/controleDistribuicao'
import { useDemoStore } from '@/store/demoStore'
import './AdminControleDistribuicao.css'

let memoriaDemo: LinhaDistribuicao[] | null = null

function chavePeriodo(periodo: PeriodoDistribuicao): ChaveTraducao {
  if (periodo === 'semanal') return 'distAuto.porSemana'
  if (periodo === 'mensal') return 'distAuto.porMes'
  return 'distAuto.porDia'
}

function textoLimite(
  linha: LinhaDistribuicao,
  t: (chave: ChaveTraducao, vars?: Record<string, string | number>) => string,
) {
  if (linha.ilimitada || linha.limite === null) return t('distAuto.ilimitado')
  return `${linha.limite} ${t(chavePeriodo(linha.periodo))}`
}

function limiteInformado(texto: string) {
  if (!/^\d+$/.test(texto)) return null
  const valor = Number(texto)
  if (valor < 1 || valor > 1000000) return null
  return valor
}

export function AdminControleDistribuicao() {
  const { t } = usarIdioma()
  const empresas = useDemoStore((s) => s.empresas)
  const nuvem = supabaseConfigurado
  const [linhas, setLinhas] = useState<LinhaDistribuicao[] | null>(null)
  const [carregando, setCarregando] = useState(nuvem)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [aberta, setAberta] = useState<LinhaDistribuicao | null>(null)

  useEffect(() => {
    if (nuvem) return
    setLinhas((atual) => {
      const anteriores = new Map((atual ?? memoriaDemo ?? []).map((linha) => [linha.empresaId, linha]))
      const proximas = empresas.map(
        (empresa) => anteriores.get(empresa.id) ?? linhaInicialDistribuicao(empresa),
      )
      memoriaDemo = proximas
      return proximas
    })
    setCarregando(false)
  }, [empresas, nuvem])

  useEffect(() => {
    if (!nuvem) return
    let ativo = true

    async function carregar() {
      try {
        const lista = await listarControleDistribuicao()
        if (!ativo) return
        setLinhas(lista)
        setErro('')
        setAberta((atual) => {
          if (!atual) return atual
          return lista.find((linha) => linha.empresaId === atual.empresaId) ?? atual
        })
      } catch (falha) {
        if (!ativo) return
        setErro(
          migracaoDistribuicaoAusente(falha)
            ? t('distAuto.semMigracao')
            : falha instanceof Error && falha.message
              ? falha.message
              : t('distAuto.erro'),
        )
      } finally {
        if (ativo) setCarregando(false)
      }
    }

    void carregar()
    const relogio = window.setInterval(() => {
      if (document.visibilityState === 'visible') void carregar()
    }, 20000)
    window.addEventListener('focus', carregar)
    return () => {
      ativo = false
      window.clearInterval(relogio)
      window.removeEventListener('focus', carregar)
    }
  }, [nuvem, t])

  const ordenadas = useMemo(
    () => [...(linhas ?? [])].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [linhas],
  )
  const resumo = useMemo(() => {
    return ordenadas.reduce(
      (acc, linha) => {
        acc.periodo += linha.recebidas
        acc.historico += linha.recebidasTotal
        if (linha.limiteAtingido) acc.atingidas += 1
        if (linha.podeReceber) acc.disponiveis += 1
        return acc
      },
      { periodo: 0, historico: 0, atingidas: 0, disponiveis: 0 },
    )
  }, [ordenadas])

  function atualizarLinha(proxima: LinhaDistribuicao) {
    setLinhas((atual) => {
      const lista = (atual ?? []).map((linha) => (
        linha.empresaId === proxima.empresaId ? proxima : linha
      ))
      if (!nuvem) memoriaDemo = lista
      return lista
    })
    setAberta(proxima)
  }

  return (
    <section className="controle-dist">
      <div className="controle-dist-intro">
        <h2 className="fonte-display text-2xl">{t('distAuto.titulo')}</h2>
        <p className="text-sm text-[var(--color-slate)]">{t('distAuto.sub')}</p>
        <p className="controle-dist-fuso">{t('distAuto.fuso')}</p>
      </div>

      {!nuvem && <p className="controle-dist-aviso">{t('distAuto.demo')}</p>}
      {erro && <p role="alert" className="text-sm text-[var(--color-danger)]">{erro}</p>}
      {aviso && <p role="status" className="text-sm text-[var(--color-success)]">{aviso}</p>}

      <div className="controle-dist-resumo">
        <article className="cartao controle-dist-resumo-item">
          <strong>{resumo.periodo}</strong>
          <span>{t('distAuto.totalPeriodo')}</span>
        </article>
        <article className="cartao controle-dist-resumo-item">
          <strong>{resumo.atingidas}</strong>
          <span>{t('distAuto.atingidas')}</span>
        </article>
        <article className="cartao controle-dist-resumo-item">
          <strong>{resumo.disponiveis}</strong>
          <span>{t('distAuto.disponiveis')}</span>
        </article>
        <article className="cartao controle-dist-resumo-item">
          <strong>{resumo.historico}</strong>
          <span>{t('distAuto.totalHistorico')}</span>
        </article>
      </div>

      <div className="cartao controle-dist-tabela-wrap">
        {carregando && <p className="text-sm text-[var(--color-slate)]">{t('distAuto.carregando')}</p>}
        {!carregando && !erro && ordenadas.length === 0 && (
          <p className="text-sm text-[var(--color-slate)]">{t('distAuto.vazio')}</p>
        )}
        {ordenadas.length > 0 && (
          <table className="controle-dist-tabela">
            <thead>
              <tr>
                <th>{t('distAuto.colEmpresa')}</th>
                <th>{t('distAuto.colAceite')}</th>
                <th>{t('distAuto.colLimite')}</th>
                <th>{t('distAuto.colRecebidas')}</th>
                <th>{t('distAuto.colRestante')}</th>
                <th>{t('distAuto.colStatus')}</th>
                <th className="controle-dist-acoes">
                  <span className="controle-dist-so-leitor">{t('distAuto.colAcoes')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {ordenadas.map((linha) => (
                <tr key={linha.empresaId}>
                  <td>
                    <span className="controle-dist-rotulo">{t('distAuto.colEmpresa')}</span>
                    <span className="controle-dist-nome">{linha.nome}</span>
                  </td>
                  <td>
                    <span className="controle-dist-rotulo">{t('distAuto.colAceite')}</span>
                    <span className="controle-dist-status">
                      <span className={`badge-status ${linha.liberada ? 'badge-status--ok' : 'badge-status--neutro'}`}>
                        {t(linha.liberada ? 'distAuto.ativado' : 'distAuto.desativado')}
                      </span>
                      {linha.liberada && !linha.ligada && (
                        <span className="controle-dist-dica">{t('distAuto.aguardandoEmpresa')}</span>
                      )}
                    </span>
                  </td>
                  <td>
                    <span className="controle-dist-rotulo">{t('distAuto.colLimite')}</span>
                    {textoLimite(linha, t)}
                  </td>
                  <td>
                    <span className="controle-dist-rotulo">{t('distAuto.colRecebidas')}</span>
                    {linha.recebidas}
                  </td>
                  <td>
                    <span className="controle-dist-rotulo">{t('distAuto.colRestante')}</span>
                    {linha.restante === null ? '—' : linha.restante}
                  </td>
                  <td>
                    <span className="controle-dist-rotulo">{t('distAuto.colStatus')}</span>
                    <span className={`badge-status ${linha.limiteAtingido ? 'badge-status--erro' : 'badge-status--ok'}`}>
                      {t(linha.limiteAtingido ? 'distAuto.atingido' : 'distAuto.disponivel')}
                    </span>
                  </td>
                  <td className="controle-dist-acoes">
                    <button
                      type="button"
                      className="btn-secundario inline-flex size-10 items-center justify-center !p-0"
                      aria-label={t('distAuto.menuAcoes', { nome: linha.nome })}
                      onClick={() => {
                        setAviso('')
                        setAberta(linha)
                      }}
                    >
                      <Ellipsis size={18} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {aberta && (
        <DialogoDistribuicao
          key={aberta.empresaId}
          linha={aberta}
          nuvem={nuvem}
          onFechar={() => setAberta(null)}
          onAtualizar={atualizarLinha}
          onAviso={setAviso}
        />
      )}
    </section>
  )
}

function DialogoDistribuicao({
  linha,
  nuvem,
  onFechar,
  onAtualizar,
  onAviso,
}: {
  linha: LinhaDistribuicao
  nuvem: boolean
  onFechar: () => void
  onAtualizar: (linha: LinhaDistribuicao) => void
  onAviso: (texto: string) => void
}) {
  const { t } = usarIdioma()
  const tituloId = useId()
  const [liberada, setLiberada] = useState(linha.liberada)
  const [ilimitada, setIlimitada] = useState(linha.ilimitada)
  const [limite, setLimite] = useState(String(linha.limite ?? 10))
  const [periodo, setPeriodo] = useState<PeriodoDistribuicao>(linha.periodo)
  const [erro, setErro] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const [reiniciando, setReiniciando] = useState(false)

  useEffect(() => {
    function tecla(evento: KeyboardEvent) {
      if (evento.key === 'Escape' && !reiniciando) onFechar()
    }
    document.addEventListener('keydown', tecla)
    return () => document.removeEventListener('keydown', tecla)
  }, [onFechar, reiniciando])

  async function salvar() {
    setErro('')
    const quantidade = ilimitada ? null : limiteInformado(limite)
    if (!ilimitada && quantidade === null) {
      setErro(t('distAuto.limiteInvalido'))
      throw new Error('limite_invalido')
    }
    const config = {
      liberada,
      ilimitada,
      limite: quantidade,
      periodo,
    }
    try {
      if (nuvem) {
        await configurarDistribuicaoAutomatica(linha.empresaId, config)
        const lista = await listarControleDistribuicao()
        const atual = lista.find((item) => item.empresaId === linha.empresaId)
        if (atual) onAtualizar(atual)
        else onAtualizar(aplicarConfiguracaoDistribuicao(linha, config))
      } else {
        onAtualizar(aplicarConfiguracaoDistribuicao(linha, config))
      }
      onAviso(t('distAuto.salvo', { nome: linha.nome }))
    } catch (falha) {
      setErro(falha instanceof Error && falha.message ? falha.message : t('distAuto.erro'))
      throw falha
    }
  }

  async function reiniciar() {
    setErro('')
    setReiniciando(true)
    try {
      if (nuvem) {
        await reiniciarContadorDistribuicao(linha.empresaId)
        const lista = await listarControleDistribuicao()
        const atual = lista.find((item) => item.empresaId === linha.empresaId)
        if (atual) onAtualizar(atual)
      } else {
        onAtualizar(reiniciarContadorLocal(linha))
      }
      setConfirmando(false)
      onAviso(t('distAuto.reiniciado', { nome: linha.nome }))
    } catch (falha) {
      setErro(falha instanceof Error && falha.message ? falha.message : t('distAuto.erro'))
    } finally {
      setReiniciando(false)
    }
  }

  return createPortal(
    <div
      className="admin-empresa-popup"
      role="presentation"
      onClick={() => {
        if (!reiniciando) onFechar()
      }}
    >
      <div
        className="admin-empresa-popup-painel controle-dist-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        onClick={(evento) => evento.stopPropagation()}
      >
        <h2 id={tituloId} className="fonte-display text-2xl">{linha.nome}</h2>
        <p>{t('distAuto.configurarDica')}</p>

        {confirmando ? (
          <div className="controle-dist-confirmacao">
            <p>{t('distAuto.reiniciarAviso', { nome: linha.nome })}</p>
            {erro && <p role="alert" className="admin-empresa-popup-erro">{erro}</p>}
            <div className="admin-empresa-popup-acoes">
              <button
                type="button"
                className="btn-secundario"
                disabled={reiniciando}
                onClick={() => setConfirmando(false)}
              >
                {t('comum.cancelar')}
              </button>
              <button
                type="button"
                className="btn-ouro"
                disabled={reiniciando}
                onClick={() => void reiniciar()}
              >
                {reiniciando ? t('distAuto.reiniciando') : t('distAuto.reiniciarConfirmar')}
              </button>
            </div>
          </div>
        ) : (
          <form
            className="controle-dist-form"
            onSubmit={(evento) => evento.preventDefault()}
          >
            <label className="controle-dist-check">
              <input
                type="checkbox"
                checked={liberada}
                onChange={(evento) => setLiberada(evento.target.checked)}
              />
              {t('distAuto.permissao')}
            </label>
            <label className="block text-sm">
              {t('distAuto.quantidade')}
              <select
                className="campo mt-1"
                value={ilimitada ? 'ilimitada' : 'limite'}
                onChange={(evento) => setIlimitada(evento.target.value === 'ilimitada')}
              >
                <option value="ilimitada">{t('distAuto.ilimitado')}</option>
                <option value="limite">{t('distAuto.comLimite')}</option>
              </select>
            </label>
            {!ilimitada && (
              <label className="block text-sm">
                {t('distAuto.limite')}
                <input
                  className="campo mt-1"
                  type="number"
                  required
                  min={1}
                  max={1000000}
                  step={1}
                  value={limite}
                  onChange={(evento) => setLimite(evento.target.value)}
                />
              </label>
            )}
            <label className="block text-sm">
              {t('distAuto.periodo')}
              <select
                className="campo mt-1"
                value={periodo}
                onChange={(evento) => setPeriodo(evento.target.value as PeriodoDistribuicao)}
              >
                <option value="diario">{t('distAuto.diario')}</option>
                <option value="semanal">{t('distAuto.semanal')}</option>
                <option value="mensal">{t('distAuto.mensal')}</option>
              </select>
            </label>
            <div className="controle-dist-leitura">
              <div>
                <span>{t('distAuto.recebidas')}</span>
                <strong>{linha.recebidas}</strong>
              </div>
              <div>
                <span>{t('distAuto.restante')}</span>
                <strong>{linha.restante === null ? '—' : linha.restante}</strong>
              </div>
            </div>
            {erro && <p role="alert" className="admin-empresa-popup-erro">{erro}</p>}
            <div className="admin-empresa-popup-acoes">
              <button type="button" className="btn-secundario" onClick={() => setConfirmando(true)}>
                {t('distAuto.reiniciar')}
              </button>
              <button type="button" className="btn-secundario" onClick={onFechar}>
                {t('comum.fechar')}
              </button>
              <BotaoSalvar className="btn-ouro" aoSalvar={salvar} rotuloOk={t('comum.salvo')}>
                {t('comum.salvar')}
              </BotaoSalvar>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  )
}
