import type { StatusViagem } from '@/types'
import { usarIdioma } from '@/i18n/usarIdioma'
import type { ChaveTraducao } from '@/i18n/mensagens'
import { cn } from '@/utils/format'
import './BadgeStatus.css'

const TOM: Record<StatusViagem, string> = {
  pending_payment: 'badge-status--aviso',
  paid: 'badge-status--ok',
  solicitada: 'badge-status--info',
  aguardando_empresa: 'badge-status--aviso',
  oferta_enviada: 'badge-status--info',
  empresa_confirmada: 'badge-status--ok',
  motorista_atribuido: 'badge-status--ok',
  motorista_a_caminho: 'badge-status--info',
  motorista_chegou: 'badge-status--info',
  passageiro_embarcou: 'badge-status--ok',
  viagem_em_andamento: 'badge-status--neutro',
  viagem_finalizada: 'badge-status--ok',
  cancelada: 'badge-status--erro',
  expired: 'badge-status--erro',
}

export function BadgeStatus({ status }: { status: StatusViagem }) {
  const { t } = usarIdioma()
  const chave = `status.${status}` as ChaveTraducao
  return <span className={cn('badge-status', TOM[status])}>{t(chave)}</span>
}
