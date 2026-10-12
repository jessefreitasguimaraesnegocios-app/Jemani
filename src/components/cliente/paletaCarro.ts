export type TipoFrota =
  | 'classe-s'
  | 'lucid'
  | 'volvo'
  | 'escalade'
  | 'expedition'
  | 'sprinter'
  | 'shuttle'
  | 'charter'
  | 'shield'

export type EstiloCarro = {
  tipo: TipoFrota
  arquivo: string
  corCarroceria: string
  luzAmbiente: string
  luzPonto: string
  cameraY: number
  cameraZ: number
  olharY: number
}

const PRETO = '#050608'
const LUZ = '#f3ead8'

function estilo(tipo: TipoFrota, arquivo: string, cameraZ = 5.2): EstiloCarro {
  return {
    tipo,
    arquivo,
    corCarroceria: PRETO,
    luzAmbiente: '#1a1c22',
    luzPonto: LUZ,
    cameraY: 1.15,
    cameraZ,
    olharY: 0.42,
  }
}

export function obterEstiloCarro(slug: string): EstiloCarro {
  switch (slug) {
    case 'jemani-executive':
      return estilo('classe-s', '/modelos/carros/classe-s.glb')
    case 'jemani-black':
      return estilo('lucid', '/modelos/carros/lucid.glb')
    case 'jemani-luxe':
      return estilo('volvo', '/modelos/carros/volvo.glb')
    case 'jemani-suv':
      return estilo('escalade', '/modelos/carros/escalade.glb')
    case 'jemani-expedition':
      return estilo('expedition', '/modelos/carros/expedition.glb')
    case 'jemani-van':
      return estilo('sprinter', '/modelos/carros/sprinter.glb', 5.6)
    case 'jemani-limo':
      return estilo('shuttle', '/modelos/carros/shuttle.glb', 5.8)
    case 'jemani-charter':
      return estilo('charter', '/modelos/carros/charter.glb', 6.4)
    case 'jemani-shield':
      return estilo('shield', '/modelos/carros/escalade.glb')
    default:
      return estilo('classe-s', '/modelos/carros/classe-s.glb')
  }
}

export function rotuloCurtoFrota(slug: string, nome: string) {
  const mapa: Record<string, string> = {
    'jemani-executive': 'Classe S',
    'jemani-black': 'Lucid Air',
    'jemani-luxe': 'Volvo',
    'jemani-suv': 'Escalade',
    'jemani-expedition': 'Expedition',
    'jemani-van': 'Sprinter',
    'jemani-limo': 'Shuttle',
    'jemani-charter': 'Charter',
    'jemani-shield': 'Shield',
  }
  return mapa[slug] ?? nome.replace(/^JEMANI\s+/i, '')
}
