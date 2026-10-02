import { usarIdioma } from '@/i18n/usarIdioma'
import { useDemoStore } from '@/store/demoStore'
import { formatarMoeda } from '@/utils/format'

export function AdminDashboardPage() {
  const { t, locale } = usarIdioma()
  const perfis = useDemoStore((s) => s.perfis)
  const empresas = useDemoStore((s) => s.empresas)
  const viagens = useDemoStore((s) => s.viagens)
  const comissoes = useDemoStore((s) => s.comissoes)
  const hoje = new Date().toISOString().slice(0, 10)

  const clientes = perfis.filter((p) => p.tipo === 'cliente').length
  const parceiras = empresas.filter((e) => e.status === 'ativa').length
  const viagensHoje = viagens.filter((v) => v.data_viagem === hoje).length
  const futuras = viagens.filter(
    (v) => v.data_viagem >= hoje && !['cancelada', 'viagem_finalizada'].includes(v.status),
  ).length
  const concluidas = viagens.filter((v) => v.status === 'viagem_finalizada').length
  const canceladas = viagens.filter((v) => v.status === 'cancelada').length
  const valorTotal = viagens.reduce((a, v) => a + v.preco_total, 0)
  const comissao = comissoes.reduce((a, c) => a + c.valor_plataforma, 0)
  const empresasValor = comissoes.reduce((a, c) => a + c.valor_empresa, 0)

  const cards = [
    { label: t('admin.dashboard.clientes'), valor: String(clientes) },
    { label: t('admin.dashboard.parceiras'), valor: String(parceiras) },
    { label: t('admin.dashboard.hoje'), valor: String(viagensHoje) },
    { label: t('admin.dashboard.futuras'), valor: String(futuras) },
    { label: t('admin.dashboard.concluidas'), valor: String(concluidas) },
    { label: t('admin.dashboard.canceladas'), valor: String(canceladas) },
    { label: t('admin.dashboard.volume'), valor: formatarMoeda(valorTotal, locale) },
    { label: t('admin.dashboard.comissao'), valor: formatarMoeda(comissao, locale) },
    { label: t('admin.dashboard.empresasValor'), valor: formatarMoeda(empresasValor, locale) },
  ]

  return (
    <div className="animar-entrada space-y-6">
      <h1 className="fonte-display text-3xl">{t('admin.dashboard.titulo')}</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="cartao">
            <p className="text-sm text-[var(--color-slate)]">{c.label}</p>
            <p className="fonte-display mt-2 text-3xl">{c.valor}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
