const FOTOS: Record<string, string> = {
  'jemani-expedition': '/frota/expedition.jpg',
  'jemani-luxe': '/frota/volvo.jpg',
  'jemani-executive': '/frota/classe-s.jpg',
  'jemani-black': '/frota/lucid.jpg',
  'jemani-suv': '/frota/escalade.jpg',
  'jemani-shield': '/frota/escalade.jpg',
  'jemani-van': '/frota/sprinter.jpg',
  'jemani-limo': '/frota/shuttle.jpg',
  'jemani-charter': '/frota/charter.jpg',
}

export function fotoDaFrota(slug: string) {
  return FOTOS[slug] ?? '/frota/classe-s.jpg'
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
