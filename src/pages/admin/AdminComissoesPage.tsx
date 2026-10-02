import { useMemo, useState, type FormEvent } from 'react'
import { usarIdioma } from '@/i18n/usarIdioma'
import { lerComissaoPadrao } from '@/services/comissaoService'
import { useDemoStore } from '@/store/demoStore'
import { formatarMoeda } from '@/utils/format'
import './AdminComissoesPage.css'

export function AdminComissoesPage() {
  const { t, locale } = usarIdioma()
  const configuracoes = useDemoStore((s) => s.configuracoes)
  const atualizarConfiguracao = useDemoStore((s) => s.atualizarConfiguracao)
  const aplicarComissaoTodasEmpresas = useDemoStore((s) => s.aplicarComissaoTodasEmpresas)
  const salvarEmpresa = useDemoStore((s) => s.salvarEmpresa)
  const empresas = useDemoStore((s) => s.empresas)
  const comissoes = useDemoStore((s) => s.comissoes)
  const viagens = useDemoStore((s) => s.viagens)

  const padraoAtual = lerComissaoPadrao(configuracoes)
  const [padrao, setPadrao] = useState(String(padraoAtual))
  const [rascunhos, setRascunhos] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState('')

  const empresasOrdenadas = useMemo(
    () =>
      [...empresas].sort((a, b) => a.nome_comercial.localeCompare(b.nome_comercial, 'pt-BR')),
    [empresas],
  )

  const mapaViagens = useMemo(() => new Map(viagens.map((v) => [v.id, v])), [viagens])

  const historicoPorEmpresa = useMemo(() => {
    const mapa = new Map<
      string,
      {
        empresaId: string
        nome: string
        itens: Array<{ id: string; codigo: string; percentual: number; valorPlat: number; valorEmp: number; total: number }>
        totalPlat: number
        totalEmp: number
      }
    >()
    for (const c of comissoes) {
      const empresa = empresas.find((e) => e.id === c.empresa_id)
      const atual = mapa.get(c.empresa_id) ?? {
        empresaId: c.empresa_id,
        nome: empresa?.nome_comercial ?? 'Empresa',
        itens: [],
        totalPlat: 0,
        totalEmp: 0,
      }
      atual.itens.push({
        id: c.id,
        codigo: mapaViagens.get(c.viagem_id)?.codigo ?? c.viagem_id.slice(0, 8),
        percentual: c.percentual,
        valorPlat: c.valor_plataforma,
        valorEmp: c.valor_empresa,
        total: c.valor_viagem,
      })
      atual.totalPlat += c.valor_plataforma
      atual.totalEmp += c.valor_empresa
      mapa.set(c.empresa_id, atual)
    }
    return [...mapa.values()].sort((a, b) => b.totalPlat - a.totalPlat)
  }, [comissoes, empresas, mapaViagens])

  function valorCampo(empresaId: string, atual?: number) {
    return rascunhos[empresaId] ?? String(atual ?? padraoAtual)
  }

  function salvarPadrao(e: FormEvent) {
    e.preventDefault()
    atualizarConfiguracao('comissao_percentual', padrao)
    setMsg(`Padrão da plataforma salvo em ${padrao}%. Novas empresas e corridas sem % própria usam este valor.`)
  }

  function aplicarTodas() {
    const pct = Number(padrao)
    if (Number.isNaN(pct) || pct < 0 || pct > 100) {
      setMsg('Informe um percentual entre 0 e 100.')
      return
    }
    atualizarConfiguracao('comissao_percentual', String(pct))
    aplicarComissaoTodasEmpresas(pct)
    setRascunhos({})
    setMsg(`Todas as empresas passaram a usar ${pct}%.`)
  }

  function salvarEmpresaPct(empresaId: string) {
    const bruto = valorCampo(
      empresaId,
      empresas.find((e) => e.id === empresaId)?.comissao_percentual,
    )
    const pct = Number(bruto)
    if (Number.isNaN(pct) || pct < 0 || pct > 100) {
      setMsg('Percentual inválido (0 a 100).')
      return
    }
    const empresa = salvarEmpresa({ id: empresaId, comissao_percentual: pct })
    setRascunhos((atual) => {
      const proximo = { ...atual }
      delete proximo[empresaId]
      return proximo
    })
    setMsg(`Comissão de ${empresa.nome_comercial} salva em ${pct}%.`)
  }

  return (
    <div className="animar-entrada space-y-6">
      <div className="comissoes-topo">
        <div>
          <h1 className="fonte-display text-3xl">{t('admin.comissoes.titulo')}</h1>
          <p className="comissoes-sub">{t('admin.comissoes.sub')}</p>
        </div>
      </div>

      <form className="cartao comissoes-padrao" onSubmit={salvarPadrao}>
        <h2 className="fonte-display text-2xl">{t('admin.comissoes.padrao')}</h2>
        <div className="comissoes-padrao-linha">
          <div>
            <label className="rotulo" htmlFor="comissao-padrao">
              Comissão padrão (%)
            </label>
            <input
              id="comissao-padrao"
              className="campo"
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={padrao}
              onChange={(e) => setPadrao(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primario">
            Salvar padrão
          </button>
          <button type="button" className="btn-ouro" onClick={aplicarTodas}>
            {t('admin.comissoes.aplicarTodas')}
          </button>
        </div>
        <p className="comissoes-dica">
          “Salvar padrão” só define o valor global. “Aplicar a todas” copia esse % para cada
          empresa. Corridas já finalizadas mantêm o percentual registrado na época.
        </p>
      </form>

      {msg && (
        <div className="cartao">
          <p className="text-sm text-[var(--color-success)]">{msg}</p>
        </div>
      )}

      <section className="space-y-3">
        <h2 className="fonte-display text-2xl">{t('admin.comissoes.porEmpresa')}</h2>
        <div className="comissoes-empresas">
          {empresasOrdenadas.map((empresa) => {
            const pctAtual = empresa.comissao_percentual ?? padraoAtual
            const igualPadrao = Number(pctAtual) === Number(padraoAtual)
            return (
              <div key={empresa.id} className="cartao comissoes-empresa">
                <div className="comissoes-empresa-info">
                  <p className="font-medium">{empresa.nome_comercial}</p>
                  <p className="comissoes-empresa-meta">
                    {empresa.cidade} · {empresa.status}
                    {igualPadrao ? ' · igual ao padrão' : ' · personalizada'}
                  </p>
                </div>
                <div className="comissoes-empresa-acoes">
                  {!igualPadrao && <span className="comissoes-selo">Personalizada</span>}
                  <input
                    className="campo"
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    aria-label={`Comissão de ${empresa.nome_comercial}`}
                    value={valorCampo(empresa.id, empresa.comissao_percentual)}
                    onChange={(e) =>
                      setRascunhos((atual) => ({ ...atual, [empresa.id]: e.target.value }))
                    }
                  />
                  <button
                    type="button"
                    className="btn-secundario !py-2"
                    onClick={() => salvarEmpresaPct(empresa.id)}
                  >
                    Salvar
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="fonte-display text-2xl">{t('admin.comissoes.historico')}</h2>
        {historicoPorEmpresa.length === 0 ? (
          <div className="cartao">
            <p className="comissoes-vazio">Nenhuma comissão de corrida finalizada ainda.</p>
          </div>
        ) : (
          <div className="comissoes-historico">
            {historicoPorEmpresa.map((grupo) => (
              <div key={grupo.empresaId} className="cartao comissoes-grupo">
                <div className="comissoes-grupo-cabeca">
                  <h3 className="font-medium">{grupo.nome}</h3>
                  <p className="comissoes-grupo-totais">
                    Plataforma {formatarMoeda(grupo.totalPlat, locale)} · Empresa{' '}
                    {formatarMoeda(grupo.totalEmp, locale)}
                  </p>
                </div>
                {grupo.itens.map((item) => (
                  <div key={item.id} className="comissoes-item">
                    <div>
                      <p className="font-medium">{item.codigo}</p>
                      <p className="comissoes-item-meta">
                        {formatarMoeda(item.total, locale)} · {item.percentual}%
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p>Plat. {formatarMoeda(item.valorPlat, locale)}</p>
                      <p className="comissoes-item-meta">Emp. {formatarMoeda(item.valorEmp, locale)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
