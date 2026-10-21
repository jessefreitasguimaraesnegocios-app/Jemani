import { CATALOGO_FOTOS_FROTA, fundirCatalogoComFrota } from '@/data/catalogoFotosFrota'
import { supabase } from '@/lib/supabase'
import type { FotoCatalogoVeiculo } from '@/types'
import { otimizarFotoVeiculo } from '@/utils/otimizarFoto'
import { gerarId } from '@/utils/format'

function fotoDaLinha(linha: FotoCatalogoVeiculo): FotoCatalogoVeiculo {
  return {
    id: linha.id,
    marca: linha.marca,
    modelo: linha.modelo,
    ano: Number(linha.ano),
    nome: linha.nome,
    url: linha.url,
    created_at: linha.created_at,
    updated_at: linha.updated_at,
  }
}

export async function listarCatalogoFotosVeiculo(): Promise<FotoCatalogoVeiculo[]> {
  const db = supabase
  if (!db) return fundirCatalogoComFrota([])
  const { data, error } = await db
    .from('catalogo_fotos_veiculo')
    .select('*')
    .order('marca')
    .order('modelo')
    .order('ano', { ascending: false })
  if (error || !data) return fundirCatalogoComFrota([])
  return fundirCatalogoComFrota(data.map((linha) => fotoDaLinha(linha as FotoCatalogoVeiculo)))
}

/** Garante as fotos oficiais da frota na tabela (admin). */
export async function garantirFotosFrotaNoCatalogo(): Promise<FotoCatalogoVeiculo[]> {
  const db = supabase
  if (!db) return fundirCatalogoComFrota([])

  const atuais = await listarCatalogoFotosVeiculo()
  const ids = new Set(atuais.map((foto) => foto.id))
  const faltando = CATALOGO_FOTOS_FROTA.filter((foto) => !ids.has(foto.id))
  if (faltando.length) {
    const { error } = await db.from('catalogo_fotos_veiculo').upsert(
      faltando.map((foto) => ({
        id: foto.id,
        marca: foto.marca,
        modelo: foto.modelo,
        ano: foto.ano,
        nome: foto.nome,
        url: foto.url,
      })),
      { onConflict: 'id' },
    )
    if (error) {
      // Sem tabela/RLS ainda: mantém só o catálogo local da frota.
      return fundirCatalogoComFrota(atuais)
    }
  }
  return listarCatalogoFotosVeiculo()
}

export async function cadastrarFotoCatalogoVeiculo(dados: {
  marca: string
  modelo: string
  ano: number
  nome: string
  arquivo: File
}): Promise<FotoCatalogoVeiculo> {
  const marca = dados.marca.trim()
  const modelo = dados.modelo.trim()
  const nome = dados.nome.trim() || `${marca} ${modelo} ${dados.ano}`
  if (!marca || !modelo || !dados.ano) {
    throw new Error('Preencha marca, modelo e ano.')
  }

  const otimizada = await otimizarFotoVeiculo(dados.arquivo)
  const id = gerarId()
  const agora = new Date().toISOString()

  if (!supabase) {
    return {
      id,
      marca,
      modelo,
      ano: dados.ano,
      nome,
      url: otimizada.dataUrl,
      created_at: agora,
      updated_at: agora,
    }
  }

  const caminho = `${id}/foto.${otimizada.extensao}`
  const { error: erroUpload } = await supabase.storage
    .from('veiculos-catalogo')
    .upload(caminho, otimizada.blob, {
      upsert: true,
      contentType: otimizada.tipo,
      cacheControl: '3600',
    })
  if (erroUpload) throw new Error(erroUpload.message)

  const { data: pub } = supabase.storage.from('veiculos-catalogo').getPublicUrl(caminho)
  const url = `${pub.publicUrl}?v=${Date.now()}`

  const { data, error } = await supabase
    .from('catalogo_fotos_veiculo')
    .insert({
      id,
      marca,
      modelo,
      ano: dados.ano,
      nome,
      url,
    })
    .select('*')
    .single()

  if (error || !data) {
    await supabase.storage.from('veiculos-catalogo').remove([caminho])
    throw new Error(error?.message || 'Falha ao salvar no catálogo')
  }

  return fotoDaLinha(data as FotoCatalogoVeiculo)
}

export async function removerFotoCatalogoVeiculo(foto: FotoCatalogoVeiculo): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('catalogo_fotos_veiculo').delete().eq('id', foto.id)
  if (error) throw new Error(error.message)
  const { data: arquivos } = await supabase.storage.from('veiculos-catalogo').list(foto.id)
  if (arquivos?.length) {
    await supabase.storage
      .from('veiculos-catalogo')
      .remove(arquivos.map((item) => `${foto.id}/${item.name}`))
  }
}
