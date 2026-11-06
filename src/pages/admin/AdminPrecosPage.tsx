import { useEffect, useState } from 'react'
import { BotaoSalvar } from '@/components/BotaoSalvar'
import { usarIdioma } from '@/i18n/usarIdioma'
import { useDemoStore } from '@/store/demoStore'
import type { RegraPreco } from '@/types'

function formDaRegra(regra: RegraPreco) {
  return {
    preco_base: regra.preco_base,
    preco_por_km: regra.preco_por_km,
    preco_minimo: regra.preco_minimo,
    adicional_horario_noturno: regra.adicional_horario_noturno,
    distancia_padrao_km: regra.distancia_padrao_km,
    preco_por_hora: regra.preco_por_hora ?? 0,
    franquia_milhas_por_hora: regra.franquia_milhas_por_hora ?? 20,
    preco_por_milha_excedente: regra.preco_por_milha_excedente ?? 0,
    duracao_minima_minutos: regra.duracao_minima_minutos ?? 120,
    duracao_maxima_minutos: regra.duracao_maxima_minutos ?? 720,
    regra_extensao: regra.regra_extensao ?? '',
    regra_cancelamento: regra.regra_cancelamento ?? '',
    cobrancas_adicionais: regra.cobrancas_adicionais ?? '',
  }
}

export function AdminPrecosPage() {
  const { t } = usarIdioma()
  const regra = useDemoStore((s) => s.regrasPreco.find((r) => r.ativo))
  const configuracoes = useDemoStore((s) => s.configuracoes)
  const atualizarRegraPreco = useDemoStore((s) => s.atualizarRegraPreco)
  const atualizarConfiguracao = useDemoStore((s) => s.atualizarConfiguracao)
  const [form, setForm] = useState(() =>
    regra
      ? formDaRegra(regra)
      : formDaRegra({
          id: '',
          nome: '',
          preco_base: 100,
          preco_por_km: 5,
          preco_minimo: 150,
          adicional_horario_noturno: 40,
          horario_noturno_inicio: '22:00',
          horario_noturno_fim: '06:00',
          distancia_padrao_km: 40,
          preco_por_hora: 0,
          franquia_milhas_por_hora: 20,
          preco_por_milha_excedente: 0,
          duracao_minima_minutos: 120,
          duracao_maxima_minutos: 720,
          pacotes_minutos: [],
          ativo: true,
          created_at: '',
          updated_at: '',
        }),
  )
  const [sujo, setSujo] = useState(false)

  useEffect(() => {
    if (!regra || sujo) return
    setForm(formDaRegra(regra))
  }, [regra?.id, regra?.updated_at, sujo])

  function lerConfig(chave: string, padrao: string) {
    return configuracoes.find((c) => c.chave === chave)?.valor ?? padrao
  }

  if (!regra) return <div className="cartao">Nenhuma regra de preço.</div>

  function salvar() {
    atualizarRegraPreco(regra!.id, {
      ...form,
      pacotes_minutos: regra!.pacotes_minutos?.length
        ? regra!.pacotes_minutos
        : [120, 180, 240, 300, 360, 480],
    })
    setSujo(false)
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
              onChange={(e) => {
                setSujo(true)
                setForm({ ...form, [key]: Number(e.target.value) })
              }}
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
              onChange={(e) => {
                setSujo(true)
                setForm({ ...form, [key]: Number(e.target.value) })
              }}
            />
          </div>
        ))}
        <div>
          <label className="rotulo" htmlFor="preco-paradas-bloco">
            Endereços por bloco
          </label>
          <input
            id="preco-paradas-bloco"
            className="campo"
            type="number"
            min={1}
            max={20}
            value={lerConfig('hourly_paradas_por_bloco', '5')}
            onChange={(e) => atualizarConfiguracao('hourly_paradas_por_bloco', e.target.value)}
          />
        </div>
        <div>
          <label className="rotulo" htmlFor="preco-raio-paradas">
            Raio máximo das paradas (km)
          </label>
          <input
            id="preco-raio-paradas"
            className="campo"
            type="number"
            min={5}
            max={500}
            value={lerConfig('hourly_raio_paradas_km', '80')}
            onChange={(e) => atualizarConfiguracao('hourly_raio_paradas_km', e.target.value)}
          />
        </div>
        <p className="sm:col-span-2 text-xs text-[var(--color-slate)]">
          No início da corrida o cliente pode enviar até N endereços. Cada extensão paga libera mais
          N vagas, dentro do raio e das regiões da empresa.
        </p>
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
              onChange={(e) => {
                setSujo(true)
                setForm({ ...form, [key]: e.target.value })
              }}
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
