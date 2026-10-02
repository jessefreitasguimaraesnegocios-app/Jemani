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

export function amanhaIso(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}
