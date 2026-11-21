import { useEffect, useId, useState, type FormEvent } from 'react'
import { Ellipsis } from 'lucide-react'
import { usarIdioma } from '@/i18n/usarIdioma'
import { supabase, supabaseConfigurado } from '@/lib/supabase'
import {
  buscarRegraAceite,
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
  const id = useId()

  if (!regra?.liberada) return null

  return (
    <div className="relative">
      <button
        type="button"
        className="btn-secundario inline-flex items-center justify-center !p-2"
        aria-label={t('aceiteAuto.titulo')}
        aria-expanded={aberto}
        aria-controls={aberto ? id : undefined}
        onClick={() => setAberto(!aberto)}
      >
        <Ellipsis size={22} aria-hidden="true" />
      </button>
      {aberto && (
        <section id={id} aria-label={t('aceiteAuto.titulo')}
          className="cartao absolute right-0 top-full z-20 mt-2 w-[min(22rem,calc(100vw-3rem))]">
          <FormularioAceiteAutomatico regra={regra} />
        </section>
      )}
    </div>
  )
}

function FormularioAceiteAutomatico({ regra }: { regra: RegraAceiteAutomatico }) {
  const { t } = usarIdioma()
  const [ligada, setLigada] = useState(regra.ligada)
  const [minimo, setMinimo] = useState(String(regra.valor_minimo_usd))
  const [todos, setTodos] = useState(regra.limite_diario === null)
  const [limite, setLimite] = useState(String(regra.limite_diario ?? 10))
  const [salvando, setSalvando] = useState(false)
  const [retorno, setRetorno] = useState<'salvo' | 'erro' | null>(null)

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setSalvando(true)
    setRetorno(null)
    try {
      await salvarRegraAceite({
        ...regra,
        ligada,
        valor_minimo_usd: Number(minimo),
        limite_diario: todos ? null : Number(limite),
      })
      setRetorno('salvo')
    } catch {
      setRetorno('erro')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <form className="space-y-3" onSubmit={(evento) => void salvar(evento)}>
      <h2 className="fonte-display text-xl">{t('aceiteAuto.titulo')}</h2>
      <fieldset disabled={salvando} className="space-y-3">
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
          </label>
        )}
      </fieldset>
      <p className="text-sm text-[var(--color-slate)]">{t('aceiteAuto.dica')}</p>
      <button type="submit" className="btn-ouro" disabled={salvando}>{t('comum.salvar')}</button>
      {retorno === 'salvo' && <p role="status" className="text-sm">{t('aceiteAuto.salvo')}</p>}
      {retorno === 'erro' && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">{t('aceiteAuto.erro')}</p>
      )}
    </form>
  )
}
