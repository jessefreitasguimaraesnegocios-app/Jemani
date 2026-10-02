import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { usarIdioma } from '@/i18n/usarIdioma'
import { agruparCorridasPorCliente, montarResumoHistorico } from '@/services/historicoCorridas'
import { useDemoStore } from '@/store/demoStore'
import './AdminClientesPage.css'

export function AdminClientesPage() {
  const { t } = usarIdioma()
  const perfis = useDemoStore((s) => s.perfis)
  const clientes = useMemo(() => perfis.filter((p) => p.tipo === 'cliente'), [perfis])
  const viagens = useDemoStore((s) => s.viagens)
  const corridasPorCliente = useMemo(() => agruparCorridasPorCliente(viagens), [viagens])

  return (
    <div className="animar-entrada space-y-4">
      <div>
        <h1 className="fonte-display text-3xl">{t('admin.clientes.titulo')}</h1>
        <p className="mt-1 text-sm text-[var(--color-slate)]">{t('admin.clientes.sub')}</p>
      </div>
      <div className="admin-clientes-lista">
        {clientes.map((c) => {
          const resumo = montarResumoHistorico(corridasPorCliente.get(c.id) ?? [], 'cliente')
          return (
            <Link key={c.id} to={`/admin/clientes/${c.id}`} className="cartao admin-cliente-card">
              <div>
                <p className="font-medium">{c.nome}</p>
                <p className="admin-cliente-meta">
                  {c.email} · {c.telefone ?? t('admin.clientes.semTel')}
                </p>
              </div>
              <div className="admin-cliente-contagem">
                <strong>{t('admin.clientes.corridas', { n: resumo.total })}</strong>
                <span>
                  {t('admin.clientes.resumo', {
                    realizadas: resumo.realizadas,
                    canceladas: resumo.canceladas,
                  })}
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
