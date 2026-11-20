import { useEffect, useState, type FormEvent } from 'react'
import { ArrowDown, ArrowUp, Ellipsis, X } from 'lucide-react'
import type { ChaveTraducao } from '@/i18n/mensagens'
import { usarIdioma } from '@/i18n/usarIdioma'
import { supabase } from '@/lib/supabase'
import type { Empresa } from '@/types'

type Regra = { company_id: string; quota: number; priority: boolean }
type Config = { enabled: boolean; default_quota: number; wait_minutes: number; rules: Regra[]; cycle: string }
type Progresso = { company_id: string; sent: number; pending: number; failed: number }
const COLUNAS_CONFIG = 'enabled,default_quota,wait_minutes,rules,cycle'

export function AutomacaoEmailsSolicitacoes({ empresas }: { empresas: Empresa[] }) {
  const { t } = usarIdioma()
  const [aberto, setAberto] = useState(false)
  const [config, setConfig] = useState<Config | null>(null)
  const [salva, setSalva] = useState<Config | null>(null)
  const [progresso, setProgresso] = useState<Progresso[]>([])
  const [empresaId, setEmpresaId] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<ChaveTraducao | null>(null)
  const [aviso, setAviso] = useState(false)
  const ciclo = salva?.cycle

  useEffect(() => {
    if (!aberto || config) return
    let ativo = true
    async function carregar() {
      setErro(null)
      const resposta = await supabase?.from('offer_email_automation')
        .select(COLUNAS_CONFIG).eq('id', true).single<Config>()
      if (!ativo) return
      if (!resposta?.data) {
        setErro('admin.automacao.indisponivel')
        return
      }
      setConfig(resposta.data)
      setSalva(resposta.data)
    }
    void carregar()
    return () => { ativo = false }
  }, [aberto, config])

  useEffect(() => {
    if (!aberto || !ciclo) return
    let ativo = true
    async function atualizar() {
      const resposta = await supabase?.rpc('progresso_email_oferta', { p_cycle: ciclo })
      if (ativo && resposta?.data) setProgresso(resposta.data as Progresso[])
    }
    void atualizar()
    const intervalo = window.setInterval(() => void atualizar(), 15_000)
    return () => {
      ativo = false
      window.clearInterval(intervalo)
    }
  }, [aberto, ciclo])

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!config || !salva || !supabase) return
    const db = supabase
    const submitter = (evento.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null
    const reiniciar = submitter?.value === 'reiniciar'
    if (reiniciar && !window.confirm(t('admin.automacao.confirmarReinicio'))) return
    setSalvando(true)
    setErro(null)
    setAviso(false)
    try {
      const dados = { ...config, cycle: reiniciar ? crypto.randomUUID() : config.cycle }
      const { data, error } = await db.from('offer_email_automation').update(dados)
        .eq('id', true).eq('cycle', salva.cycle)
        .select(COLUNAS_CONFIG).single<Config>()
      if (error || !data) throw error
      if (reiniciar) setProgresso([])
      setConfig(data)
      setSalva(data)
      setAviso(true)
    } catch {
      setErro('admin.automacao.erroSalvar')
    } finally {
      setSalvando(false)
    }
  }

  function alterarRegra(id: string, alteracao: Partial<Regra>) {
    setConfig((atual) => atual && {
      ...atual, rules: atual.rules.map((regra) => regra.company_id === id ? { ...regra, ...alteracao } : regra),
    })
  }

  function moverRegra(indice: number, passo: number) {
    if (!config) return
    const rules = [...config.rules]
    const destino = indice + passo
    const movida = rules[indice]
    rules[indice] = rules[destino]
    rules[destino] = movida
    setConfig({ ...config, rules })
  }

  const disponiveis = empresas.filter((empresa) => empresa.status === 'ativa' && empresa.habilitada_receber
    && !config?.rules.some((regra) => regra.company_id === empresa.id))
  const totais = progresso.reduce((total, item) => ({
    sent: total.sent + item.sent, pending: total.pending + item.pending, failed: total.failed + item.failed,
  }), { sent: 0, pending: 0, failed: 0 })

  return (
    <>
      <button type="button" className="btn-secundario admin-automacao-menu"
        aria-label={t('admin.automacao.titulo')} title={t('admin.automacao.titulo')}
        aria-expanded={aberto} aria-controls={aberto ? 'admin-automacao-emails' : undefined}
        disabled={salvando}
        onClick={() => {
          if (aberto) {
            setConfig(null)
            setSalva(null)
            setProgresso([])
            setAviso(false)
          }
          setAberto(!aberto)
        }}>
        <Ellipsis size={22} aria-hidden="true" />
      </button>
      {aberto && (
        <section id="admin-automacao-emails" className="cartao admin-automacao-painel" aria-labelledby="admin-automacao-titulo">
          <div>
            <h2 id="admin-automacao-titulo" className="fonte-display text-2xl">{t('admin.automacao.titulo')}</h2>
            <p className="admin-solicitacao-meta">{t('admin.automacao.ajuda')}</p>
          </div>
          {erro && <p role="alert" className="text-sm text-[var(--color-danger)]">{t(erro)}</p>}
          {aviso && <p role="status" className="text-sm text-[var(--color-success)]">{t('admin.automacao.salva')}</p>}
          {!config && !erro && <p role="status">{t('admin.automacao.carregando')}</p>}
          {config && (
            <form onSubmit={salvar}>
              <fieldset disabled={salvando} className="admin-automacao-campos">
                <div className="admin-automacao-linha">
                  <label className="admin-automacao-check">
                    <input role="switch" type="checkbox" checked={config.enabled}
                      onChange={(e) => setConfig({ ...config, enabled: e.target.checked })} />
                    {t('admin.automacao.ativar')}
                  </label>
                  <label className="admin-automacao-cota">
                    {t('admin.automacao.cotaPadrao')}
                    <input type="number" min={0} max={10000} required value={Number.isNaN(config.default_quota) ? '' : config.default_quota}
                      onChange={(e) => setConfig({ ...config, default_quota: e.target.valueAsNumber })} />
                  </label>
                  <label className="admin-automacao-cota">
                    {t('admin.automacao.intervalo')}
                    <input
                      type="number"
                      min={1}
                      max={1440}
                      required
                      value={Number.isNaN(config.wait_minutes) ? '' : config.wait_minutes}
                      onChange={(e) => setConfig({ ...config, wait_minutes: e.target.valueAsNumber })}
                    />
                  </label>
                </div>
                <div className="admin-automacao-linha">
                  <select aria-label={t('admin.automacao.empresa')} value={empresaId} onChange={(e) => setEmpresaId(e.target.value)}>
                    <option value="">{t('admin.automacao.empresa')}</option>
                    {disponiveis.map((empresa) => <option key={empresa.id} value={empresa.id}>{empresa.nome_comercial}</option>)}
                  </select>
                  <button type="button" className="btn-secundario !py-2" disabled={!empresaId}
                    onClick={() => {
                      setConfig({ ...config, rules: [...config.rules, { company_id: empresaId, quota: Number.isFinite(config.default_quota) ? config.default_quota : 3, priority: false }] })
                      setEmpresaId('')
                    }}>
                    {t('admin.automacao.adicionar')}
                  </button>
                </div>
                {config.rules.length > 0 && (
                  <ol className="admin-solicitacao-ranking">
                    {config.rules.map((regra, indice) => {
                      const nome = empresas.find((empresa) => empresa.id === regra.company_id)?.nome_comercial ?? t('admin.automacao.empresaIndisponivel')
                      const enviados = progresso.find((item) => item.company_id === regra.company_id)?.sent ?? 0
                      return (
                        <li key={regra.company_id} className="admin-solicitacao-ranking-item">
                          <div className="admin-solicitacao-ranking-info">
                            <strong>{nome}</strong>
                            <span>{t('admin.automacao.enviadosEmpresa', { n: enviados })}</span>
                          </div>
                          <div className="admin-automacao-linha">
                            <label className="admin-automacao-cota">
                              {t('admin.automacao.cota')}
                              <input type="number" min={0} max={10000} required value={Number.isNaN(regra.quota) ? '' : regra.quota}
                                onChange={(e) => alterarRegra(regra.company_id, { quota: e.target.valueAsNumber })} />
                            </label>
                            <label className="admin-automacao-check">
                              <input type="checkbox" checked={regra.priority}
                                onChange={(e) => alterarRegra(regra.company_id, { priority: e.target.checked })} />
                              {t('admin.automacao.prioridade')}
                            </label>
                            <div className="flex gap-1">
                              {([[-1, ArrowUp, 'subir'], [1, ArrowDown, 'descer']] as const).map(([passo, Icone, chave]) => (
                                <button key={chave} type="button" className="btn-secundario admin-automacao-icone"
                                  title={t(`admin.automacao.${chave}`, { nome })}
                                  aria-label={t(`admin.automacao.${chave}`, { nome })}
                                  disabled={indice + passo < 0 || indice + passo >= config.rules.length}
                                  onClick={() => moverRegra(indice, passo)}>
                                  <Icone size={16} aria-hidden="true" />
                                </button>
                              ))}
                              <button type="button" className="btn-secundario admin-automacao-icone"
                                aria-label={t('admin.automacao.remover', { nome })}
                                onClick={() => setConfig({ ...config, rules: config.rules.filter((item) => item.company_id !== regra.company_id) })}>
                                <X size={16} aria-hidden="true" />
                              </button>
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ol>
                )}
                <p className="admin-solicitacao-meta">{t('admin.automacao.progresso', totais)}</p>
                <div className="admin-automacao-linha">
                  <button type="submit" className="btn-ouro !py-2">{t('admin.automacao.salvar')}</button>
                  <button type="submit" value="reiniciar" className="btn-secundario !py-2" disabled={totais.pending > 0}>
                    {t('admin.automacao.reiniciar')}
                  </button>
                </div>
              </fieldset>
            </form>
          )}
        </section>
      )}
    </>
  )
}
