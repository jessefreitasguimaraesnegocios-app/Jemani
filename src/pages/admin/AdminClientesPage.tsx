import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FotoPerfilCliente } from '@/components/FotoPerfilCliente'
import { usarIdioma } from '@/i18n/usarIdioma'
import { agruparCorridasPorCliente, montarResumoHistorico } from '@/services/historicoCorridas'
import { useDemoStore } from '@/store/demoStore'
import './AdminClientesPage.css'

function textoBusca(valor?: string | null) {
  return (valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function AdminClientesPage() {
  const { t } = usarIdioma()
  const [busca, setBusca] = useState('')
  const perfis = useDemoStore((s) => s.perfis)
  const clientes = useMemo(() => perfis.filter((p) => p.tipo === 'cliente'), [perfis])
  const viagens = useDemoStore((s) => s.viagens)
  const corridasPorCliente = useMemo(() => agruparCorridasPorCliente(viagens), [viagens])

  const filtrados = useMemo(() => {
    const termo = textoBusca(busca).trim()
    if (!termo) return clientes
    return clientes.filter((c) => {
      const bloco = [c.nome, c.email, c.telefone].map(textoBusca).join(' ')
      return bloco.includes(termo)
    })
  }, [clientes, busca])

  return (
    <div className="animar-entrada space-y-4">
      <div className="admin-clientes-topo">
        <div>
          <h1 className="fonte-display text-3xl">{t('admin.clientes.titulo')}</h1>
          <p className="mt-1 text-sm text-[var(--color-slate)]">{t('admin.clientes.sub')}</p>
        </div>
        <label className="admin-clientes-busca">
          <span className="rotulo">{t('comum.buscar')}</span>
          <input
            className="campo"
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={t('admin.clientes.busca')}
            aria-label={t('comum.buscar')}
            autoComplete="off"
          />
        </label>
      </div>

      {filtrados.length === 0 ? (
        <p className="admin-clientes-vazio">{t('admin.clientes.vazioBusca')}</p>
      ) : (
        <div className="admin-clientes-lista">
          {filtrados.map((c) => {
            const resumo = montarResumoHistorico(corridasPorCliente.get(c.id) ?? [], 'cliente')
            return (
              <Link key={c.id} to={`/admin/clientes/${c.id}`} className="cartao admin-cliente-card">
                <div className="admin-cliente-info">
                  <FotoPerfilCliente url={c.avatar_url} nome={c.nome} tamanho="corrida" />
                  <div>
                    <p className="font-medium">{c.nome}</p>
                    <p className="admin-cliente-meta">
                      {c.email} · {c.telefone ?? t('admin.clientes.semTel')}
                    </p>
                  </div>
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
      )}
    </div>
  )
}
