import type { EnderecoLocal } from '@/types'

const CHAVE = 'jemani-enderecos-recentes'
const MAX = 8

export type SugestaoEndereco = {
  description: string
  place_id: string
  tipo?: 'address' | 'poi' | 'airport' | 'recent' | 'nearby' | 'popular'
  endereco?: EnderecoLocal
}

export function lerEnderecosRecentes(): SugestaoEndereco[] {
  if (typeof window === 'undefined') return []
  try {
    const bruto = window.localStorage.getItem(CHAVE)
    if (!bruto) return []
    const lista = JSON.parse(bruto) as SugestaoEndereco[]
    return Array.isArray(lista) ? lista.slice(0, MAX) : []
  } catch {
    return []
  }
}

export function gravarEnderecoRecente(endereco: EnderecoLocal) {
  if (typeof window === 'undefined' || !endereco.formatted?.trim()) return
  const item: SugestaoEndereco = {
    description: endereco.formatted,
    place_id: endereco.place_id ?? `recente:${endereco.formatted}`,
    tipo: 'recent',
    endereco,
  }
  const atuais = lerEnderecosRecentes().filter(
    (s) => s.place_id !== item.place_id && s.description !== item.description,
  )
  window.localStorage.setItem(CHAVE, JSON.stringify([item, ...atuais].slice(0, MAX)))
}

export function filtrarRecentes(termo: string): SugestaoEndereco[] {
  const t = termo.trim().toLowerCase()
  const lista = lerEnderecosRecentes()
  if (!t) return lista
  return lista.filter((s) => s.description.toLowerCase().includes(t))
}
