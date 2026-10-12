import { useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { BadgeStatus } from '@/components/BadgeStatus'
import { usarIdioma } from '@/i18n/usarIdioma'
import { useDemoStore } from '@/store/demoStore'
import { formatarData, formatarMoeda } from '@/utils/format'

export function EmpresaAgendaPage() {
  const { t, locale } = usarIdioma()
  const { usuario } = useAuth()
  const empresa = useDemoStore((s) => s.obterEmpresaDoUsuario(usuario?.id ?? ''))
  const todasViagens = useDemoStore((s) => s.viagens)
  const agendamentos = useDemoStore((s) => s.agendamentosVeiculo)
  const veiculos = useDemoStore((s) => s.veiculos)
  const motoristas = useDemoStore((s) => s.motoristas)
  const viagens = useMemo(
    () =>
      todasViagens
        .filter(
          (v) =>
            v.empresa_id === empresa?.id &&
            !['cancelada', 'viagem_finalizada'].includes(v.status),
        )
        .sort((a, b) =>
          `${a.data_viagem}${a.horario}`.localeCompare(`${b.data_viagem}${b.horario}`),
        ),
    [todasViagens, empresa?.id],
  )
  const servicos = useMemo(
    () =>
      (agendamentos ?? [])
        .filter((item) => item.empresa_id === empresa?.id)
        .sort((a, b) => `${a.data}${a.horario}`.localeCompare(`${b.data}${b.horario}`)),
    [agendamentos, empresa?.id],
  )

  return (
    <div className="animar-entrada space-y-4">
      <h1 className="fonte-display text-3xl">{t('empresa.agenda.titulo')}</h1>
      {viagens.map((v) => (
        <div key={v.id} className="cartao flex flex-wrap justify-between gap-2">
          <div>
            <p className="font-medium">
              {formatarData(v.data_viagem, locale)} · {v.horario} · {v.codigo}
            </p>
            <p className="text-sm text-[var(--color-slate)]">
              {v.origem} → {v.destino} · {formatarMoeda(v.valor_empresa, locale)}
            </p>
          </div>
          <BadgeStatus status={v.status} />
        </div>
      ))}
      {viagens.length === 0 && <div className="cartao">{t('empresa.agenda.vazio')}</div>}

      <h2 className="fonte-display text-2xl">{t('empresa.agenda.servicos')}</h2>
      {servicos.map((item) => {
        const veiculo = veiculos.find((v) => v.id === item.veiculo_id)
        const motorista = motoristas.find((m) => m.id === item.motorista_id)
        const carro = veiculo ? `${veiculo.marca} ${veiculo.modelo}` : '—'
        return (
          <div key={item.id} className="cartao">
            <p className="font-medium">
              {item.tipo === 'mecanica' ? t('empresa.veiculos.mecanica') : t('empresa.veiculos.lavaJato')}
              {' · '}
              {formatarData(item.data, locale)} · {item.horario.slice(0, 5)}
            </p>
            <p className="text-sm text-[var(--color-slate)]">
              {carro}
              {motorista ? ` · ${motorista.nome}` : ''}
              {item.observacao ? ` · ${item.observacao}` : ''}
            </p>
          </div>
        )
      })}
      {servicos.length === 0 && <div className="cartao">{t('empresa.agenda.vazioServico')}</div>}
    </div>
  )
}
