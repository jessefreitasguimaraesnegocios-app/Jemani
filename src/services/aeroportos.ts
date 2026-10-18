import type { EnderecoLocal } from '@/types'

export type NivelAeroporto = 'embarque' | 'desembarque'
export type PapelEndereco = 'origem' | 'destino'

interface PontoCurb {
  latitude: number
  longitude: number
}

interface TerminalAeroporto {
  id: string
  nome: string
  embarque: PontoCurb
  desembarque: PontoCurb
}

interface Aeroporto {
  codigo: string
  sigla: string
  nome: string
  cidade: string
  estado: string
  apelidos: string[]
  terminais: TerminalAeroporto[]
}

/** Meio-fio de embarque (saídas) e desembarque (chegadas). Não é o centro do aeroporto. */
const AEROPORTOS: Aeroporto[] = [
  {
    codigo: 'lax',
    sigla: 'LAX',
    nome: 'Los Angeles International Airport',
    cidade: 'Los Angeles',
    estado: 'CA',
    apelidos: ['lax', 'los angeles international', 'los angeles airport', 'world way'],
    terminais: [
      {
        id: 't1',
        nome: 'Terminal 1',
        embarque: { latitude: 33.94562, longitude: -118.40048 },
        desembarque: { latitude: 33.94502, longitude: -118.40102 },
      },
      {
        id: 't2',
        nome: 'Terminal 2',
        embarque: { latitude: 33.94528, longitude: -118.40472 },
        desembarque: { latitude: 33.94468, longitude: -118.40522 },
      },
      {
        id: 't3',
        nome: 'Terminal 3',
        embarque: { latitude: 33.94472, longitude: -118.40895 },
        desembarque: { latitude: 33.94412, longitude: -118.40945 },
      },
      {
        id: 'tbit',
        nome: 'Tom Bradley (TBIT)',
        embarque: { latitude: 33.94295, longitude: -118.4082 },
        desembarque: { latitude: 33.94235, longitude: -118.40875 },
      },
      {
        id: 't4',
        nome: 'Terminal 4',
        embarque: { latitude: 33.94195, longitude: -118.40455 },
        desembarque: { latitude: 33.94135, longitude: -118.40505 },
      },
      {
        id: 't5',
        nome: 'Terminal 5',
        embarque: { latitude: 33.94125, longitude: -118.4017 },
        desembarque: { latitude: 33.94065, longitude: -118.4022 },
      },
      {
        id: 't6',
        nome: 'Terminal 6',
        embarque: { latitude: 33.9407, longitude: -118.39885 },
        desembarque: { latitude: 33.9401, longitude: -118.39935 },
      },
      {
        id: 't7',
        nome: 'Terminal 7',
        embarque: { latitude: 33.94285, longitude: -118.39715 },
        desembarque: { latitude: 33.94225, longitude: -118.39765 },
      },
      {
        id: 't8',
        nome: 'Terminal 8',
        embarque: { latitude: 33.94355, longitude: -118.39485 },
        desembarque: { latitude: 33.94295, longitude: -118.39535 },
      },
    ],
  },
  {
    codigo: 'bur',
    sigla: 'BUR',
    nome: 'Hollywood Burbank Airport',
    cidade: 'Burbank',
    estado: 'CA',
    apelidos: ['bur', 'hollywood burbank', 'burbank airport', 'bob hope'],
    terminais: [
      {
        id: 'ta',
        nome: 'Terminal A',
        embarque: { latitude: 34.2009, longitude: -118.3571 },
        desembarque: { latitude: 34.20035, longitude: -118.3576 },
      },
      {
        id: 'tb',
        nome: 'Terminal B',
        embarque: { latitude: 34.20075, longitude: -118.3596 },
        desembarque: { latitude: 34.2002, longitude: -118.3601 },
      },
    ],
  },
  {
    codigo: 'lgb',
    sigla: 'LGB',
    nome: 'Long Beach Airport',
    cidade: 'Long Beach',
    estado: 'CA',
    apelidos: ['lgb', 'long beach airport'],
    terminais: [
      {
        id: 'principal',
        nome: 'Terminal principal',
        embarque: { latitude: 33.81805, longitude: -118.1512 },
        desembarque: { latitude: 33.81745, longitude: -118.15175 },
      },
    ],
  },
  {
    codigo: 'sna',
    sigla: 'SNA',
    nome: 'John Wayne Airport',
    cidade: 'Santa Ana',
    estado: 'CA',
    apelidos: ['sna', 'john wayne', 'orange county airport', 'santa ana airport'],
    terminais: [
      {
        id: 'ta',
        nome: 'Terminal A',
        embarque: { latitude: 33.67655, longitude: -117.86835 },
        desembarque: { latitude: 33.67605, longitude: -117.8688 },
      },
      {
        id: 'tb',
        nome: 'Terminal B',
        embarque: { latitude: 33.67605, longitude: -117.86755 },
        desembarque: { latitude: 33.67555, longitude: -117.868 },
      },
      {
        id: 'tc',
        nome: 'Terminal C',
        embarque: { latitude: 33.67555, longitude: -117.86675 },
        desembarque: { latitude: 33.67505, longitude: -117.8672 },
      },
    ],
  },
  {
    codigo: 'ont',
    sigla: 'ONT',
    nome: 'Ontario International Airport',
    cidade: 'Ontario',
    estado: 'CA',
    apelidos: ['ont', 'ontario international', 'ontario airport'],
    terminais: [
      {
        id: 't2',
        nome: 'Terminal 2',
        embarque: { latitude: 34.0562, longitude: -117.60155 },
        desembarque: { latitude: 34.05565, longitude: -117.60205 },
      },
      {
        id: 't4',
        nome: 'Terminal 4',
        embarque: { latitude: 34.05585, longitude: -117.5979 },
        desembarque: { latitude: 34.0553, longitude: -117.5984 },
      },
    ],
  },
]

export function normalizarBuscaEndereco(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function apelidoCabe(consulta: string, apelido: string): boolean {
  const alvo = normalizarBuscaEndereco(apelido)
  if (!alvo || !consulta) return false
  if (alvo.length <= 4) {
    return new RegExp(`(?:^|\\s)${alvo}(?:\\s|$)`).test(consulta)
  }
  return consulta.includes(alvo)
}

export function acharAeroporto(texto: string): Aeroporto | undefined {
  const consulta = normalizarBuscaEndereco(texto)
  if (!consulta) return undefined
  let melhor: { aero: Aeroporto; peso: number } | undefined
  for (const aero of AEROPORTOS) {
    for (const apelido of aero.apelidos) {
      if (!apelidoCabe(consulta, apelido)) continue
      const peso = normalizarBuscaEndereco(apelido).length
      if (!melhor || peso > melhor.peso) melhor = { aero, peso }
    }
  }
  return melhor?.aero
}

export function aeroportoPorCodigo(codigo: string): Aeroporto | undefined {
  return AEROPORTOS.find((aero) => aero.codigo === codigo)
}

export function listarTerminais(codigo: string): TerminalAeroporto[] {
  return aeroportoPorCodigo(codigo)?.terminais ?? []
}

export function acharTerminal(aero: Aeroporto, texto: string): TerminalAeroporto | undefined {
  const consulta = normalizarBuscaEndereco(texto)
  if (!consulta) return undefined
  if (/\b(tbit|tom bradley|bradley)\b/.test(consulta)) {
    return aero.terminais.find((terminal) => terminal.id === 'tbit')
  }
  const porNome = aero.terminais.find((terminal) =>
    consulta.includes(normalizarBuscaEndereco(terminal.nome)),
  )
  if (porNome) return porNome
  const numero = consulta.match(/\bterminal\s+([0-9]+|a|b|c)\b/)
  if (!numero) return undefined
  return aero.terminais.find((terminal) => terminal.id === `t${numero[1]}`)
}

export function nivelSugerido(papel?: PapelEndereco): NivelAeroporto {
  return papel === 'destino' ? 'embarque' : 'desembarque'
}

export function rotuloNivel(nivel: NivelAeroporto): string {
  return nivel === 'embarque' ? 'Embarque (saídas)' : 'Desembarque (chegadas)'
}

export function descricaoEhPontoFixoDeAeroporto(description: string): boolean {
  const consulta = normalizarBuscaEndereco(description)
  if (/\bworld way\b/.test(consulta)) return true
  if (/\baeroporto\b/.test(consulta) && acharAeroporto(description)) return true
  if (!/\bairport\b/.test(consulta)) return false
  return Boolean(acharAeroporto(description))
}

function textoDoPonto(
  aero: Aeroporto,
  terminal: TerminalAeroporto | undefined,
  nivel: NivelAeroporto | undefined,
  complemento?: string,
): string {
  if (!terminal || !nivel) {
    return `${aero.sigla} · ${aero.nome}, ${aero.cidade}, ${aero.estado}`
  }
  const base = `${aero.sigla} · ${terminal.nome} · ${rotuloNivel(nivel)}, ${aero.nome}, ${aero.cidade}, ${aero.estado}`
  const extra = complemento?.trim()
  return extra ? `${base} · ${extra}` : base
}

export function montarPontoAeroporto(
  codigo: string,
  terminalId: string,
  nivel: NivelAeroporto,
  complemento?: string,
): EnderecoLocal | null {
  const aero = aeroportoPorCodigo(codigo)
  const terminal = aero?.terminais.find((item) => item.id === terminalId)
  if (!aero || !terminal) return null
  const ponto = terminal[nivel]
  return {
    formatted: textoDoPonto(aero, terminal, nivel, complemento),
    latitude: ponto.latitude,
    longitude: ponto.longitude,
    place_id: `aero:${aero.codigo}:${terminal.id}`,
    source: 'mapbox',
    cidade: aero.cidade,
    estado: aero.estado,
    complemento: complemento?.trim() || undefined,
    codigo_aeroporto: aero.codigo,
    terminal_id: terminal.id,
    nivel_aeroporto: nivel,
    numero_confirmado: true,
  }
}

export function criarSelecaoAeroporto(
  codigo: string,
  terminalId: string | undefined,
  nivel: NivelAeroporto | undefined,
  complemento?: string,
): EnderecoLocal | null {
  const aero = aeroportoPorCodigo(codigo)
  if (!aero) return null
  if (terminalId && nivel) {
    return montarPontoAeroporto(codigo, terminalId, nivel, complemento)
  }
  const terminal = aero.terminais.find((item) => item.id === terminalId)
  return {
    formatted: textoDoPonto(aero, terminal, nivel, complemento),
    latitude: Number.NaN,
    longitude: Number.NaN,
    place_id: terminal ? `aero:${aero.codigo}:${terminal.id}` : `aero:${aero.codigo}`,
    source: 'mapbox',
    cidade: aero.cidade,
    estado: aero.estado,
    complemento: complemento?.trim() || undefined,
    codigo_aeroporto: aero.codigo,
    terminal_id: terminal?.id,
    nivel_aeroporto: nivel,
  }
}

export function selecaoAeroporto(
  placeId: string,
  texto: string,
  papel?: PapelEndereco,
): EnderecoLocal | null {
  let codigo: string | undefined
  let terminalId: string | undefined
  if (placeId.startsWith('aero:')) {
    const partes = placeId.split(':')
    codigo = partes[1]
    terminalId = partes[2]
  }
  if (placeId === 'dev_lax') codigo = 'lax'
  const aero = (codigo ? aeroportoPorCodigo(codigo) : undefined) ?? acharAeroporto(texto)
  if (!aero) return null
  if (!descricaoEhPontoFixoDeAeroporto(texto) && !placeId.startsWith('aero:') && placeId !== 'dev_lax') {
    return null
  }
  if (!terminalId) terminalId = acharTerminal(aero, texto)?.id
  if (!terminalId && aero.terminais.length === 1) terminalId = aero.terminais[0].id
  return criarSelecaoAeroporto(aero.codigo, terminalId, nivelSugerido(papel))
}

export function sugerirAeroportos(termo: string): Array<{ description: string; place_id: string }> {
  const consulta = normalizarBuscaEndereco(termo)
  if (consulta.length < 2) return []
  const generico = /^(airport|aeroporto)$/.test(consulta) || /\b(airport|aeroporto)\b/.test(consulta)
  const saida: Array<{ description: string; place_id: string }> = []
  const vistos = new Set<string>()

  function incluir(description: string, placeId: string) {
    if (vistos.has(placeId)) return
    vistos.add(placeId)
    saida.push({ description, place_id: placeId })
  }

  const citaTerminal = /\b(terminal|tbit|tom bradley|bradley)\b/.test(consulta)
  const aeroCitado = acharAeroporto(termo)
  if (citaTerminal) {
    for (const aero of AEROPORTOS) {
      if (aeroCitado && aero.codigo !== aeroCitado.codigo) continue
      const terminal = acharTerminal(aero, termo)
      if (!terminal) continue
      incluir(
        `${aero.sigla} · ${terminal.nome} · ${aero.nome}`,
        `aero:${aero.codigo}:${terminal.id}`,
      )
    }
  }

  if (saida.length > 0) return saida.slice(0, 6)

  for (const aero of AEROPORTOS) {
    const casa = aero.apelidos.some((apelido) => apelidoCabe(consulta, apelido))
    if (!casa) continue
    incluir(
      `${aero.sigla} · ${aero.nome} · escolher terminal`,
      `aero:${aero.codigo}`,
    )
  }

  if (saida.length > 0 || !generico) return saida.slice(0, 6)

  return AEROPORTOS.map((aero) => ({
    description: `${aero.sigla} · ${aero.nome} · escolher terminal`,
    place_id: `aero:${aero.codigo}`,
  }))
}

export function atualizarPontoAeroporto(
  endereco: EnderecoLocal,
  terminalId: string,
  nivel: NivelAeroporto,
  complemento?: string,
): EnderecoLocal {
  if (!endereco.codigo_aeroporto) return endereco
  return (
    montarPontoAeroporto(endereco.codigo_aeroporto, terminalId, nivel, complemento) ?? endereco
  )
}
