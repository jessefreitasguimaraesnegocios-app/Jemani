import { useState } from 'react'
import { BotaoSalvar } from '@/components/BotaoSalvar'
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
    preco_por_hora: regra?.preco_por_hora ?? 0,
    franquia_milhas_por_hora: regra?.franquia_milhas_por_hora ?? 20,
    preco_por_milha_excedente: regra?.preco_por_milha_excedente ?? 0,
    duracao_minima_minutos: regra?.duracao_minima_minutos ?? 120,
    duracao_maxima_minutos: regra?.duracao_maxima_minutos ?? 720,
    regra_extensao: regra?.regra_extensao ?? '',
    regra_cancelamento: regra?.regra_cancelamento ?? '',
    cobrancas_adicionais: regra?.cobrancas_adicionais ?? '',
  })

  if (!regra) return <div className="cartao">Nenhuma regra de preço.</div>

  function salvar() {
    atualizarRegraPreco(regra!.id, {
      ...form,
      pacotes_minutos: regra!.pacotes_minutos?.length
        ? regra!.pacotes_minutos
        : [120, 180, 240, 300, 360, 480],
    })
  }

  return (
    <div className="animar-entrada space-y-4">
      <h1 className="fonte-display text-3xl">{t('admin.precos.titulo')}</h1>
      <div className="cartao grid gap-3 sm:grid-cols-2">
        <p className="sm:col-span-2 text-sm font-medium">ONE-WAY RIDE</p>
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

        <p className="sm:col-span-2 mt-2 text-sm font-medium">HOURLY CHAUFFEUR</p>
        <p className="sm:col-span-2 text-xs text-[var(--color-slate)]">
          Deixe preço por hora em 0 para manter hourly desabilitado. Não invente tarifas — use o
          valor comercial real.
        </p>
        {(
          [
            ['preco_por_hora', 'Preço por hora (USD) — 0 = off'],
            ['franquia_milhas_por_hora', 'Franquia de milhas / hora'],
            ['preco_por_milha_excedente', 'USD por milha excedente'],
            ['duracao_minima_minutos', 'Duração mínima (min)'],
            ['duracao_maxima_minutos', 'Duração máxima (min)'],
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
        {(
          [
            ['regra_extensao', 'Regra de extensão'],
            ['regra_cancelamento', 'Regra de cancelamento'],
            ['cobrancas_adicionais', 'Cobranças adicionais'],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className="sm:col-span-2">
            <label className="rotulo">{label}</label>
            <textarea
              className="campo min-h-20"
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            />
          </div>
        ))}
        <BotaoSalvar className="btn-primario sm:col-span-2" aoSalvar={salvar}>
          Salvar regra de preço
        </BotaoSalvar>
      </div>
    </div>
  )
}
