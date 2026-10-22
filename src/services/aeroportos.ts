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

/** Offset ~50 m no meio-fio quando o aeroporto só tem terminal principal. */
function terminalPrincipal(lat: number, lng: number): TerminalAeroporto[] {
  const d = 0.00045
  return [
    {
      id: 'principal',
      nome: 'Terminal principal',
      embarque: { latitude: lat + d, longitude: lng },
      desembarque: { latitude: lat - d, longitude: lng },
    },
  ]
}

function aero(
  codigo: string,
  sigla: string,
  nome: string,
  cidade: string,
  estado: string,
  lat: number,
  lng: number,
  apelidos: string[] = [],
): Aeroporto {
  return {
    codigo,
    sigla,
    nome,
    cidade,
    estado,
    apelidos: [codigo, sigla.toLowerCase(), ...apelidos],
    terminais: terminalPrincipal(lat, lng),
  }
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
  // EUA (fora do hub LA já detalhado acima)
  aero('jfk', 'JFK', 'John F. Kennedy International Airport', 'New York', 'NY', 40.6413, -73.7781, [
    'kennedy',
    'jfk airport',
    'john f kennedy',
  ]),
  aero('lga', 'LGA', 'LaGuardia Airport', 'New York', 'NY', 40.7769, -73.874, ['laguardia']),
  aero('ewr', 'EWR', 'Newark Liberty International Airport', 'Newark', 'NJ', 40.6895, -74.1745, [
    'newark',
  ]),
  aero('ord', 'ORD', "O'Hare International Airport", 'Chicago', 'IL', 41.9742, -87.9073, [
    'ohare',
    "o'hare",
  ]),
  aero('mdw', 'MDW', 'Chicago Midway International Airport', 'Chicago', 'IL', 41.7868, -87.7522, [
    'midway',
  ]),
  aero('atl', 'ATL', 'Hartsfield-Jackson Atlanta International Airport', 'Atlanta', 'GA', 33.6407, -84.4277, [
    'hartsfield',
    'atlanta airport',
  ]),
  aero('dfw', 'DFW', 'Dallas/Fort Worth International Airport', 'Dallas', 'TX', 32.8998, -97.0403, [
    'dallas fort worth',
    'dfw airport',
  ]),
  aero('dal', 'DAL', 'Dallas Love Field', 'Dallas', 'TX', 32.8471, -96.8518, ['love field']),
  aero('iah', 'IAH', 'George Bush Intercontinental Airport', 'Houston', 'TX', 29.9902, -95.3368, [
    'bush intercontinental',
    'houston airport',
  ]),
  aero('hou', 'HOU', 'William P. Hobby Airport', 'Houston', 'TX', 29.6454, -95.2789, ['hobby']),
  aero('aus', 'AUS', 'Austin-Bergstrom International Airport', 'Austin', 'TX', 30.1945, -97.6699, [
    'bergstrom',
  ]),
  aero('den', 'DEN', 'Denver International Airport', 'Denver', 'CO', 39.8561, -104.6737, [
    'denver airport',
  ]),
  aero('sea', 'SEA', 'Seattle-Tacoma International Airport', 'Seattle', 'WA', 47.4502, -122.3088, [
    'seatac',
    'sea tac',
  ]),
  aero('sfo', 'SFO', 'San Francisco International Airport', 'San Francisco', 'CA', 37.6213, -122.379, [
    'san francisco airport',
  ]),
  aero('sjc', 'SJC', 'San Jose Mineta International Airport', 'San Jose', 'CA', 37.3639, -121.9289, [
    'san jose airport',
    'mineta',
  ]),
  aero('san', 'SAN', 'San Diego International Airport', 'San Diego', 'CA', 32.7338, -117.1933, [
    'san diego airport',
    'lindbergh',
  ]),
  aero('phx', 'PHX', 'Phoenix Sky Harbor International Airport', 'Phoenix', 'AZ', 33.4373, -112.0078, [
    'sky harbor',
  ]),
  aero('las', 'LAS', 'Harry Reid International Airport', 'Las Vegas', 'NV', 36.084, -115.1537, [
    'mccarran',
    'harry reid',
    'las vegas airport',
  ]),
  aero('mia', 'MIA', 'Miami International Airport', 'Miami', 'FL', 25.7959, -80.287, ['miami airport']),
  aero('fll', 'FLL', 'Fort Lauderdale-Hollywood International Airport', 'Fort Lauderdale', 'FL', 26.0726, -80.1527, [
    'fort lauderdale',
  ]),
  aero('mco', 'MCO', 'Orlando International Airport', 'Orlando', 'FL', 28.4312, -81.3081, [
    'orlando airport',
  ]),
  aero('tpa', 'TPA', 'Tampa International Airport', 'Tampa', 'FL', 27.9755, -82.5332, ['tampa airport']),
  aero('bos', 'BOS', 'Logan International Airport', 'Boston', 'MA', 42.3656, -71.0096, [
    'logan',
    'boston airport',
  ]),
  aero('phl', 'PHL', 'Philadelphia International Airport', 'Philadelphia', 'PA', 39.8744, -75.2424, [
    'philadelphia airport',
  ]),
  aero('bwi', 'BWI', 'Baltimore/Washington International Airport', 'Baltimore', 'MD', 39.1774, -76.6684, [
    'baltimore',
    'bwi airport',
  ]),
  aero('iad', 'IAD', 'Washington Dulles International Airport', 'Dulles', 'VA', 38.9531, -77.4565, [
    'dulles',
  ]),
  aero('dca', 'DCA', 'Ronald Reagan Washington National Airport', 'Arlington', 'VA', 38.8512, -77.0402, [
    'reagan',
    'national airport',
  ]),
  aero('clt', 'CLT', 'Charlotte Douglas International Airport', 'Charlotte', 'NC', 35.2144, -80.9473, [
    'charlotte airport',
  ]),
  aero('msp', 'MSP', 'Minneapolis-Saint Paul International Airport', 'Minneapolis', 'MN', 44.8848, -93.2223, [
    'minneapolis airport',
  ]),
  aero('dtw', 'DTW', 'Detroit Metropolitan Wayne County Airport', 'Detroit', 'MI', 42.2162, -83.3554, [
    'detroit airport',
  ]),
  aero('slc', 'SLC', 'Salt Lake City International Airport', 'Salt Lake City', 'UT', 40.7899, -111.9791, [
    'salt lake',
  ]),
  aero('pdx', 'PDX', 'Portland International Airport', 'Portland', 'OR', 45.5898, -122.5951, [
    'portland airport',
  ]),
  aero('hnl', 'HNL', 'Daniel K. Inouye International Airport', 'Honolulu', 'HI', 21.3187, -157.9225, [
    'honolulu',
    'inouye',
  ]),
  aero('rdu', 'RDU', 'Raleigh-Durham International Airport', 'Raleigh', 'NC', 35.8776, -78.7875, [
    'raleigh',
    'durham',
  ]),
  aero('bna', 'BNA', 'Nashville International Airport', 'Nashville', 'TN', 36.1263, -86.6774, [
    'nashville airport',
  ]),
  aero('stl', 'STL', 'St. Louis Lambert International Airport', 'St. Louis', 'MO', 38.7499, -90.3748, [
    'lambert',
    'st louis',
  ]),
  // Mundo
  aero('yyz', 'YYZ', 'Toronto Pearson International Airport', 'Toronto', 'ON', 43.6777, -79.6248, [
    'pearson',
    'toronto airport',
  ]),
  aero('yvr', 'YVR', 'Vancouver International Airport', 'Vancouver', 'BC', 49.1967, -123.1815, [
    'vancouver airport',
  ]),
  aero('mex', 'MEX', 'Mexico City International Airport', 'Mexico City', 'CDMX', 19.4361, -99.0719, [
    'benito juarez',
    'mexico city airport',
  ]),
  aero('cun', 'CUN', 'Cancún International Airport', 'Cancún', 'QR', 21.0365, -86.8771, ['cancun']),
  aero('gru', 'GRU', 'São Paulo/Guarulhos International Airport', 'Guarulhos', 'SP', -23.4356, -46.4731, [
    'guarulhos',
    'sao paulo airport',
  ]),
  aero('gig', 'GIG', 'Rio de Janeiro/Galeão International Airport', 'Rio de Janeiro', 'RJ', -22.809, -43.2506, [
    'galeao',
    'galeão',
  ]),
  aero('eze', 'EZE', 'Ministro Pistarini International Airport', 'Ezeiza', 'BA', -34.8222, -58.5358, [
    'ezeiza',
    'buenos aires airport',
  ]),
  aero('lhr', 'LHR', 'London Heathrow Airport', 'London', 'ENG', 51.47, -0.4543, ['heathrow']),
  aero('lgw', 'LGW', 'London Gatwick Airport', 'London', 'ENG', 51.1537, -0.1821, ['gatwick']),
  aero('cdg', 'CDG', 'Paris Charles de Gaulle Airport', 'Paris', 'IDF', 49.0097, 2.5479, [
    'charles de gaulle',
    'roissy',
  ]),
  aero('ory', 'ORY', 'Paris Orly Airport', 'Paris', 'IDF', 48.7262, 2.3652, ['orly']),
  aero('ams', 'AMS', 'Amsterdam Airport Schiphol', 'Amsterdam', 'NH', 52.3105, 4.7683, ['schiphol']),
  aero('fra', 'FRA', 'Frankfurt Airport', 'Frankfurt', 'HE', 50.0379, 8.5622, ['frankfurt airport']),
  aero('mad', 'MAD', 'Adolfo Suárez Madrid-Barajas Airport', 'Madrid', 'MD', 40.4983, -3.5676, [
    'barajas',
    'madrid airport',
  ]),
  aero('bcn', 'BCN', 'Barcelona-El Prat Airport', 'Barcelona', 'CT', 41.2974, 2.0833, ['el prat']),
  aero('fco', 'FCO', 'Leonardo da Vinci–Fiumicino Airport', 'Rome', 'RM', 41.8003, 12.2389, [
    'fiumicino',
    'rome airport',
  ]),
  aero('mxp', 'MXP', 'Milan Malpensa Airport', 'Milan', 'MI', 45.6306, 8.7281, ['malpensa']),
  aero('zrh', 'ZRH', 'Zurich Airport', 'Zurich', 'ZH', 47.4582, 8.5555, ['zurich airport']),
  aero('lis', 'LIS', 'Humberto Delgado Airport', 'Lisbon', 'PT', 38.7756, -9.1354, [
    'lisbon airport',
    'portela',
  ]),
  aero('dub', 'DUB', 'Dublin Airport', 'Dublin', 'D', 53.4264, -6.2499, ['dublin airport']),
  aero('ist', 'IST', 'Istanbul Airport', 'Istanbul', 'TR', 41.2753, 28.7519, ['istanbul airport']),
  aero('dxb', 'DXB', 'Dubai International Airport', 'Dubai', 'DU', 25.2532, 55.3657, ['dubai airport']),
  aero('doh', 'DOH', 'Hamad International Airport', 'Doha', 'QA', 25.2731, 51.6081, ['hamad', 'doha']),
  aero('auh', 'AUH', 'Zayed International Airport', 'Abu Dhabi', 'AZ', 24.4439, 54.6511, [
    'abu dhabi airport',
  ]),
  aero('nrt', 'NRT', 'Narita International Airport', 'Narita', 'JP', 35.772, 140.3929, ['narita']),
  aero('hnd', 'HND', 'Haneda Airport', 'Tokyo', 'JP', 35.5494, 139.7798, ['haneda', 'tokyo haneda']),
  aero('kix', 'KIX', 'Kansai International Airport', 'Osaka', 'JP', 34.4347, 135.244, ['kansai']),
  aero('icn', 'ICN', 'Incheon International Airport', 'Incheon', 'KR', 37.4602, 126.4407, ['incheon']),
  aero('hkg', 'HKG', 'Hong Kong International Airport', 'Hong Kong', 'HK', 22.308, 113.9185, [
    'hong kong airport',
  ]),
  aero('sin', 'SIN', 'Singapore Changi Airport', 'Singapore', 'SG', 1.3644, 103.9915, ['changi']),
  aero('bkk', 'BKK', 'Suvarnabhumi Airport', 'Bangkok', 'TH', 13.69, 100.7501, [
    'suvarnabhumi',
    'bangkok airport',
  ]),
  aero('del', 'DEL', 'Indira Gandhi International Airport', 'New Delhi', 'DL', 28.5562, 77.1, [
    'delhi airport',
    'indira gandhi',
  ]),
  aero('bom', 'BOM', 'Chhatrapati Shivaji Maharaj International Airport', 'Mumbai', 'MH', 19.0896, 72.8656, [
    'mumbai airport',
    'bombay',
  ]),
  aero('syd', 'SYD', 'Sydney Kingsford Smith Airport', 'Sydney', 'NSW', -33.9399, 151.1753, [
    'sydney airport',
    'kingsford smith',
  ]),
  aero('mel', 'MEL', 'Melbourne Airport', 'Melbourne', 'VIC', -37.669, 144.841, ['melbourne airport']),
  aero('akl', 'AKL', 'Auckland Airport', 'Auckland', 'AUK', -37.0082, 174.785, ['auckland airport']),
  aero('jnb', 'JNB', 'O. R. Tambo International Airport', 'Johannesburg', 'GP', -26.1392, 28.246, [
    'tambo',
    'johannesburg airport',
  ]),
  aero('cpt', 'CPT', 'Cape Town International Airport', 'Cape Town', 'WC', -33.9715, 18.6021, [
    'cape town airport',
  ]),
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
  const locais = aeroportoPorCodigo(codigo)?.terminais
  if (locais?.length) return locais
  return terminalPrincipal(0, 0)
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

/** Rua chamada "Airport Blvd" etc. não é ponto de aeroporto. */
function textoEhViaComNomeAeroporto(consulta: string): boolean {
  return /\bairport\s+(blvd|boulevard|rd|road|dr|drive|ave|avenue|st|street|way|hwy|ln|lane)\b/.test(
    consulta,
  )
}

export function descricaoEhPontoFixoDeAeroporto(description: string): boolean {
  const consulta = normalizarBuscaEndereco(description)
  if (!consulta) return false
  if (textoEhViaComNomeAeroporto(consulta)) return false
  if (/\bworld way\b/.test(consulta)) return true
  if (/\b(airport|aeroporto)\b/.test(consulta)) return true
  const aero = acharAeroporto(description)
  if (!aero) return false
  if (consulta === aero.codigo || consulta === normalizarBuscaEndereco(aero.sigla)) return true
  if (/\b(terminal|tbit|bradley)\b/.test(consulta)) return true
  return aero.apelidos.some((apelido) => {
    const alvo = normalizarBuscaEndereco(apelido)
    return alvo.length > 4 && consulta.includes(alvo)
  })
}

function extrairCodigoIata(texto: string): string | undefined {
  const conhecido = acharAeroporto(texto)
  if (conhecido) return conhecido.codigo
  const m = texto.toUpperCase().match(/\b([A-Z]{3})\b/g)
  if (!m) return undefined
  for (const sigla of m) {
    const codigo = sigla.toLowerCase()
    if (aeroportoPorCodigo(codigo)) return codigo
  }
  return undefined
}

/** POI do Mapbox (qualquer país) vira ponto de meio-fio com terminal principal. */
export function montarAeroportoDeMapa(
  base: EnderecoLocal,
  papel?: PapelEndereco,
  complemento?: string,
): EnderecoLocal | null {
  if (!Number.isFinite(base.latitude) || !Number.isFinite(base.longitude)) return null
  const nivel = nivelSugerido(papel)
  const codigo = extrairCodigoIata(`${base.formatted} ${base.rua ?? ''}`) ?? 'mapa'
  const cadastrado = montarPontoAeroporto(codigo, 'principal', nivel, complemento)
  if (cadastrado) {
    return {
      ...cadastrado,
      place_id: base.place_id ?? cadastrado.place_id,
      source: base.source ?? cadastrado.source,
    }
  }
  const d = 0.00045
  const latitude = nivel === 'embarque' ? base.latitude + d : base.latitude - d
  const longitude = base.longitude
  const sigla = codigo === 'mapa' ? '' : `${codigo.toUpperCase()} · `
  const extra = complemento?.trim()
  const formatted = `${sigla}${base.formatted} · ${rotuloNivel(nivel)}${extra ? ` · ${extra}` : ''}`
  return {
    ...base,
    formatted,
    latitude,
    longitude,
    place_id: base.place_id?.startsWith('aero:')
      ? base.place_id
      : `aero:${codigo}:principal`,
    codigo_aeroporto: codigo,
    terminal_id: 'principal',
    nivel_aeroporto: nivel,
    complemento: extra || undefined,
    numero_confirmado: true,
  }
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
  const montado = montarPontoAeroporto(
    endereco.codigo_aeroporto,
    terminalId,
    nivel,
    complemento,
  )
  if (montado) return montado
  const d = 0.00045
  const centroLat =
    Number.isFinite(endereco.latitude)
      ? endereco.nivel_aeroporto === 'embarque'
        ? endereco.latitude - d
        : endereco.nivel_aeroporto === 'desembarque'
          ? endereco.latitude + d
          : endereco.latitude
      : endereco.latitude
  const latitude =
    nivel === 'embarque' ? centroLat + d : nivel === 'desembarque' ? centroLat - d : centroLat
  const extra = complemento?.trim()
  const baseTexto = endereco.formatted
    .replace(/\s·\sEmbarque \(saídas\).*$/i, '')
    .replace(/\s·\sDesembarque \(chegadas\).*$/i, '')
  return {
    ...endereco,
    latitude,
    longitude: endereco.longitude,
    terminal_id: terminalId || 'principal',
    nivel_aeroporto: nivel,
    complemento: extra || undefined,
    numero_confirmado: true,
    formatted: `${baseTexto} · ${rotuloNivel(nivel)}${extra ? ` · ${extra}` : ''}`,
  }
}
