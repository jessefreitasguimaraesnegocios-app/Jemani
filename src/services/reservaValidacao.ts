const TIMEZONE = import.meta.env.VITE_TIMEZONE || 'America/Los_Angeles'
const MINUTOS_MINIMOS = 4 * 60
const INTERVALO_SLOTS_MIN = 15

export interface ResultadoValidacaoReserva {
  valido: boolean
  mensagem?: string
  minutosAntecedencia?: number
}

function formatadorTimezone(timezone: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

function partesTimezone(
  data: Date,
  formatador: Intl.DateTimeFormat,
): { year: number; month: number; day: number; hour: number; minute: number; second: number } {
  const parts = formatador.formatToParts(data)
  const get = (tipo: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === tipo)?.value ?? '0')
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour') === 24 ? 0 : get('hour'),
    minute: get('minute'),
    second: get('second'),
  }
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function minutosParaHorario(totalMinutos: number): string {
  const h = Math.floor(totalMinutos / 60)
  const m = totalMinutos % 60
  return `${pad2(h)}:${pad2(m)}`
}

export function dataIsoNoTimezone(agora: Date = new Date(), timezone = TIMEZONE): string {
  const p = partesTimezone(agora, formatadorTimezone(timezone))
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`
}

/** Interpreta data (YYYY-MM-DD) + horário (HH:mm) no timezone da plataforma. */
export function montarDataViagem(data: string, horario: string, timezone = TIMEZONE): Date {
  const isoLocal = `${data}T${horario}:00`
  const asUtcGuess = new Date(isoLocal)
  if (Number.isNaN(asUtcGuess.getTime())) {
    throw new Error('Data ou horário inválidos')
  }

  const formatador = formatadorTimezone(timezone)
  const agoraTz = partesTimezone(new Date(), formatador)
  const alvoTz = {
    year: Number(data.slice(0, 4)),
    month: Number(data.slice(5, 7)),
    day: Number(data.slice(8, 10)),
    hour: Number(horario.slice(0, 2)),
    minute: Number(horario.slice(3, 5)),
    second: 0,
  }

  const agoraComoUtc = Date.UTC(
    agoraTz.year,
    agoraTz.month - 1,
    agoraTz.day,
    agoraTz.hour,
    agoraTz.minute,
    agoraTz.second,
  )
  const alvoComoUtc = Date.UTC(
    alvoTz.year,
    alvoTz.month - 1,
    alvoTz.day,
    alvoTz.hour,
    alvoTz.minute,
    alvoTz.second,
  )

  const diffMs = alvoComoUtc - agoraComoUtc
  return new Date(Date.now() + diffMs)
}

export function validarAntecedenciaMinima(
  data: string,
  horario: string,
  agora: Date = new Date(),
  timezone = TIMEZONE,
): ResultadoValidacaoReserva {
  try {
    const partida = montarDataViagem(data, horario, timezone)
    const diffMs = partida.getTime() - agora.getTime()
    const minutos = Math.floor(diffMs / 60000)

    if (diffMs < 0) {
      return {
        valido: false,
        mensagem: 'Não é possível reservar para um horário no passado.',
        minutosAntecedencia: minutos,
      }
    }

    if (minutos < MINUTOS_MINIMOS) {
      return {
        valido: false,
        mensagem:
          'A reserva precisa de no mínimo 4 horas de antecedência. Escolha um horário mais tarde.',
        minutosAntecedencia: minutos,
      }
    }

    return { valido: true, minutosAntecedencia: minutos }
  } catch {
    return { valido: false, mensagem: 'Data ou horário inválidos.' }
  }
}

/**
 * Horários elegíveis para a data (intervalo de 15 min).
 * No mesmo dia, começa no primeiro slot com ≥ 4h de antecedência (fuso LA).
 */
export function listarHorariosDisponiveis(
  data: string,
  agora: Date = new Date(),
  timezone = TIMEZONE,
  intervaloMin = INTERVALO_SLOTS_MIN,
): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return []

  const hoje = dataIsoNoTimezone(agora, timezone)
  if (data < hoje) return []

  const slots: string[] = []
  for (let total = 0; total < 24 * 60; total += intervaloMin) {
    const horario = minutosParaHorario(total)
    if (validarAntecedenciaMinima(data, horario, agora, timezone).valido) {
      slots.push(horario)
    }
  }
  return slots
}

/** Primeira data (no fuso) que ainda tem pelo menos um horário válido. */
export function primeiraDataDisponivel(
  agora: Date = new Date(),
  timezone = TIMEZONE,
  diasBusca = 14,
): string {
  const formatador = formatadorTimezone(timezone)
  const base = partesTimezone(agora, formatador)
  const baseUtc = Date.UTC(base.year, base.month - 1, base.day)

  for (let i = 0; i < diasBusca; i++) {
    const dia = new Date(baseUtc + i * 24 * 60 * 60 * 1000)
    const iso = `${dia.getUTCFullYear()}-${pad2(dia.getUTCMonth() + 1)}-${pad2(dia.getUTCDate())}`
    if (listarHorariosDisponiveis(iso, agora, timezone).length > 0) return iso
  }

  return dataIsoNoTimezone(agora, timezone)
}

export function enderecoTemCoordenadas(endereco?: {
  latitude?: number
  longitude?: number
} | null): boolean {
  if (!endereco) return false
  return (
    typeof endereco.latitude === 'number' &&
    typeof endereco.longitude === 'number' &&
    Number.isFinite(endereco.latitude) &&
    Number.isFinite(endereco.longitude)
  )
}
