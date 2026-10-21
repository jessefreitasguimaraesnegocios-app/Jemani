import { supabase } from '@/lib/supabase'
import type { Veiculo } from '@/types'

const COLUNAS =
  'id,empresa_id,marca,modelo,ano,categoria_id,capacidade,ar_condicionado,bagageiro,fotos,placa,status,created_at,updated_at'

function veiculoDaLinha(linha: Veiculo): Veiculo {
  return {
    id: linha.id,
    empresa_id: linha.empresa_id,
    marca: linha.marca,
    modelo: linha.modelo,
    ano: Number(linha.ano),
    categoria_id: linha.categoria_id,
    capacidade: Number(linha.capacidade),
    ar_condicionado: Boolean(linha.ar_condicionado),
    bagageiro: Boolean(linha.bagageiro),
    fotos: Array.isArray(linha.fotos) ? linha.fotos.filter(Boolean) : [],
    placa: linha.placa ?? undefined,
    status: linha.status,
    created_at: linha.created_at,
    updated_at: linha.updated_at,
  }
}

export async function listarVeiculosNuvem(): Promise<Veiculo[]> {
  const db = supabase
  if (!db) return []
  const { data, error } = await db.from('vehicles').select(COLUNAS).neq('status', 'inativo')
  if (error || !data) return []
  return data.map((linha) => veiculoDaLinha(linha as Veiculo))
}

export async function gravarVeiculoNuvem(veiculo: Veiculo): Promise<void> {
  const db = supabase
  if (!db) return
  const { error } = await db.from('vehicles').upsert(
    {
      id: veiculo.id,
      empresa_id: veiculo.empresa_id,
      marca: veiculo.marca,
      modelo: veiculo.modelo,
      ano: veiculo.ano,
      categoria_id: veiculo.categoria_id,
      capacidade: veiculo.capacidade,
      ar_condicionado: veiculo.ar_condicionado,
      bagageiro: veiculo.bagageiro,
      fotos: veiculo.fotos ?? [],
      placa: veiculo.placa ?? null,
      status: veiculo.status,
      created_at: veiculo.created_at,
      updated_at: veiculo.updated_at,
    },
    { onConflict: 'id' },
  )
  if (error) throw new Error(error.message)
}

export async function gravarVeiculosNuvem(veiculos: Veiculo[]): Promise<void> {
  if (!veiculos.length) return
  const db = supabase
  if (!db) return
  const { error } = await db.from('vehicles').upsert(
    veiculos.map((veiculo) => ({
      id: veiculo.id,
      empresa_id: veiculo.empresa_id,
      marca: veiculo.marca,
      modelo: veiculo.modelo,
      ano: veiculo.ano,
      categoria_id: veiculo.categoria_id,
      capacidade: veiculo.capacidade,
      ar_condicionado: veiculo.ar_condicionado,
      bagageiro: veiculo.bagageiro,
      fotos: veiculo.fotos ?? [],
      placa: veiculo.placa ?? null,
      status: veiculo.status,
      created_at: veiculo.created_at,
      updated_at: veiculo.updated_at,
    })),
    { onConflict: 'id' },
  )
  if (error) throw new Error(error.message)
}

export async function apagarVeiculoNuvem(id: string): Promise<void> {
  const db = supabase
  if (!db || !id) return
  const { error } = await db.from('vehicles').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
