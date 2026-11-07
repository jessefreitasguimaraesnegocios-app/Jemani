import type { ConviteOferta, Viagem } from '@/types'

const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

export function gerarTokenConvite(tamanho = 43): string {
  const bytes = new Uint8Array(tamanho)
  crypto.getRandomValues(bytes)
  let saida = ''
  for (const byte of bytes) saida += ALFABETO[byte % ALFABETO.length]
  return saida
}

export async function hashearTokenConvite(token: string): Promise<string> {
  const dados = new TextEncoder().encode(token.trim())
  const digest = await crypto.subtle.digest('SHA-256', dados)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function montarUrlConvite(token: string, origem = typeof window !== 'undefined' ? window.location.origin : 'https://jemani.vercel.app') {
  return `${origem.replace(/\/$/, '')}/convite/${encodeURIComponent(token)}`
}

/** Validade até o horário da corrida (fim do dia se horário inválido). */
export function calcularExpiracaoConvite(viagem: Pick<Viagem, 'data_viagem' | 'horario'>): string {
  const horario = (viagem.horario || '23:59').slice(0, 5)
  const iso = `${viagem.data_viagem}T${horario}:00`
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) {
    return new Date(`${viagem.data_viagem}T23:59:59`).toISOString()
  }
  return data.toISOString()
}

export function conviteAindaValido(convite: ConviteOferta, agora = new Date()): boolean {
  if (convite.revoked_at) return false
  if (convite.accepted_at) return false
  return new Date(convite.expires_at).getTime() >= agora.getTime()
}

export type SituacaoConvite =
  | 'aberta'
  | 'aceita'
  | 'expirada'
  | 'revogada'
  | 'indisponivel'

export function situacaoConvite(
  convite: ConviteOferta,
  viagem: Viagem | undefined,
  agora = new Date(),
): SituacaoConvite {
  if (convite.accepted_at) return 'aceita'
  if (convite.revoked_at) return 'revogada'
  if (new Date(convite.expires_at).getTime() < agora.getTime()) return 'expirada'
  if (!viagem) return 'indisponivel'
  if (['cancelada', 'expired', 'viagem_finalizada'].includes(viagem.status)) return 'indisponivel'
  if (viagem.empresa_id && viagem.empresa_id !== convite.empresa_id) return 'indisponivel'
  if (viagem.status === 'parceiro_externo' && viagem.empresa_id === convite.empresa_id) return 'aceita'
  if (!['aguardando_empresa', 'oferta_enviada', 'paid'].includes(viagem.status)) {
    return 'indisponivel'
  }
  return 'aberta'
}
