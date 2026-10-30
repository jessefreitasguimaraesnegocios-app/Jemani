import { supabase } from '@/lib/supabase'
import type {
  CategoriaVeiculo,
  ConfiguracaoPlataforma,
  Empresa,
  RegraPreco,
  StatusEmpresa,
} from '@/types'

const COLUNAS_CATEGORIA =
  'id,nome,slug,descricao,capacidade_min,capacidade_max,adicional_preco,ativo,ordem,created_at,updated_at'

const COLUNAS_PRECO =
  'id,nome,preco_base,preco_por_km,preco_minimo,adicional_horario_noturno,horario_noturno_inicio,horario_noturno_fim,distancia_padrao_km,preco_por_hora,franquia_milhas_por_hora,preco_por_milha_excedente,duracao_minima_minutos,duracao_maxima_minutos,pacotes_minutos,regra_extensao,regra_cancelamento,cobrancas_adicionais,ativo,created_at,updated_at'

const COLUNAS_CONFIG = 'id,chave,valor,descricao,updated_at'

const COLUNAS_EMPRESA =
  'id,usuario_id,nome_comercial,razao_social,cnpj,telefone,email,cidade,endereco_base,latitude,longitude,regioes_atendidas,categorias_ids,status,habilitada_receber,avaliacao_media,comissao_percentual,stripe_account_id,created_at,updated_at'

/** Configurações que vivem em platform_settings (não preferência local do aparelho). */
export const CHAVES_CONFIG_NUVEM = new Set([
  'comissao_percentual',
  'nome_plataforma',
  'taxa_servico',
  'regiao_atuacao',
  'hourly_paradas_por_bloco',
  'hourly_raio_paradas_km',
  'reserva_antecedencia_horas',
])

function horaCurta(valor: string | null | undefined, padrao: string): string {
  if (!valor) return padrao
  return valor.length >= 5 ? valor.slice(0, 5) : valor
}

function categoriaDaLinha(linha: Record<string, unknown>): CategoriaVeiculo {
  return {
    id: String(linha.id),
    nome: String(linha.nome),
    slug: String(linha.slug),
    descricao: linha.descricao != null ? String(linha.descricao) : undefined,
    capacidade_min: Number(linha.capacidade_min ?? 1),
    capacidade_max: Number(linha.capacidade_max ?? 4),
    adicional_preco: Number(linha.adicional_preco ?? 0),
    ativo: Boolean(linha.ativo ?? true),
    ordem: Number(linha.ordem ?? 0),
    created_at: String(linha.created_at),
    updated_at: String(linha.updated_at),
  }
}

function regraDaLinha(linha: Record<string, unknown>): RegraPreco {
  const pacotes = Array.isArray(linha.pacotes_minutos)
    ? (linha.pacotes_minutos as number[]).map(Number)
    : [120, 180, 240, 300, 360, 480]
  return {
    id: String(linha.id),
    nome: String(linha.nome),
    preco_base: Number(linha.preco_base ?? 0),
    preco_por_km: Number(linha.preco_por_km ?? 0),
    preco_minimo: Number(linha.preco_minimo ?? 0),
    adicional_horario_noturno: Number(linha.adicional_horario_noturno ?? 0),
    horario_noturno_inicio: horaCurta(String(linha.horario_noturno_inicio ?? '22:00'), '22:00'),
    horario_noturno_fim: horaCurta(String(linha.horario_noturno_fim ?? '06:00'), '06:00'),
    distancia_padrao_km: Number(linha.distancia_padrao_km ?? 20),
    preco_por_hora: Number(linha.preco_por_hora ?? 0),
    franquia_milhas_por_hora: Number(linha.franquia_milhas_por_hora ?? 0),
    preco_por_milha_excedente: Number(linha.preco_por_milha_excedente ?? 0),
    duracao_minima_minutos: Number(linha.duracao_minima_minutos ?? 120),
    duracao_maxima_minutos: Number(linha.duracao_maxima_minutos ?? 720),
    pacotes_minutos: pacotes,
    regra_extensao: linha.regra_extensao != null ? String(linha.regra_extensao) : undefined,
    regra_cancelamento:
      linha.regra_cancelamento != null ? String(linha.regra_cancelamento) : undefined,
    cobrancas_adicionais:
      linha.cobrancas_adicionais != null ? String(linha.cobrancas_adicionais) : undefined,
    ativo: Boolean(linha.ativo ?? true),
    created_at: String(linha.created_at),
    updated_at: String(linha.updated_at),
  }
}

function configDaLinha(linha: Record<string, unknown>): ConfiguracaoPlataforma {
  return {
    id: String(linha.id),
    chave: String(linha.chave),
    valor: String(linha.valor),
    descricao: linha.descricao != null ? String(linha.descricao) : undefined,
    updated_at: String(linha.updated_at),
  }
}

function empresaDaLinha(linha: Record<string, unknown>): Empresa {
  return {
    id: String(linha.id),
    usuario_id: String(linha.usuario_id),
    nome_comercial: String(linha.nome_comercial),
    razao_social: String(linha.razao_social),
    cnpj: String(linha.cnpj),
    telefone: String(linha.telefone),
    email: String(linha.email),
    cidade: String(linha.cidade),
    endereco_base: linha.endereco_base != null ? String(linha.endereco_base) : undefined,
    latitude: linha.latitude != null ? Number(linha.latitude) : undefined,
    longitude: linha.longitude != null ? Number(linha.longitude) : undefined,
    regioes_atendidas: Array.isArray(linha.regioes_atendidas)
      ? (linha.regioes_atendidas as string[])
      : [],
    categorias_ids: Array.isArray(linha.categorias_ids)
      ? (linha.categorias_ids as string[])
      : [],
    status: linha.status as StatusEmpresa,
    habilitada_receber: Boolean(linha.habilitada_receber ?? true),
    avaliacao_media: Number(linha.avaliacao_media ?? 5),
    comissao_percentual:
      linha.comissao_percentual != null ? Number(linha.comissao_percentual) : 10,
    stripe_account_id:
      linha.stripe_account_id != null ? String(linha.stripe_account_id) : undefined,
    created_at: String(linha.created_at),
    updated_at: String(linha.updated_at),
  }
}

export async function listarCategoriasNuvem(): Promise<CategoriaVeiculo[]> {
  const db = supabase
  if (!db) return []
  const { data, error } = await db
    .from('vehicle_categories')
    .select(COLUNAS_CATEGORIA)
    .order('ordem', { ascending: true })
  if (error || !data) return []
  return data.map((linha) => categoriaDaLinha(linha as Record<string, unknown>))
}

export async function gravarCategoriaNuvem(categoria: CategoriaVeiculo): Promise<void> {
  const db = supabase
  if (!db) return
  const { error } = await db.from('vehicle_categories').upsert(
    {
      id: categoria.id,
      nome: categoria.nome,
      slug: categoria.slug,
      descricao: categoria.descricao ?? null,
      capacidade_min: categoria.capacidade_min,
      capacidade_max: categoria.capacidade_max,
      adicional_preco: categoria.adicional_preco,
      ativo: categoria.ativo,
      ordem: categoria.ordem,
      created_at: categoria.created_at,
      updated_at: categoria.updated_at,
    },
    { onConflict: 'id' },
  )
  if (error) throw new Error(error.message)
}

export async function gravarCategoriasNuvem(categorias: CategoriaVeiculo[]): Promise<void> {
  if (!categorias.length) return
  const db = supabase
  if (!db) return
  const { error } = await db.from('vehicle_categories').upsert(
    categorias.map((categoria) => ({
      id: categoria.id,
      nome: categoria.nome,
      slug: categoria.slug,
      descricao: categoria.descricao ?? null,
      capacidade_min: categoria.capacidade_min,
      capacidade_max: categoria.capacidade_max,
      adicional_preco: categoria.adicional_preco,
      ativo: categoria.ativo,
      ordem: categoria.ordem,
      created_at: categoria.created_at,
      updated_at: categoria.updated_at,
    })),
    { onConflict: 'id' },
  )
  if (error) throw new Error(error.message)
}

export async function listarRegrasPrecoNuvem(): Promise<RegraPreco[]> {
  const db = supabase
  if (!db) return []
  const { data, error } = await db.from('price_rules').select(COLUNAS_PRECO)
  if (error || !data) return []
  return data.map((linha) => regraDaLinha(linha as Record<string, unknown>))
}

export async function gravarRegraPrecoNuvem(regra: RegraPreco): Promise<void> {
  const db = supabase
  if (!db) return
  const { error } = await db.from('price_rules').upsert(
    {
      id: regra.id,
      nome: regra.nome,
      preco_base: regra.preco_base,
      preco_por_km: regra.preco_por_km,
      preco_minimo: regra.preco_minimo,
      adicional_horario_noturno: regra.adicional_horario_noturno,
      horario_noturno_inicio: regra.horario_noturno_inicio,
      horario_noturno_fim: regra.horario_noturno_fim,
      distancia_padrao_km: regra.distancia_padrao_km,
      preco_por_hora: regra.preco_por_hora,
      franquia_milhas_por_hora: regra.franquia_milhas_por_hora,
      preco_por_milha_excedente: regra.preco_por_milha_excedente,
      duracao_minima_minutos: regra.duracao_minima_minutos,
      duracao_maxima_minutos: regra.duracao_maxima_minutos,
      pacotes_minutos: regra.pacotes_minutos,
      regra_extensao: regra.regra_extensao ?? null,
      regra_cancelamento: regra.regra_cancelamento ?? null,
      cobrancas_adicionais: regra.cobrancas_adicionais ?? null,
      ativo: regra.ativo,
      created_at: regra.created_at,
      updated_at: regra.updated_at,
    },
    { onConflict: 'id' },
  )
  if (error) throw new Error(error.message)
}

export async function listarConfiguracoesNuvem(): Promise<ConfiguracaoPlataforma[]> {
  const db = supabase
  if (!db) return []
  const { data, error } = await db.from('platform_settings').select(COLUNAS_CONFIG)
  if (error || !data) return []
  return data.map((linha) => configDaLinha(linha as Record<string, unknown>))
}

export async function gravarConfiguracaoNuvem(
  config: Pick<ConfiguracaoPlataforma, 'chave' | 'valor' | 'descricao' | 'updated_at'> & {
    id?: string
  },
): Promise<void> {
  if (!CHAVES_CONFIG_NUVEM.has(config.chave)) return
  const db = supabase
  if (!db) return
  const { data: existente } = await db
    .from('platform_settings')
    .select('id')
    .eq('chave', config.chave)
    .maybeSingle()
  if (existente?.id) {
    const { error } = await db
      .from('platform_settings')
      .update({
        valor: config.valor,
        descricao: config.descricao ?? config.chave,
        updated_at: config.updated_at,
      })
      .eq('id', existente.id)
    if (error) throw new Error(error.message)
    return
  }
  const { error } = await db.from('platform_settings').insert({
    id: config.id,
    chave: config.chave,
    valor: config.valor,
    descricao: config.descricao ?? config.chave,
    updated_at: config.updated_at,
  })
  if (error) throw new Error(error.message)
}

export async function listarEmpresasNuvem(): Promise<Empresa[]> {
  const db = supabase
  if (!db) return []
  const { data, error } = await db.from('companies').select(COLUNAS_EMPRESA)
  if (error || !data) return []
  return data.map((linha) => empresaDaLinha(linha as Record<string, unknown>))
}

export async function gravarEmpresaNuvem(empresa: Empresa): Promise<void> {
  const db = supabase
  if (!db) return
  const { error } = await db.from('companies').upsert(
    {
      id: empresa.id,
      usuario_id: empresa.usuario_id,
      nome_comercial: empresa.nome_comercial,
      razao_social: empresa.razao_social,
      cnpj: empresa.cnpj,
      telefone: empresa.telefone,
      email: empresa.email,
      cidade: empresa.cidade,
      endereco_base: empresa.endereco_base ?? null,
      latitude: empresa.latitude ?? null,
      longitude: empresa.longitude ?? null,
      regioes_atendidas: empresa.regioes_atendidas ?? [],
      categorias_ids: empresa.categorias_ids ?? [],
      status: empresa.status,
      habilitada_receber: empresa.habilitada_receber,
      avaliacao_media: empresa.avaliacao_media,
      comissao_percentual: empresa.comissao_percentual ?? 10,
      stripe_account_id: empresa.stripe_account_id ?? null,
      created_at: empresa.created_at,
      updated_at: empresa.updated_at,
    },
    { onConflict: 'id' },
  )
  if (error) throw new Error(error.message)
}

export async function gravarEmpresasNuvem(empresas: Empresa[]): Promise<void> {
  if (!empresas.length) return
  const db = supabase
  if (!db) return
  const { error } = await db.from('companies').upsert(
    empresas.map((empresa) => ({
      id: empresa.id,
      usuario_id: empresa.usuario_id,
      nome_comercial: empresa.nome_comercial,
      razao_social: empresa.razao_social,
      cnpj: empresa.cnpj,
      telefone: empresa.telefone,
      email: empresa.email,
      cidade: empresa.cidade,
      endereco_base: empresa.endereco_base ?? null,
      latitude: empresa.latitude ?? null,
      longitude: empresa.longitude ?? null,
      regioes_atendidas: empresa.regioes_atendidas ?? [],
      categorias_ids: empresa.categorias_ids ?? [],
      status: empresa.status,
      habilitada_receber: empresa.habilitada_receber,
      avaliacao_media: empresa.avaliacao_media,
      comissao_percentual: empresa.comissao_percentual ?? 10,
      stripe_account_id: empresa.stripe_account_id ?? null,
      created_at: empresa.created_at,
      updated_at: empresa.updated_at,
    })),
    { onConflict: 'id' },
  )
  if (error) throw new Error(error.message)
}
