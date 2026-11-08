import { useEffect, useState } from 'react'
import { BotaoSalvar } from '@/components/BotaoSalvar'
import type { ChaveTraducao } from '@/i18n/mensagens'
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

const CAMPOS_ONE_WAY: Array<[keyof ReturnType<typeof formDaRegra>, ChaveTraducao]> = [
  ['preco_base', 'admin.precos.precoBase'],
  ['preco_por_km', 'admin.precos.precoKm'],
  ['preco_minimo', 'admin.precos.precoMinimo'],
  ['adicional_horario_noturno', 'admin.precos.adicionalNoturno'],
  ['distancia_padrao_km', 'admin.precos.distanciaPadrao'],
]

const CAMPOS_HOURLY: Array<[keyof ReturnType<typeof formDaRegra>, ChaveTraducao]> = [
  ['preco_por_hora', 'admin.precos.precoHora'],
  ['franquia_milhas_por_hora', 'admin.precos.franquiaMilhas'],
  ['preco_por_milha_excedente', 'admin.precos.milhaExcedente'],
  ['duracao_minima_minutos', 'admin.precos.duracaoMin'],
  ['duracao_maxima_minutos', 'admin.precos.duracaoMax'],
]

const CAMPOS_TEXTO: Array<[keyof ReturnType<typeof formDaRegra>, ChaveTraducao]> = [
  ['regra_extensao', 'admin.precos.regraExtensao'],
  ['regra_cancelamento', 'admin.precos.regraCancelamento'],
  ['cobrancas_adicionais', 'admin.precos.cobrancasAdicionais'],
]

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

  if (!regra) return <div className="cartao">{t('admin.precos.semRegra')}</div>

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
        <p className="sm:col-span-2 text-sm font-medium">{t('admin.precos.oneWay')}</p>
        {CAMPOS_ONE_WAY.map(([key, chave]) => (
          <div key={key}>
            <label className="rotulo">{t(chave)}</label>
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

        <p className="sm:col-span-2 mt-2 text-sm font-medium">{t('admin.precos.hourly')}</p>
        <p className="sm:col-span-2 text-xs text-[var(--color-slate)]">{t('admin.precos.hourlyDica')}</p>
        {CAMPOS_HOURLY.map(([key, chave]) => (
          <div key={key}>
            <label className="rotulo">{t(chave)}</label>
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
            {t('admin.precos.paradasBloco')}
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
            {t('admin.precos.raioParadas')}
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
          {t('admin.precos.paradasDica')}
        </p>
        {CAMPOS_TEXTO.map(([key, chave]) => (
          <div key={key} className="sm:col-span-2">
            <label className="rotulo">{t(chave)}</label>
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
          {t('admin.precos.salvar')}
        </BotaoSalvar>
      </div>
    </div>
  )
}
