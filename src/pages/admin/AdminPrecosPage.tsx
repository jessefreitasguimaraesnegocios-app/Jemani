import { useState, type FormEvent } from 'react'
import { usarIdioma } from '@/i18n/usarIdioma'
import { useDemoStore } from '@/store/demoStore'

export function AdminPrecosPage() {
  const { t } = usarIdioma()
  const regra = useDemoStore((s) => s.regrasPreco.find((r) => r.ativo))
  const atualizarRegraPreco = useDemoStore((s) => s.atualizarRegraPreco)
  const [form, setForm] = useState({
    preco_base: regra?.preco_base ?? 100,
    preco_por_km: regra?.preco_por_km ?? 5,
    preco_minimo: regra?.preco_minimo ?? 150,
    adicional_horario_noturno: regra?.adicional_horario_noturno ?? 40,
    distancia_padrao_km: regra?.distancia_padrao_km ?? 40,
  })

  if (!regra) return <div className="cartao">Nenhuma regra de preço.</div>

  function salvar(e: FormEvent) {
    e.preventDefault()
    atualizarRegraPreco(regra!.id, form)
  }

  return (
    <div className="animar-entrada space-y-4">
      <h1 className="fonte-display text-3xl">{t('admin.precos.titulo')}</h1>
      <form className="cartao grid gap-3 sm:grid-cols-2" onSubmit={salvar}>
        {(
          [
            ['preco_base', 'Preço base (USD)'],
            ['preco_por_km', 'Preço por km (USD)'],
            ['preco_minimo', 'Preço mínimo (USD)'],
            ['adicional_horario_noturno', 'Adicional noturno (USD)'],
            ['distancia_padrao_km', 'Distância padrão (km)'],
          ] as const
        ).map(([key, label]) => (
          <div key={key}>
            <label className="rotulo">{label}</label>
            <input
              className="campo"
              type="number"
              step="0.01"
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })}
            />
          </div>
        ))}
        <button type="submit" className="btn-primario sm:col-span-2">
          Salvar regra de preço
        </button>
      </form>
      <p className="text-sm text-[var(--color-slate)]">
        Sem API de mapas, o MVP usa a distância padrão configurável para calcular o preço.
      </p>
    </div>
  )
}
