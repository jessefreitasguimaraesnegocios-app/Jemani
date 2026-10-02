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
      {viagens.length === 0 && <div className="cartao">Agenda livre.</div>}
    </div>
  )
}
