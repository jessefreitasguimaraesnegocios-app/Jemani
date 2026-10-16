import type { RealtimeChannel } from '@supabase/supabase-js'
import { ofertasComEmpresaCadastrada } from '@/services/filtroGravacaoNuvem'
import { supabase } from '@/lib/supabase'
import type { AtribuicaoViagem, StatusViagem, Viagem } from '@/types'

type LinhaViagem = {
  id: string
  codigo: string
  cliente_id: string
  empresa_id: string | null
  motorista_id: string | null
  categoria_id: string
  origem: string
  destino: string
  origem_lat: number | null
  origem_lng: number | null
  destino_lat: number | null
  destino_lng: number | null
  origem_place_id: string | null
  destino_place_id: string | null
  data_viagem: string
  horario: string
  passageiros: number
  malas: number | null
  numero_voo: string | null
  nome_passageiro: string | null
  observacoes: string | null
  distancia_km: number | null
  preco_base: number
  taxas: number
  preco_total: number
  comissao_percentual: number
  valor_plataforma: number
  valor_empresa: number
  status: StatusViagem
  payment_status: string
  motorista_lat: number | null
  motorista_lng: number | null
  finalizado_em: string | null
  finalizado_por: string | null
  version: number
  created_at: string
  updated_at: string
}

type LinhaOferta = {
  id: string
  viagem_id: string
  empresa_id: string
  status: AtribuicaoViagem['status']
  distancia_km: number | null
  motivo: string | null
  respondido_em: string | null
  created_at: string
}

function cliente() {
  return supabase
}

export async function cadastrarClienteNuvem(dados: {
  nome: string
  email: string
  senha: string
  telefone?: string
}) {
  const db = cliente()
  if (!db) throw new Error('Supabase não configurado')
  const email = dados.email.trim().toLowerCase()
  const { data, error } = await db.auth.signUp({
    email,
    password: dados.senha,
    options: { data: { nome: dados.nome, telefone: dados.telefone ?? '' } },
  })
  if (error) {
    const texto = error.message.toLowerCase()
    if (texto.includes('already') || texto.includes('registered')) {
      throw new Error('E-mail já cadastrado')
    }
    throw new Error(error.message)
  }
  if (!data.user) throw new Error('Não foi possível criar a conta')
  if (!data.session) {
    throw new Error('Conta criada, mas o e-mail ainda precisa ser confirmado.')
  }
  const { error: erroPerfil } = await db.from('profiles').upsert(
    {
      id: data.user.id,
      email,
      nome: dados.nome,
      telefone: dados.telefone || null,
      tipo: 'cliente',
      ativo: true,
    },
    { onConflict: 'id' },
  )
  if (erroPerfil) throw new Error(erroPerfil.message)
  return data.user.id
}

export async function entrarNuvem(email: string, senha: string) {
  const db = cliente()
  if (!db || !email) return false
  const atual = await db.auth.getSession()
  if (atual.data.session?.user.email?.toLowerCase() === email.toLowerCase()) return true
  if (!senha) return false
  const { error } = await db.auth.signInWithPassword({ email, password: senha })
  return !error
}

export async function sairNuvem() {
  const db = cliente()
  if (!db) return
  await db.auth.signOut()
}

function paraLinha(viagem: Viagem): LinhaViagem {
  return {
    id: viagem.id,
    codigo: viagem.codigo,
    cliente_id: viagem.cliente_id,
    empresa_id: viagem.empresa_id ?? null,
    motorista_id: viagem.motorista_id ?? null,
    categoria_id: viagem.categoria_id,
    origem: viagem.origem,
    destino: viagem.destino,
    origem_lat: viagem.origem_lat ?? null,
    origem_lng: viagem.origem_lng ?? null,
    destino_lat: viagem.destino_lat ?? null,
    destino_lng: viagem.destino_lng ?? null,
    origem_place_id: viagem.origem_place_id ?? null,
    destino_place_id: viagem.destino_place_id ?? null,
    data_viagem: viagem.data_viagem,
    horario: viagem.horario.length === 5 ? `${viagem.horario}:00` : viagem.horario,
    passageiros: viagem.passageiros,
    malas: viagem.malas ?? null,
    numero_voo: viagem.numero_voo ?? null,
    nome_passageiro: viagem.nome_passageiro ?? null,
    observacoes: viagem.observacoes ?? null,
    distancia_km: viagem.distancia_km ?? null,
    preco_base: viagem.preco_base,
    taxas: viagem.taxas,
    preco_total: viagem.preco_total,
    comissao_percentual: viagem.comissao_percentual,
    valor_plataforma: viagem.valor_plataforma,
    valor_empresa: viagem.valor_empresa,
    status: viagem.status,
    payment_status: viagem.payment_status,
    motorista_lat: viagem.motorista_lat ?? null,
    motorista_lng: viagem.motorista_lng ?? null,
    finalizado_em: viagem.finalizado_em ?? null,
    finalizado_por: viagem.finalizado_por ?? null,
    version: viagem.version,
    created_at: viagem.created_at,
    updated_at: viagem.updated_at,
  }
}

export function viagemDaLinha(linha: LinhaViagem): Viagem {
  return {
    id: linha.id,
    codigo: linha.codigo,
    cliente_id: linha.cliente_id,
    empresa_id: linha.empresa_id ?? undefined,
    motorista_id: linha.motorista_id ?? undefined,
    categoria_id: linha.categoria_id,
    origem: linha.origem,
    destino: linha.destino,
    origem_lat: linha.origem_lat ?? undefined,
    origem_lng: linha.origem_lng ?? undefined,
    destino_lat: linha.destino_lat ?? undefined,
    destino_lng: linha.destino_lng ?? undefined,
    origem_place_id: linha.origem_place_id ?? undefined,
    destino_place_id: linha.destino_place_id ?? undefined,
    data_viagem: String(linha.data_viagem).slice(0, 10),
    horario: String(linha.horario).slice(0, 5),
    passageiros: linha.passageiros,
    malas: linha.malas ?? undefined,
    numero_voo: linha.numero_voo ?? undefined,
    nome_passageiro: linha.nome_passageiro ?? undefined,
    observacoes: linha.observacoes ?? undefined,
    distancia_km: linha.distancia_km ?? undefined,
    preco_base: Number(linha.preco_base),
    taxas: Number(linha.taxas),
    preco_total: Number(linha.preco_total),
    comissao_percentual: Number(linha.comissao_percentual),
    valor_plataforma: Number(linha.valor_plataforma),
    valor_empresa: Number(linha.valor_empresa),
    status: linha.status,
    payment_status: linha.payment_status as Viagem['payment_status'],
    motorista_lat: linha.motorista_lat ?? undefined,
    motorista_lng: linha.motorista_lng ?? undefined,
    finalizado_em: linha.finalizado_em ?? undefined,
    finalizado_por: linha.finalizado_por ?? undefined,
    version: linha.version,
    created_at: linha.created_at,
    updated_at: linha.updated_at,
  }
}

export function ofertaDaLinha(linha: LinhaOferta): AtribuicaoViagem {
  return {
    id: linha.id,
    viagem_id: linha.viagem_id,
    empresa_id: linha.empresa_id,
    status: linha.status,
    distancia_km: linha.distancia_km ?? undefined,
    motivo: linha.motivo ?? undefined,
    respondido_em: linha.respondido_em ?? undefined,
    created_at: linha.created_at,
  }
}

export async function gravarViagensNuvem(viagens: Viagem[]) {
  const db = cliente()
  if (!db || viagens.length === 0) return false
  const sessao = await db.auth.getSession()
  const uid = sessao.data.session?.user.id
  if (!uid) return false
  const linhas = viagens.filter((viagem) => viagem.cliente_id === uid).map(paraLinha)
  if (linhas.length === 0) return false
  const { error } = await db.from('trips').upsert(linhas, { onConflict: 'id' })
  if (error) {
    console.warn('Falha ao gravar viagem na nuvem', error.message)
    return false
  }
  return true
}

export async function gravarViagemNuvem(viagem: Viagem) {
  const db = cliente()
  if (!db) return false
  const sessao = await db.auth.getSession()
  const uid = sessao.data.session?.user.id
  if (!uid) return false
  const linha = paraLinha(viagem)
  if (uid === viagem.cliente_id) return gravarViagensNuvem([viagem])
  const { id, created_at, ...resto } = linha
  const { data, error } = await db.from('trips').update(resto).eq('id', id).select('id')
  if (error || !data?.length) {
    console.warn('Falha ao gravar viagem na nuvem', error?.message ?? 'nenhuma linha atualizada')
    return false
  }
  return true
}

export async function gravarPosicaoNuvem(viagemId: string, latitude: number, longitude: number) {
  const db = cliente()
  if (!db) return
  const { error } = await db
    .from('trips')
    .update({ motorista_lat: latitude, motorista_lng: longitude })
    .eq('id', viagemId)
  if (error) console.warn('Falha ao gravar posição na nuvem', error.message)
}

function idsDaResposta(data: unknown) {
  if (!Array.isArray(data)) return null
  const ids = data.flatMap((item) => {
    if (typeof item === 'string') return [item]
    if (item && typeof item === 'object' && 'empresas_que_podem_receber' in item) {
      const valor = item.empresas_que_podem_receber
      return typeof valor === 'string' ? [valor] : []
    }
    return []
  })
  return new Set(ids)
}

async function idsEmpresasQuePodemReceber() {
  const db = cliente()
  if (!db) return null
  const { data, error } = await db.rpc('empresas_que_podem_receber')
  if (error) return null
  return idsDaResposta(data)
}

export async function gravarOfertasNuvem(ofertas: AtribuicaoViagem[]) {
  const db = cliente()
  if (!db || ofertas.length === 0) return
  const cadastradas = await idsEmpresasQuePodemReceber()
  if (!cadastradas) return
  const linhas = ofertasComEmpresaCadastrada(ofertas, cadastradas).map((o) => ({
    id: o.id,
    viagem_id: o.viagem_id,
    empresa_id: o.empresa_id,
    status: o.status,
    distancia_km: o.distancia_km ?? null,
    motivo: o.motivo ?? null,
    respondido_em: o.respondido_em ?? null,
    created_at: o.created_at,
  }))
  if (linhas.length === 0) return
  const { error } = await db.from('trip_assignments').upsert(linhas, { onConflict: 'viagem_id,empresa_id' })
  if (error) console.warn('Falha ao gravar ofertas na nuvem', error.message)
}

export async function listarViagensNuvem() {
  const db = cliente()
  if (!db) return []
  const { data, error } = await db.from('trips').select('*')
  if (error || !data) return []
  return (data as LinhaViagem[]).map(viagemDaLinha)
}

export async function listarOfertasNuvem() {
  const db = cliente()
  if (!db) return []
  const { data, error } = await db.from('trip_assignments').select('*')
  if (error || !data) return []
  return (data as LinhaOferta[]).map(ofertaDaLinha)
}

export async function buscarViagemNuvem(id: string) {
  const db = cliente()
  if (!db) return null
  const { data, error } = await db.from('trips').select('*').eq('id', id).maybeSingle()
  if (error || !data) return null
  return viagemDaLinha(data as LinhaViagem)
}

export function assinarNuvem(
  aoViagem: (viagem: Viagem) => void,
  aoOferta: (oferta: AtribuicaoViagem) => void,
) {
  const db = cliente()
  if (!db) return null
  const canal: RealtimeChannel = db
    .channel('corridas-jemani')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, (payload) => {
      const linha = payload.new as { id?: string } | null
      if (!linha?.id) return
      void buscarViagemNuvem(linha.id).then((viagem) => {
        if (viagem) aoViagem(viagem)
      })
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'trip_assignments' }, (payload) => {
      const linha = payload.new as LinhaOferta
      if (!linha?.id) return
      void buscarViagemNuvem(linha.viagem_id).then((viagem) => {
        if (viagem) aoViagem(viagem)
        aoOferta(ofertaDaLinha(linha))
      })
    })
    .subscribe()
  return canal
}
