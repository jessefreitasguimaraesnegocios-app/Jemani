import { enderecoEhAeroporto } from '@/utils/endereco'
import type { Viagem } from '@/types'

export type PapelVoo = 'chegada' | 'partida'

export type StatusAcompanhamentoVoo = {
  codigo: string
  papel: PapelVoo
  titulo: string
  status: string
  detalhe: string
  horarioPrevisto: string
  minutosParaEvento: number | null
  atrasado: boolean
}

function textoPareceAeroporto(texto?: string) {
  if (!texto) return false
  return /\b(LAX|BUR|LGB|SNA|ONT|airport|aeroporto|terminal)\b/i.test(texto)
}

export function papelVooDaViagem(viagem: Pick<Viagem, 'origem' | 'destino' | 'origem_endereco' | 'destino_endereco'>): PapelVoo | null {
  if (enderecoEhAeroporto(viagem.origem_endereco) || textoPareceAeroporto(viagem.origem)) {
    return 'chegada'
  }
  if (enderecoEhAeroporto(viagem.destino_endereco) || textoPareceAeroporto(viagem.destino)) {
    return 'partida'
  }
  return null
}

function instanteDaViagem(data: string, horario: string) {
  const hora = horario.length === 5 ? horario : horario.slice(0, 5)
  const d = new Date(`${data}T${hora}:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

function formatarHorario(data: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Los_Angeles',
    hour: '2-digit',
    minute: '2-digit',
  }).format(data)
}

function formatarCountdown(minutos: number) {
  const abs = Math.abs(minutos)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  if (h <= 0) return `${m} min`
  return `${h} h ${m.toString().padStart(2, '0')} min`
}

/**
 * Acompanhamento do voo para o motorista.
 * Usa o horário da corrida como referência do pouso (chegada) ou da decolagem (partida).
 * Se VITE_AVIATIONSTACK_KEY existir, tenta enriquecer com dados ao vivo.
 */
export async function acompanharVoo(viagem: Viagem): Promise<StatusAcompanhamentoVoo | null> {
  const codigo = viagem.numero_voo?.trim().toUpperCase()
  if (!codigo) return null
  const papel = papelVooDaViagem(viagem)
  if (!papel) return null

  const previsto = instanteDaViagem(viagem.data_viagem, viagem.horario)
  if (!previsto) return null

  const chave = (import.meta.env.VITE_AVIATIONSTACK_KEY as string | undefined)?.trim()
  if (chave) {
    try {
      const aoVivo = await buscarAviationStack(codigo, viagem.data_viagem, chave, papel)
      if (aoVivo) return aoVivo
    } catch {
      /* cai no estimado local */
    }
  }

  return estimarPeloHorario(codigo, papel, previsto)
}

async function buscarAviationStack(
  codigo: string,
  data: string,
  chave: string,
  papel: PapelVoo,
): Promise<StatusAcompanhamentoVoo | null> {
  const url = new URL('https://api.aviationstack.com/v1/flights')
  url.searchParams.set('access_key', chave)
  url.searchParams.set('flight_iata', codigo)
  url.searchParams.set('flight_date', data)
  const res = await fetch(url.toString())
  if (!res.ok) return null
  const json = (await res.json()) as {
    data?: Array<{
      flight_status?: string
      departure?: { estimated?: string; scheduled?: string; delay?: number }
      arrival?: { estimated?: string; scheduled?: string; delay?: number }
    }>
  }
  const voo = json.data?.[0]
  if (!voo) return null
  const bloco = papel === 'chegada' ? voo.arrival : voo.departure
  const iso = bloco?.estimated || bloco?.scheduled
  const quando = iso ? new Date(iso) : null
  if (!quando || Number.isNaN(quando.getTime())) return null
  const minutos = Math.round((quando.getTime() - Date.now()) / 60_000)
  const atrasado = Number(bloco?.delay ?? 0) > 5
  return {
    codigo,
    papel,
    titulo: papel === 'chegada' ? 'Chegada do voo' : 'Partida do voo',
    status: rotuloStatusApi(voo.flight_status, papel, minutos),
    detalhe: atrasado
      ? `Atraso informado: cerca de ${bloco?.delay} min`
      : minutos >= 0
        ? `Faltam ${formatarCountdown(minutos)}`
        : `Há ${formatarCountdown(minutos)}`,
    horarioPrevisto: formatarHorario(quando),
    minutosParaEvento: minutos,
    atrasado,
  }
}

function rotuloStatusApi(status: string | undefined, papel: PapelVoo, minutos: number) {
  const s = (status ?? '').toLowerCase()
  if (s === 'landed') return 'Pouso concluído'
  if (s === 'active' && papel === 'chegada') return 'Em voo — a caminho do aeroporto'
  if (s === 'active' && papel === 'partida') return 'Em voo'
  if (s === 'cancelled') return 'Voo cancelado'
  if (s === 'delayed') return 'Atrasado'
  if (minutos <= 0 && papel === 'chegada') return 'Janela de pouso'
  if (minutos <= 0 && papel === 'partida') return 'Janela de decolagem'
  return papel === 'chegada' ? 'Aguardando pouso' : 'Aguardando decolagem'
}

function estimarPeloHorario(
  codigo: string,
  papel: PapelVoo,
  previsto: Date,
): StatusAcompanhamentoVoo {
  const minutos = Math.round((previsto.getTime() - Date.now()) / 60_000)
  let status = ''
  let detalhe = ''

  if (papel === 'chegada') {
    if (minutos > 120) {
      status = 'No horário previsto'
      detalhe = `Pouso estimado em ${formatarCountdown(minutos)}`
    } else if (minutos > 35) {
      status = 'Em aproximação'
      detalhe = `Chegada em cerca de ${formatarCountdown(minutos)}`
    } else if (minutos > -20) {
      status = 'Janela de pouso'
      detalhe =
        minutos >= 0
          ? `Pouso em cerca de ${formatarCountdown(minutos)}`
          : `Pouso há ${formatarCountdown(minutos)} — passageiro pode estar no desembarque`
    } else {
      status = 'Pouso já ocorreu'
      detalhe = `Há ${formatarCountdown(minutos)} — confirme o passageiro no meio-fio`
    }
  } else if (minutos > 90) {
    status = 'No horário previsto'
    detalhe = `Decolagem estimada em ${formatarCountdown(minutos)}`
  } else if (minutos > 25) {
    status = 'Embarque / preparação'
    detalhe = `Partida em cerca de ${formatarCountdown(minutos)}`
  } else if (minutos > -15) {
    status = 'Janela de decolagem'
    detalhe =
      minutos >= 0
        ? `Decolagem em cerca de ${formatarCountdown(minutos)}`
        : `Decolagem há ${formatarCountdown(minutos)}`
  } else {
    status = 'Partida já ocorreu'
    detalhe = `Há ${formatarCountdown(minutos)}`
  }

  return {
    codigo,
    papel,
    titulo: papel === 'chegada' ? 'Chegada do voo' : 'Partida do voo',
    status,
    detalhe,
    horarioPrevisto: formatarHorario(previsto),
    minutosParaEvento: minutos,
    atrasado: false,
  }
}

/** Texto livre digitado pelo cliente (ignora Contato/Portão montados na reserva). */
export function textoObservacaoCliente(observacoes?: string) {
  if (!observacoes?.trim()) return ''
  return observacoes
    .split('\n')
    .map((linha) => linha.trim())
    .filter(
      (linha) =>
        linha &&
        !/^contato\s*:/i.test(linha) &&
        !/^port[aã]o\s*:/i.test(linha),
    )
    .join('\n')
    .trim()
}
