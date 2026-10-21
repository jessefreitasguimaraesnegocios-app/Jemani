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
  origemCodigo: string
  origemNome: string
  destinoCodigo: string
  destinoNome: string
  decolagemIso: string | null
  pousoIso: string | null
  progresso: number
  minutosDecorridos: number | null
  minutosRestantes: number | null
  duracaoTotalMin: number | null
}

type BlocoHorarioApi = {
  airport?: string | null
  iata?: string | null
  estimated?: string | null
  scheduled?: string | null
  actual?: string | null
  delay?: number | null
}

function textoPareceAeroporto(texto?: string) {
  if (!texto) return false
  return /\b(LAX|BUR|LGB|SNA|ONT|airport|aeroporto|terminal)\b/i.test(texto)
}

export function papelVooDaViagem(
  viagem: Pick<Viagem, 'origem' | 'destino' | 'origem_endereco' | 'destino_endereco'>,
): PapelVoo | null {
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

function lerDataIso(valor?: string | null) {
  if (!valor) return null
  const data = new Date(valor)
  return Number.isNaN(data.getTime()) ? null : data
}

function codigoAeroportoDoTexto(texto?: string) {
  if (!texto) return ''
  const match = texto
    .toUpperCase()
    .match(/\b(LAX|BUR|LGB|SNA|ONT|SFO|JFK|EWR|ORD|IAH|DFW|ATL|MIA|LAS|SEA|PHX)\b/)
  return match?.[1] ?? ''
}

/** Progresso 0–1 entre decolagem e pouso (ou agora). */
export function calcularProgressoVoo(
  decolagem: Date | null,
  pouso: Date | null,
  agora = new Date(),
): {
  progresso: number
  minutosDecorridos: number | null
  minutosRestantes: number | null
  duracaoTotalMin: number | null
} {
  if (!decolagem || !pouso) {
    return {
      progresso: 0,
      minutosDecorridos: null,
      minutosRestantes: null,
      duracaoTotalMin: null,
    }
  }
  const totalMs = pouso.getTime() - decolagem.getTime()
  if (totalMs <= 0) {
    return {
      progresso: 1,
      minutosDecorridos: 0,
      minutosRestantes: 0,
      duracaoTotalMin: 0,
    }
  }
  const andadoMs = agora.getTime() - decolagem.getTime()
  const progresso = Math.min(1, Math.max(0, andadoMs / totalMs))
  const minutosDecorridos = Math.max(0, Math.round(andadoMs / 60_000))
  const minutosRestantes = Math.max(0, Math.round((pouso.getTime() - agora.getTime()) / 60_000))
  return {
    progresso,
    minutosDecorridos,
    minutosRestantes,
    duracaoTotalMin: Math.round(totalMs / 60_000),
  }
}

export function atualizarProgressoStatus(
  status: StatusAcompanhamentoVoo,
  agora = new Date(),
): StatusAcompanhamentoVoo {
  const decolagem = lerDataIso(status.decolagemIso)
  const pouso = lerDataIso(status.pousoIso)
  const calc = calcularProgressoVoo(decolagem, pouso, agora)
  const minutosParaEvento =
    status.papel === 'chegada'
      ? pouso
        ? Math.round((pouso.getTime() - agora.getTime()) / 60_000)
        : status.minutosParaEvento
      : decolagem
        ? Math.round((decolagem.getTime() - agora.getTime()) / 60_000)
        : status.minutosParaEvento

  return {
    ...status,
    ...calc,
    minutosParaEvento,
    detalhe: detalhePeloProgresso(status.papel, minutosParaEvento, calc),
    status: rotuloStatusProgresso(status.status, status.papel, calc.progresso, minutosParaEvento),
  }
}

function detalhePeloProgresso(
  papel: PapelVoo,
  minutosParaEvento: number | null,
  calc: ReturnType<typeof calcularProgressoVoo>,
) {
  if (papel === 'chegada') {
    if (calc.progresso >= 1 || (minutosParaEvento != null && minutosParaEvento <= 0)) {
      return 'Pouso concluído ou janela de desembarque'
    }
    if (minutosParaEvento != null) {
      return `Pouso em cerca de ${formatarCountdown(minutosParaEvento)}`
    }
  } else if (minutosParaEvento != null) {
    if (minutosParaEvento <= 0) return 'Janela de decolagem / já partiu'
    return `Decolagem em cerca de ${formatarCountdown(minutosParaEvento)}`
  }
  if (calc.minutosRestantes != null) {
    return `Restam ${formatarCountdown(calc.minutosRestantes)}`
  }
  return 'Acompanhando voo'
}

function rotuloStatusProgresso(
  statusAtual: string,
  papel: PapelVoo,
  progresso: number,
  minutos: number | null,
) {
  if (statusAtual === 'Voo cancelado' || statusAtual === 'Atrasado') return statusAtual
  if (progresso >= 1 || (minutos != null && minutos <= 0 && papel === 'chegada')) {
    return 'Pouso concluído'
  }
  if (progresso > 0.05 && progresso < 1) {
    return papel === 'chegada' ? 'Em voo — a caminho do aeroporto' : 'Em voo'
  }
  return statusAtual
}

/**
 * Acompanhamento do voo para o motorista.
 * Usa o horário da corrida como referência; com VITE_AVIATIONSTACK_KEY enriquece ao vivo.
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
      const aoVivo = await buscarAviationStack(codigo, viagem.data_viagem, chave, papel, viagem)
      if (aoVivo) return aoVivo
    } catch {
      /* cai no estimado local */
    }
  }

  return estimarPeloHorario(codigo, papel, previsto, viagem)
}

async function buscarAviationStack(
  codigo: string,
  data: string,
  chave: string,
  papel: PapelVoo,
  viagem: Viagem,
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
      departure?: BlocoHorarioApi
      arrival?: BlocoHorarioApi
    }>
  }
  const voo = json.data?.[0]
  if (!voo) return null

  const partida = voo.departure
  const chegada = voo.arrival
  const blocoEvento = papel === 'chegada' ? chegada : partida
  const pouso =
    lerDataIso(chegada?.actual) ||
    lerDataIso(chegada?.estimated) ||
    lerDataIso(chegada?.scheduled) ||
    (papel === 'chegada' ? instanteDaViagem(viagem.data_viagem, viagem.horario) : null)
  const decolagem =
    lerDataIso(partida?.actual) ||
    lerDataIso(partida?.estimated) ||
    lerDataIso(partida?.scheduled) ||
    (pouso ? new Date(pouso.getTime() - 3 * 60 * 60 * 1000) : null)

  const quandoEvento =
    lerDataIso(blocoEvento?.estimated) ||
    lerDataIso(blocoEvento?.actual) ||
    lerDataIso(blocoEvento?.scheduled) ||
    (papel === 'chegada' ? pouso : decolagem)
  if (!quandoEvento) return null

  const minutos = Math.round((quandoEvento.getTime() - Date.now()) / 60_000)
  const atrasado = Number(blocoEvento?.delay ?? 0) > 5
  const calc = calcularProgressoVoo(decolagem, pouso)
  const origemCodigo =
    (partida?.iata ?? '').toUpperCase() ||
    codigoAeroportoDoTexto(viagem.origem) ||
    'ORIG'
  const destinoCodigo =
    (chegada?.iata ?? '').toUpperCase() ||
    codigoAeroportoDoTexto(viagem.destino) ||
    codigoAeroportoDoTexto(viagem.origem) ||
    'DEST'

  const base: StatusAcompanhamentoVoo = {
    codigo,
    papel,
    titulo: papel === 'chegada' ? 'Chegada do voo' : 'Partida do voo',
    status: rotuloStatusApi(voo.flight_status, papel, minutos, calc.progresso),
    detalhe: atrasado
      ? `Atraso informado: cerca de ${blocoEvento?.delay} min`
      : detalhePeloProgresso(papel, minutos, calc),
    horarioPrevisto: formatarHorario(quandoEvento),
    minutosParaEvento: minutos,
    atrasado,
    origemCodigo,
    origemNome: partida?.airport?.trim() || origemCodigo,
    destinoCodigo,
    destinoNome: chegada?.airport?.trim() || destinoCodigo,
    decolagemIso: decolagem?.toISOString() ?? null,
    pousoIso: pouso?.toISOString() ?? null,
    ...calc,
  }
  return base
}

function rotuloStatusApi(
  status: string | undefined,
  papel: PapelVoo,
  minutos: number,
  progresso: number,
) {
  const s = (status ?? '').toLowerCase()
  if (s === 'landed' || progresso >= 1) return 'Pouso concluído'
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
  viagem: Viagem,
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

  const pouso = papel === 'chegada' ? previsto : new Date(previsto.getTime() + 3 * 60 * 60 * 1000)
  const decolagem =
    papel === 'chegada' ? new Date(previsto.getTime() - 3 * 60 * 60 * 1000) : previsto
  const calc = calcularProgressoVoo(decolagem, pouso)

  const origemCodigo =
    papel === 'chegada'
      ? 'ORIG'
      : codigoAeroportoDoTexto(viagem.origem) || 'ORIG'
  const destinoCodigo =
    papel === 'chegada'
      ? codigoAeroportoDoTexto(viagem.origem) || 'LAX'
      : codigoAeroportoDoTexto(viagem.destino) || 'DEST'

  return {
    codigo,
    papel,
    titulo: papel === 'chegada' ? 'Chegada do voo' : 'Partida do voo',
    status,
    detalhe,
    horarioPrevisto: formatarHorario(previsto),
    minutosParaEvento: minutos,
    atrasado: false,
    origemCodigo,
    origemNome: origemCodigo === 'ORIG' ? 'Origem' : origemCodigo,
    destinoCodigo,
    destinoNome: destinoCodigo,
    decolagemIso: decolagem.toISOString(),
    pousoIso: pouso.toISOString(),
    ...calc,
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
        !/^port[aã]o\s*:/i.test(linha) &&
        !/^cliente marcou:/i.test(linha),
    )
    .join('\n')
    .trim()
}
