import { useEffect, useId, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Ellipsis } from 'lucide-react'
import { BotaoSalvar } from '@/components/BotaoSalvar'
import '@/components/BadgeStatus.css'
import { usarIdioma } from '@/i18n/usarIdioma'
import type { ChaveTraducao } from '@/i18n/mensagens'
import { supabaseConfigurado } from '@/lib/supabase'
import {
  configurarQuedaLocal,
  definirModoQuedaLocal,
  definirOrdensQuedaLocal,
  listarQuedaLocal,
  reiniciarQuedaLocal,
  voltaQueda,
  type ConfiguracaoQueda,
  type LinhaQueda,
  type ModoQueda,
  type PrioridadeQueda,
} from '@/services/quedaCorridas'
import {
  configurarQuedaNuvem,
  definirModoQuedaNuvem,
  definirOrdensQuedaNuvem,
  listarControleQuedaNuvem,
  obterModoQuedaNuvem,
  quedaNuvemAusente,
  reiniciarQuedaNuvem,
} from '@/services/quedaCorridasNuvem'
import type { PeriodoDistribuicao } from '@/services/rodizioDistribuicao'
import { useDemoStore } from '@/store/demoStore'
import './AdminControleDistribuicao.css'
import './AdminQuedaCorridas.css'

const MODOS: ModoQueda[] = ['rodizio', 'prioridade', 'destaque']
const INTERVALOS = [null, 15, 30, 60, 120, 240] as const

function textoLimite(linha: LinhaQueda, t: (chave: ChaveTraducao) => string) {
  if (linha.ilimitada || linha.limite === null) return t('queda.ilimitado')
  const periodo =
    linha.periodo === 'semanal'
      ? t('queda.porSemana')
      : linha.periodo === 'mensal'
        ? t('queda.porMes')
        : t('queda.porDia')
  return `${linha.limite} ${periodo}`
}

function textoIntervalo(minutos: number | null, t: (chave: ChaveTraducao) => string) {
  if (!minutos) return t('queda.semIntervalo')
  if (minutos === 15) return t('queda.min15')
  if (minutos === 30) return t('queda.min30')
  if (minutos === 60) return t('queda.hora1')
  if (minutos === 120) return t('queda.hora2')
  return t('queda.hora4')
}

function textoPrioridade(prioridade: number, t: (chave: ChaveTraducao) => string) {
  if (prioridade >= 3) return t('queda.maxima')
  if (prioridade === 2) return t('queda.alta')
  return t('queda.normal')
}

function limiteInformado(texto: string) {
  if (!/^\d+$/.test(texto)) return null
  const valor = Number(texto)
  if (valor < 1 || valor > 1000000) return null
  return valor
}

export function AdminQuedaCorridas() {
  const { t } = usarIdioma()
  const empresas = useDemoStore((s) => s.empresas)
  const nuvem = supabaseConfigurado
  const [modo, setModo] = useState<ModoQueda>('rodizio')
  const [linhas, setLinhas] = useState<LinhaQueda[] | null>(null)
  const [carregando, setCarregando] = useState(nuvem)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [aberta, setAberta] = useState<LinhaQueda | null>(null)

  const empresasBase = useMemo(
    () => empresas.map((empresa) => ({ id: empresa.id, nome: empresa.nome_comercial })),
    [empresas],
  )

  function aplicarLocal() {
    const painel = listarQuedaLocal(empresasBase)
    setModo(painel.modo)
    setLinhas(painel.linhas)
    setAberta((atual) =>
      atual ? painel.linhas.find((linha) => linha.empresaId === atual.empresaId) ?? atual : null,
    )
  }

  useEffect(() => {
    if (nuvem) return
    aplicarLocal()
    setCarregando(false)
  }, [empresasBase, nuvem])

  useEffect(() => {
    if (!nuvem) return
    let ativo = true
    async function carregar() {
      try {
        const [lista, modoAtual] = await Promise.all([
          listarControleQuedaNuvem(),
          obterModoQuedaNuvem(),
        ])
        if (!ativo) return
        setLinhas(lista)
        setModo(modoAtual)
        setErro('')
        setAberta((atual) =>
          atual ? lista.find((linha) => linha.empresaId === atual.empresaId) ?? atual : null,
        )
      } catch (falha) {
        if (!ativo) return
        setErro(
          quedaNuvemAusente(falha)
            ? t('queda.semMigracao')
            : falha instanceof Error && falha.message
              ? falha.message
              : t('queda.erro'),
        )
      } finally {
        if (ativo) setCarregando(false)
      }
    }
    void carregar()
    return () => {
      ativo = false
    }
  }, [nuvem, t])

  const ordenadas = linhas ?? []
  const nomes = useMemo(
    () => new Map(ordenadas.map((linha) => [linha.empresaId, linha.nome])),
    [ordenadas],
  )
  const volta = useMemo(() => voltaQueda(ordenadas, modo), [ordenadas, modo])
  const resumo = useMemo(
    () =>
      ordenadas.reduce(
        (acc, linha) => {
          acc.periodo += linha.recebidas
          acc.historico += linha.recebidasTotal
          if (linha.limiteAtingido) acc.atingidas += 1
          if (linha.podeReceber) acc.disponiveis += 1
          return acc
        },
        { periodo: 0, historico: 0, atingidas: 0, disponiveis: 0 },
      ),
    [ordenadas],
  )

  async function trocarModo(proximo: ModoQueda) {
    setAviso('')
    try {
      if (nuvem) await definirModoQuedaNuvem(proximo)
      else definirModoQuedaLocal(proximo)
      setModo(proximo)
      if (!nuvem) aplicarLocal()
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : t('queda.erro'))
    }
  }

  async function mover(empresaId: string, direcao: 'subir' | 'descer') {
    const ids = ordenadas.map((linha) => linha.empresaId)
    const indice = ids.indexOf(empresaId)
    const destino = direcao === 'subir' ? indice - 1 : indice + 1
    if (indice < 0 || destino < 0 || destino >= ids.length) return
    const copia = [...ids]
    const [item] = copia.splice(indice, 1)
    copia.splice(destino, 0, item)
    try {
      if (nuvem) await definirOrdensQuedaNuvem(copia)
      else definirOrdensQuedaLocal(copia)
      if (nuvem) {
        setLinhas(await listarControleQuedaNuvem())
      } else {
        aplicarLocal()
      }
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : t('queda.erro'))
    }
  }

  async function salvar(empresaId: string, nome: string, config: ConfiguracaoQueda) {
    if (nuvem) await configurarQuedaNuvem(empresaId, config)
    else configurarQuedaLocal(empresaId, nome, config)
    if (nuvem) setLinhas(await listarControleQuedaNuvem())
    else aplicarLocal()
    setAviso(t('queda.salvo', { nome }))
  }

  async function reiniciar(empresaId: string, nome: string) {
    if (nuvem) await reiniciarQuedaNuvem(empresaId)
    else reiniciarQuedaLocal(empresaId)
    if (nuvem) setLinhas(await listarControleQuedaNuvem())
    else aplicarLocal()
    setAviso(t('queda.reiniciado', { nome }))
  }

  return (
    <section className="controle-dist">
      <div className="controle-dist-intro">
        <h2 className="fonte-display text-2xl">{t('queda.titulo')}</h2>
        <p className="text-sm text-[var(--color-slate)]">{t('queda.sub')}</p>
        <p className="controle-dist-fuso">{t('queda.fuso')}</p>
      </div>

      <div className="queda-modos" role="tablist" aria-label={t('queda.modo')}>
        {MODOS.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={modo === item}
            className={`queda-modo ${modo === item ? 'queda-modo--ativo' : ''}`}
            onClick={() => void trocarModo(item)}
          >
            <strong>{t(`queda.modo.${item}` as ChaveTraducao)}</strong>
            <span>{t(`queda.modoDica.${item}` as ChaveTraducao)}</span>
          </button>
        ))}
      </div>

      {volta.length > 0 && (
        <p className="queda-volta">
          {t('queda.volta')}{' '}
          {volta.map((id) => nomes.get(id) ?? id).join(' → ')}
        </p>
      )}

      {!nuvem && <p className="controle-dist-aviso">{t('queda.demo')}</p>}
      {erro && <p role="alert" className="text-sm text-[var(--color-danger)]">{erro}</p>}
      {aviso && <p role="status" className="text-sm text-[var(--color-success)]">{aviso}</p>}

      <div className="controle-dist-resumo">
        <article className="cartao controle-dist-resumo-item">
          <strong>{resumo.periodo}</strong>
          <span>{t('queda.totalPeriodo')}</span>
        </article>
        <article className="cartao controle-dist-resumo-item">
          <strong>{resumo.atingidas}</strong>
          <span>{t('queda.atingidas')}</span>
        </article>
        <article className="cartao controle-dist-resumo-item">
          <strong>{resumo.disponiveis}</strong>
          <span>{t('queda.disponiveis')}</span>
        </article>
        <article className="cartao controle-dist-resumo-item">
          <strong>{resumo.historico}</strong>
          <span>{t('queda.totalHistorico')}</span>
        </article>
      </div>

      <div className="cartao controle-dist-tabela-wrap">
        {carregando && <p className="text-sm text-[var(--color-slate)]">{t('queda.carregando')}</p>}
        {!carregando && !erro && ordenadas.length === 0 && (
          <p className="text-sm text-[var(--color-slate)]">{t('queda.vazio')}</p>
        )}
        {ordenadas.length > 0 && (
          <table className="controle-dist-tabela">
            <thead>
              <tr>
                <th>{t('queda.colEmpresa')}</th>
                <th>{t('queda.colFila')}</th>
                <th>{t('queda.colLimite')}</th>
                <th>{t('queda.colIntervalo')}</th>
                <th>{t('queda.colPrioridade')}</th>
                <th>{t('queda.colRecebidas')}</th>
                <th>{t('queda.colRestante')}</th>
                <th>{t('queda.colStatus')}</th>
                <th className="controle-dist-acoes">
                  <span className="controle-dist-so-leitor">{t('queda.colAcoes')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {ordenadas.map((linha) => (
                <tr key={linha.empresaId}>
                  <td>
                    <span className="controle-dist-rotulo">{t('queda.colEmpresa')}</span>
                    <span className="controle-dist-nome">{linha.nome}</span>
                  </td>
                  <td>
                    <span className="controle-dist-rotulo">{t('queda.colFila')}</span>
                    <span className={`badge-status ${linha.participa ? 'badge-status--ok' : 'badge-status--neutro'}`}>
                      {t(linha.participa ? 'queda.naFila' : 'queda.fora')}
                    </span>
                  </td>
                  <td>
                    <span className="controle-dist-rotulo">{t('queda.colLimite')}</span>
                    {textoLimite(linha, t)}
                  </td>
                  <td>
                    <span className="controle-dist-rotulo">{t('queda.colIntervalo')}</span>
                    {textoIntervalo(linha.intervaloMinutos, t)}
                  </td>
                  <td>
                    <span className="controle-dist-rotulo">{t('queda.colPrioridade')}</span>
                    {textoPrioridade(linha.prioridade, t)}
                  </td>
                  <td>
                    <span className="controle-dist-rotulo">{t('queda.colRecebidas')}</span>
                    {linha.recebidas}
                  </td>
                  <td>
                    <span className="controle-dist-rotulo">{t('queda.colRestante')}</span>
                    {linha.restante === null ? '—' : linha.restante}
                  </td>
                  <td>
                    <span className="controle-dist-rotulo">{t('queda.colStatus')}</span>
                    <span className={`badge-status ${linha.podeReceber ? 'badge-status--ok' : 'badge-status--erro'}`}>
                      {t(linha.podeReceber ? 'queda.disponivel' : linha.limiteAtingido ? 'queda.atingido' : 'queda.espera')}
                    </span>
                  </td>
                  <td className="controle-dist-acoes">
                    <button
                      type="button"
                      className="btn-secundario inline-flex size-10 items-center justify-center !p-0"
                      aria-label={t('queda.abrir', { nome: linha.nome })}
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
        <DialogoQueda
          key={aberta.empresaId}
          linha={aberta}
          podeSubir={ordenadas[0]?.empresaId !== aberta.empresaId}
          podeDescer={ordenadas[ordenadas.length - 1]?.empresaId !== aberta.empresaId}
          onMover={(direcao) => void mover(aberta.empresaId, direcao)}
          onFechar={() => setAberta(null)}
          onSalvar={(config) => salvar(aberta.empresaId, aberta.nome, config)}
          onReiniciar={() => reiniciar(aberta.empresaId, aberta.nome)}
        />
      )}
    </section>
  )
}

function DialogoQueda({
  linha,
  podeSubir,
  podeDescer,
  onMover,
  onFechar,
  onSalvar,
  onReiniciar,
}: {
  linha: LinhaQueda
  podeSubir: boolean
  podeDescer: boolean
  onMover: (direcao: 'subir' | 'descer') => void
  onFechar: () => void
  onSalvar: (config: ConfiguracaoQueda) => Promise<void>
  onReiniciar: () => Promise<void>
}) {
  const { t } = usarIdioma()
  const tituloId = useId()
  const [participa, setParticipa] = useState(linha.participa)
  const [ilimitada, setIlimitada] = useState(linha.ilimitada)
  const [limite, setLimite] = useState(linha.limite ? String(linha.limite) : '5')
  const [periodo, setPeriodo] = useState<PeriodoDistribuicao>(linha.periodo)
  const [intervalo, setIntervalo] = useState(linha.intervaloMinutos ? String(linha.intervaloMinutos) : '')
  const [prioridade, setPrioridade] = useState<PrioridadeQueda>(linha.prioridade)
  const [erro, setErro] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const [reiniciando, setReiniciando] = useState(false)

  async function salvar() {
    const numero = ilimitada ? null : limiteInformado(limite)
    if (!ilimitada && numero === null) {
      setErro(t('queda.limiteInvalido'))
      return
    }
    setErro('')
    await onSalvar({
      participa,
      ilimitada,
      limite: numero,
      periodo,
      intervaloMinutos: intervalo ? Number(intervalo) : null,
      prioridade,
    })
    onFechar()
  }

  async function reiniciar() {
    setReiniciando(true)
    setErro('')
    try {
      await onReiniciar()
      setConfirmando(false)
      onFechar()
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : t('queda.erro'))
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
        <p>{t('queda.configurarDica')}</p>
        {confirmando ? (
          <div className="controle-dist-confirmacao">
            <p>{t('queda.reiniciarAviso', { nome: linha.nome })}</p>
            {erro && <p role="alert" className="admin-empresa-popup-erro">{erro}</p>}
            <div className="admin-empresa-popup-acoes">
              <button type="button" className="btn-secundario" disabled={reiniciando} onClick={() => setConfirmando(false)}>
                {t('comum.cancelar')}
              </button>
              <button type="button" className="btn-ouro" disabled={reiniciando} onClick={() => void reiniciar()}>
                {reiniciando ? t('queda.reiniciando') : t('queda.reiniciarConfirmar')}
              </button>
            </div>
          </div>
        ) : (
          <form className="controle-dist-form" onSubmit={(evento) => evento.preventDefault()}>
            <label className="controle-dist-check">
              <input type="checkbox" checked={participa} onChange={(evento) => setParticipa(evento.target.checked)} />
              {t('queda.participa')}
            </label>
            <label className="block text-sm">
              {t('queda.quantidade')}
              <select
                className="campo mt-1"
                value={ilimitada ? 'ilimitada' : 'limite'}
                onChange={(evento) => setIlimitada(evento.target.value === 'ilimitada')}
              >
                <option value="ilimitada">{t('queda.ilimitado')}</option>
                <option value="limite">{t('queda.comLimite')}</option>
              </select>
            </label>
            {!ilimitada && (
              <label className="block text-sm">
                {t('queda.limite')}
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
              {t('queda.periodo')}
              <select
                className="campo mt-1"
                value={periodo}
                onChange={(evento) => setPeriodo(evento.target.value as PeriodoDistribuicao)}
              >
                <option value="diario">{t('queda.diario')}</option>
                <option value="semanal">{t('queda.semanal')}</option>
                <option value="mensal">{t('queda.mensal')}</option>
              </select>
            </label>
            <label className="block text-sm">
              {t('queda.intervalo')}
              <select className="campo mt-1" value={intervalo} onChange={(evento) => setIntervalo(evento.target.value)}>
                {INTERVALOS.map((item) => (
                  <option key={item ?? 'nenhum'} value={item ?? ''}>
                    {textoIntervalo(item, t)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              {t('queda.prioridade')}
              <select
                className="campo mt-1"
                value={prioridade}
                onChange={(evento) => setPrioridade(Number(evento.target.value) as PrioridadeQueda)}
              >
                <option value={1}>{t('queda.normal')}</option>
                <option value={2}>{t('queda.alta')}</option>
                <option value={3}>{t('queda.maxima')}</option>
              </select>
            </label>
            <div className="queda-ordem">
              <span>{t('queda.posicao')}</span>
              <button type="button" className="btn-secundario" disabled={!podeSubir} onClick={() => onMover('subir')}>
                {t('queda.subir')}
              </button>
              <button type="button" className="btn-secundario" disabled={!podeDescer} onClick={() => onMover('descer')}>
                {t('queda.descer')}
              </button>
            </div>
            <div className="controle-dist-leitura">
              <div>
                <span>{t('queda.recebidas')}</span>
                <strong>{linha.recebidas}</strong>
              </div>
              <div>
                <span>{t('queda.restante')}</span>
                <strong>{linha.restante === null ? '—' : linha.restante}</strong>
              </div>
            </div>
            {erro && <p role="alert" className="admin-empresa-popup-erro">{erro}</p>}
            <div className="admin-empresa-popup-acoes">
              <button type="button" className="btn-secundario" onClick={() => setConfirmando(true)}>
                {t('queda.reiniciar')}
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
