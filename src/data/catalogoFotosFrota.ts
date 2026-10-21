import type { FotoCatalogoVeiculo } from '@/types'

const AGORA = '2026-10-21T12:00:00.000Z'

/** Fotos oficiais da frota Jemani — pré-carregadas no catálogo do admin. */
export const CATALOGO_FOTOS_FROTA: FotoCatalogoVeiculo[] = [
  {
    id: 'ca7a1000-0000-4000-8000-000000000001',
    marca: 'Ford',
    modelo: 'Expedition',
    ano: 2024,
    nome: 'Ford Expedition',
    url: '/frota/expedition.jpg',
    created_at: AGORA,
    updated_at: AGORA,
  },
  {
    id: 'ca7a1000-0000-4000-8000-000000000002',
    marca: 'Volvo',
    modelo: 'XC90',
    ano: 2024,
    nome: 'Volvo XC90',
    url: '/frota/volvo.jpg',
    created_at: AGORA,
    updated_at: AGORA,
  },
  {
    id: 'ca7a1000-0000-4000-8000-000000000003',
    marca: 'Mercedes-Benz',
    modelo: 'Classe S',
    ano: 2024,
    nome: 'Mercedes-Benz Classe S',
    url: '/frota/classe-s.jpg',
    created_at: AGORA,
    updated_at: AGORA,
  },
  {
    id: 'ca7a1000-0000-4000-8000-000000000004',
    marca: 'Lucid',
    modelo: 'Air',
    ano: 2024,
    nome: 'Lucid Air',
    url: '/frota/lucid.jpg',
    created_at: AGORA,
    updated_at: AGORA,
  },
  {
    id: 'ca7a1000-0000-4000-8000-000000000005',
    marca: 'Cadillac',
    modelo: 'Escalade',
    ano: 2024,
    nome: 'Cadillac Escalade',
    url: '/frota/escalade.jpg',
    created_at: AGORA,
    updated_at: AGORA,
  },
  {
    id: 'ca7a1000-0000-4000-8000-000000000006',
    marca: 'Mercedes-Benz',
    modelo: 'Sprinter',
    ano: 2023,
    nome: 'Mercedes-Benz Sprinter',
    url: '/frota/sprinter.jpg',
    created_at: AGORA,
    updated_at: AGORA,
  },
  {
    id: 'ca7a1000-0000-4000-8000-000000000007',
    marca: 'Shuttle',
    modelo: 'Bus',
    ano: 2024,
    nome: 'Shuttle Bus',
    url: '/frota/shuttle.jpg',
    created_at: AGORA,
    updated_at: AGORA,
  },
  {
    id: 'ca7a1000-0000-4000-8000-000000000008',
    marca: 'Prevost',
    modelo: 'H3-45',
    ano: 2024,
    nome: 'Charter Bus Prevost H3-45',
    url: '/frota/charter.jpg',
    created_at: AGORA,
    updated_at: AGORA,
  },
]

export function fundirCatalogoComFrota(fotos: FotoCatalogoVeiculo[] = []): FotoCatalogoVeiculo[] {
  const ids = new Set(fotos.map((foto) => foto.id))
  const urls = new Set(fotos.map((foto) => foto.url.split('?')[0]))
  const faltando = CATALOGO_FOTOS_FROTA.filter(
    (foto) => !ids.has(foto.id) && !urls.has(foto.url.split('?')[0]),
  )
  if (!faltando.length) return fotos
  return [...faltando, ...fotos]
}
