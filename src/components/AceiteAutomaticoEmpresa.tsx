import { useEffect, useId, useRef, useState } from 'react'
import { Ellipsis } from 'lucide-react'
import { BotaoSalvar } from '@/components/BotaoSalvar'
import { usarIdioma } from '@/i18n/usarIdioma'
import { supabase, supabaseConfigurado } from '@/lib/supabase'
import {
  buscarRegraAceite,
  contarAceitesAutomaticosHoje,
  liberarAceiteAutomatico,
  salvarRegraAceite,
  type RegraAceiteAutomatico,
} from '@/services/aceiteAutomatico'

type Carregamento = {
  regra: RegraAceiteAutomatico | null
  carregando: boolean
  falhou: boolean
}

function useRegraAceite(empresaId: string) {
  const [estado, setEstado] = useState<Carregamento>({ regra: null, carregando: true, falhou: false })

  useEffect(() => {
    const cliente = supabase
    if (!supabaseConfigurado || !cliente) return
    let ativo = true
    let requisicao = 0

    async function carregar() {
      const atual = ++requisicao
      try {
        const regra = await buscarRegraAceite(empresaId)
        if (ativo && atual === requisicao) setEstado({ regra, carregando: false, falhou: false })
      } catch {
        if (ativo && atual === requisicao) {
          setEstado({ regra: null, carregando: false, falhou: true })
        }
      }
    }

    void carregar()
    const canal = cliente.channel(`aceite-automatico:${empresaId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'company_auto_accept_settings',
        filter: `empresa_id=eq.${empresaId}`,
      }, () => void carregar())
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') void carregar()
      })
    window.addEventListener('focus', carregar)
    return () => {
      ativo = false
      window.removeEventListener('focus', carregar)
      void cliente.removeChannel(canal)
    }
  }, [empresaId])

  return { ...estado, setEstado }
}

export function LiberacaoAceiteAutomatico({ empresaId }: { empresaId: string }) {
  const { t } = usarIdioma()
  const { regra, carregando, falhou, setEstado } = useRegraAceite(empresaId)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(false)
  const liberada = regra?.liberada ?? false

  async function alternar() {
    setSalvando(true)
    setErro(false)
    try {
      const atual = await liberarAceiteAutomatico(empresaId, !liberada)
      setEstado({ regra: atual, carregando: false, falhou: false })
    } catch {
      setErro(true)
    } finally {
      setSalvando(false)
    }
  }

  if (!supabaseConfigurado) return null

  return (
    <section className="admin-empresa-bloco space-y-2">
      <h3>{t('aceiteAuto.titulo')}</h3>
      <p className="text-sm text-[var(--color-slate)]">{t('aceiteAuto.adminDica')}</p>
      <button type="button" className="btn-secundario" aria-pressed={liberada}
        disabled={carregando || salvando || falhou} onClick={() => void alternar()}>
        {t('aceiteAuto.liberar')}
      </button>
      <span className="ml-2 text-sm" role="status">
        {!carregando && !falhou && t(liberada ? 'aceiteAuto.liberada' : 'aceiteAuto.bloqueada')}
      </span>
      {(falhou || erro) && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">{t('aceiteAuto.erro')}</p>
      )}
    </section>
  )
}

export function OpcoesAceiteAutomatico({ empresaId }: { empresaId: string }) {
  const { t } = usarIdioma()
  const { regra } = useRegraAceite(empresaId)
  const [aberto, setAberto] = useState(false)
  const [aceitosHoje, setAceitosHoje] = useState<number | null>(null)
  const [pronto, setPronto] = useState(false)
  const abrirAposPronto = useRef(false)
  const id = useId()

  useEffect(() => {
    if (!regra?.liberada) {
      setPronto(false)
      setAceitosHoje(null)
      return
    }

    const liberada = regra.liberada
    const limiteDiario = regra.limite_diario
    let ativo = true
    setPronto(false)

    async function preparar() {
      if (!liberada) return
      if (limiteDiario === null) {
        if (!ativo) return
        setAceitosHoje(null)
        setPronto(true)
        return
      }
      try {
        const n = await contarAceitesAutomaticosHoje(empresaId)
        if (!ativo) return
        setAceitosHoje(n)
      } catch {
        if (!ativo) return
        setAceitosHoje(null)
      } finally {
        if (ativo) setPronto(true)
      }
    }

    void preparar()
    return () => {
      ativo = false
    }
  }, [empresaId, regra?.liberada, regra?.limite_diario])

  useEffect(() => {
    if (!abrirAposPronto.current || !pronto || !regra?.liberada) return
    abrirAposPronto.current = false
    setAberto(true)
  }, [pronto, regra?.liberada])

  if (!regra?.liberada) return null

  function alternarPainel() {
    if (aberto) {
      setAberto(false)
      return
    }
    if (pronto) {
      setAberto(true)
      return
    }
    abrirAposPronto.current = true
  }

  return (
    <div className="relative shrink-0 self-start">
      <button
        type="button"
        className="btn-secundario inline-flex size-10 shrink-0 items-center justify-center !p-0"
        aria-label={t('aceiteAuto.titulo')}
        aria-expanded={aberto}
        aria-controls={aberto ? id : undefined}
        aria-busy={!pronto}
        onClick={alternarPainel}
      >
        <Ellipsis size={22} aria-hidden="true" />
      </button>
      {aberto && pronto && (
        <div className="absolute right-0 top-full z-30 mt-2 w-[min(22rem,calc(100vw-3rem))]">
          <section id={id} aria-label={t('aceiteAuto.titulo')} className="cartao">
            <FormularioAceiteAutomatico
              regra={regra}
              aceitosIniciais={aceitosHoje}
              aoAtualizarAceitos={setAceitosHoje}
            />
          </section>
        </div>
      )}
    </div>
  )
}

function FormularioAceiteAutomatico({
  regra,
  aceitosIniciais,
  aoAtualizarAceitos,
}: {
  regra: RegraAceiteAutomatico
  aceitosIniciais: number | null
  aoAtualizarAceitos: (n: number | null) => void
}) {
  const { t } = usarIdioma()
  const [ligada, setLigada] = useState(regra.ligada)
  const [minimo, setMinimo] = useState(String(regra.valor_minimo_usd))
  const [todos, setTodos] = useState(regra.limite_diario === null)
  const [limite, setLimite] = useState(String(regra.limite_diario ?? 10))
  const [erro, setErro] = useState(false)
  const [aceitosHoje, setAceitosHoje] = useState<number | null>(aceitosIniciais)

  useEffect(() => {
    setLigada(regra.ligada)
    setMinimo(String(regra.valor_minimo_usd))
    setTodos(regra.limite_diario === null)
    setLimite(String(regra.limite_diario ?? 10))
  }, [regra.empresa_id, regra.ligada, regra.limite_diario, regra.liberada, regra.valor_minimo_usd])

  useEffect(() => {
    setAceitosHoje(aceitosIniciais)
  }, [aceitosIniciais])

  useEffect(() => {
    if (todos) {
      setAceitosHoje(null)
      return
    }
    if (aceitosHoje !== null) return
    let ativo = true
    void contarAceitesAutomaticosHoje(regra.empresa_id)
      .then((n) => {
        if (!ativo) return
        setAceitosHoje(n)
      })
      .catch(() => {
        if (!ativo) return
        setAceitosHoje(null)
      })
    return () => {
      ativo = false
    }
  }, [aceitosHoje, regra.empresa_id, todos])

  async function salvar() {
    setErro(false)
    try {
      await salvarRegraAceite({
        ...regra,
        ligada,
        valor_minimo_usd: Number(minimo),
        limite_diario: todos ? null : Number(limite),
      })
      if (!todos) {
        const n = await contarAceitesAutomaticosHoje(regra.empresa_id)
        setAceitosHoje(n)
        aoAtualizarAceitos(n)
      } else {
        setAceitosHoje(null)
        aoAtualizarAceitos(null)
      }
    } catch {
      setErro(true)
      throw new Error('falha_salvar_aceite')
    }
  }

  const limiteNum = Number(limite)
  const mostrarContagem = !todos && aceitosHoje !== null && Number.isFinite(limiteNum) && limiteNum > 0

  return (
    <form
      className="space-y-3"
      onSubmit={(evento) => {
        evento.preventDefault()
      }}
    >
      <h2 className="fonte-display text-xl">{t('aceiteAuto.titulo')}</h2>
      <fieldset className="space-y-3">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={ligada} onChange={(e) => setLigada(e.target.checked)} />
          {t('aceiteAuto.ativar')}
        </label>
        <label className="block text-sm">
          {t('aceiteAuto.minimo')}
          <input className="campo mt-1" type="number" required min={0} max={9999999999.99}
            step="0.01" value={minimo} onChange={(e) => setMinimo(e.target.value)} />
        </label>
        <label className="block text-sm">
          {t('aceiteAuto.quantidade')}
          <select className="campo mt-1" value={todos ? 'todas' : 'limite'}
            onChange={(e) => setTodos(e.target.value === 'todas')}>
            <option value="todas">{t('aceiteAuto.todas')}</option>
            <option value="limite">{t('aceiteAuto.comLimite')}</option>
          </select>
        </label>
        {!todos && (
          <label className="block text-sm">
            {t('aceiteAuto.limite')}
            <input className="campo mt-1" type="number" required min={1} max={2147483647}
              step={1} value={limite} onChange={(e) => setLimite(e.target.value)} />
            <p
              className="mt-1.5 min-h-[1.25rem] text-sm text-[var(--color-slate)]"
              role="status"
            >
              {mostrarContagem
                ? t('aceiteAuto.usoHoje', { usados: aceitosHoje!, max: limiteNum })
                : '\u00a0'}
            </p>
          </label>
        )}
      </fieldset>
      <p className="text-sm text-[var(--color-slate)]">{t('aceiteAuto.dica')}</p>
      <BotaoSalvar className="btn-ouro" aoSalvar={salvar} rotuloOk={t('comum.salvo')}>
        {t('comum.salvar')}
      </BotaoSalvar>
      {erro && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">{t('aceiteAuto.erro')}</p>
      )}
    </form>
  )
}
