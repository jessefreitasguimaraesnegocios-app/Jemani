import { dataIsoNoTimezone } from '@/services/reservaValidacao'

export function gerarId(): string {
  return crypto.randomUUID()
}

export function gerarCodigoViagem(): string {
  const n = Math.floor(1000 + Math.random() * 9000)
  return `JEM-${n}`
}

export function agoraIso(): string {
  return new Date().toISOString()
}

export function formatarMoeda(valor: number, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
  }).format(valor)
}

export function formatarData(data: string, locale = 'pt-BR'): string {
  if (!data) return '—'
  const [y, m, d] = data.split('-')
  if (!y || !m || !d) return data
  const iso = `${y}-${m}-${d}T12:00:00`
  const dataObj = new Date(iso)
  if (Number.isNaN(dataObj.getTime())) return `${d}/${m}/${y}`
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(dataObj)
}

export function formatarDuracao(ms: number | null): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return '—'
  const totalMin = Math.round(ms / 60000)
  const horas = Math.floor(totalMin / 60)
  const minutos = totalMin % 60
  if (horas <= 0) return `${minutos} min`
  return `${horas}h ${String(minutos).padStart(2, '0')}min`
}

export function amanhaIso(): string {
  const hoje = dataIsoNoTimezone()
  const [ano, mes, dia] = hoje.split('-').map(Number)
  const amanha = new Date(Date.UTC(ano, mes - 1, dia + 1))
  const y = amanha.getUTCFullYear()
  const m = String(amanha.getUTCMonth() + 1).padStart(2, '0')
  const d = String(amanha.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}
