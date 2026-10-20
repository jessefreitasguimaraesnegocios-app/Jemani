import { Link } from 'react-router-dom'
import { BadgeStatus } from '@/components/BadgeStatus'
import { usarIdioma } from '@/i18n/usarIdioma'
import type { Viagem } from '@/types'
import { formatarData, formatarMoeda } from '@/utils/format'

export function CartaoReservaCliente({
  viagem,
  categoria,
  empresa,
  motorista,
  pedirAvaliacao,
}: {
  viagem: Viagem
  categoria?: string
  empresa?: string
  motorista?: string
  pedirAvaliacao?: boolean
}) {
  const { t, locale } = usarIdioma()

  return (
    <Link to={`/app/viagens/${viagem.id}`} className="cliente-viagens-cartao">
      <div className="cliente-viagens-cartao-linha">
        <div>
          <p className="cliente-viagens-cartao-titulo">
            {viagem.codigo}
            {categoria ? ` · ${categoria}` : ''}
          </p>
          <p className="cliente-viagens-cartao-texto">
            {viagem.origem} → {viagem.destino}
          </p>
          <p className="cliente-viagens-cartao-texto">
            {formatarData(viagem.data_viagem, locale)} {viagem.horario} ·{' '}
            {formatarMoeda(viagem.preco_total, locale)}
          </p>
          {empresa && (
            <p className="cliente-viagens-cartao-extra">
              {t('comum.empresa')}: {empresa}
              {motorista ? ` · ${t('comum.motorista')}: ${motorista}` : ''}
            </p>
          )}
          {pedirAvaliacao && (
            <p className="cliente-viagens-cartao-avaliar">{t('cliente.viagens.avaliarAgora')}</p>
          )}
        </div>
        <BadgeStatus status={viagem.status} />
      </div>
    </Link>
  )
}
