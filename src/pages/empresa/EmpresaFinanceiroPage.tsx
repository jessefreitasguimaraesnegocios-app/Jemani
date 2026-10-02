import { useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { usarIdioma } from '@/i18n/usarIdioma'
import { useDemoStore } from '@/store/demoStore'
import { formatarMoeda } from '@/utils/format'

export function EmpresaFinanceiroPage() {
  const { t, locale } = usarIdioma()
  const { usuario } = useAuth()
  const empresa = useDemoStore((s) => s.obterEmpresaDoUsuario(usuario?.id ?? ''))
  const todasComissoes = useDemoStore((s) => s.comissoes)
  const comissoes = useMemo(
    () => todasComissoes.filter((c) => c.empresa_id === empresa?.id),
    [todasComissoes, empresa?.id],
  )
  const viagens = useDemoStore((s) => s.viagens)

  const totalEmpresa = comissoes.reduce((a, c) => a + c.valor_empresa, 0)
  const totalPlat = comissoes.reduce((a, c) => a + c.valor_plataforma, 0)

  return (
    <div className="animar-entrada space-y-4">
      <h1 className="fonte-display text-3xl">{t('empresa.financeiro.titulo')}</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="cartao">
          <p className="text-sm text-[var(--color-slate)]">{t('admin.financeiro.valorEmpresas')}</p>
          <p className="fonte-display mt-2 text-3xl">{formatarMoeda(totalEmpresa, locale)}</p>
        </div>
        <div className="cartao">
          <p className="text-sm text-[var(--color-slate)]">{t('admin.financeiro.comissao')}</p>
          <p className="fonte-display mt-2 text-3xl">{formatarMoeda(totalPlat, locale)}</p>
        </div>
      </div>
      <div className="space-y-2">
        {comissoes.map((c) => {
          const v = viagens.find((x) => x.id === c.viagem_id)
          return (
            <div key={c.id} className="cartao flex justify-between text-sm">
              <span>{v?.codigo ?? c.viagem_id}</span>
              <span>{formatarMoeda(c.valor_empresa, locale)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
