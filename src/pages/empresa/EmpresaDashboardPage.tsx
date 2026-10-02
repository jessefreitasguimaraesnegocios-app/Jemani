import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useDemoStore } from '@/store/demoStore'
import { formatarMoeda } from '@/utils/format'
import { amanhaIso } from '@/utils/format'

export function EmpresaDashboardPage() {
  const { usuario } = useAuth()
  const empresa = useDemoStore((s) => s.obterEmpresaDoUsuario(usuario?.id ?? ''))
  const atribuicoes = useDemoStore((s) => s.atribuicoes)
  const viagens = useDemoStore((s) => s.viagens)
  const comissoes = useDemoStore((s) => s.comissoes)
  const hoje = new Date().toISOString().slice(0, 10)

  if (!empresa) return <div className="cartao">Empresa não vinculada ao usuário.</div>

  const novas = atribuicoes.filter(
    (a) => a.empresa_id === empresa.id && a.status === 'oferecida',
  ).length
  const minhas = viagens.filter((v) => v.empresa_id === empresa.id)
  const hojeLista = minhas.filter((v) => v.data_viagem === hoje)
  const proximas = minhas.filter(
    (v) => v.data_viagem >= hoje && !['viagem_finalizada', 'cancelada'].includes(v.status),
  )
  const concluidas = minhas.filter((v) => v.status === 'viagem_finalizada')
  const comissoesEmp = comissoes.filter((c) => c.empresa_id === empresa.id)
  const aReceber = comissoesEmp.reduce((acc, c) => acc + c.valor_empresa, 0)
  const comissaoPlat = comissoesEmp.reduce((acc, c) => acc + c.valor_plataforma, 0)

  const cards = [
    { label: 'Novas solicitações', valor: String(novas), to: '/empresa/solicitacoes' },
    { label: 'Viagens hoje', valor: String(hojeLista.length) },
    { label: 'Próximas viagens', valor: String(proximas.length) },
    { label: 'Concluídas', valor: String(concluidas.length) },
    { label: 'Valor a receber', valor: formatarMoeda(aReceber) },
    { label: 'Comissão plataforma', valor: formatarMoeda(comissaoPlat) },
  ]

  return (
    <div className="animar-entrada space-y-6">
      <div>
        <h1 className="fonte-display text-3xl">{empresa.nome_comercial}</h1>
        <p className="text-sm text-[var(--color-slate)]">Dashboard · {amanhaIso()}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) =>
          c.to ? (
            <Link key={c.label} to={c.to} className="cartao block transition hover:-translate-y-0.5">
              <p className="text-sm text-[var(--color-slate)]">{c.label}</p>
              <p className="fonte-display mt-2 text-3xl">{c.valor}</p>
            </Link>
          ) : (
            <div key={c.label} className="cartao">
              <p className="text-sm text-[var(--color-slate)]">{c.label}</p>
              <p className="fonte-display mt-2 text-3xl">{c.valor}</p>
            </div>
          ),
        )}
      </div>
    </div>
  )
}
