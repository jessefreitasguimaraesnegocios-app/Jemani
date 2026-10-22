import type { RealtimeChannel } from '@supabase/supabase-js'
import { ofertasComEmpresaCadastrada } from '@/services/filtroGravacaoNuvem'
import { supabase } from '@/lib/supabase'
import type { AtribuicaoViagem, Empresa, Motorista, Perfil, StatusViagem, Viagem } from '@/types'

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
  const emailLimpo = email.toLowerCase()
  const atual = await db.auth.getSession()
  if (atual.data.session?.user.email?.toLowerCase() === emailLimpo) {
    const refrescou = await db.auth.refreshSession()
    if (!refrescou.error && refrescou.data.session) return true
    return true
  }
  if (!senha) return false
  const { error } = await db.auth.signInWithPassword({ email, password: senha })
  return !error
}

function perfilDaLinha(linha: {
  id: string
  email: string
  nome: string
  telefone?: string | null
  tipo: Perfil['tipo']
  avatar_url?: string | null
  ativo: boolean
  created_at: string
  updated_at: string
}): Perfil {
  return {
    id: linha.id,
    email: linha.email,
    nome: linha.nome,
    telefone: linha.telefone ?? undefined,
    tipo: linha.tipo,
    avatar_url: linha.avatar_url ?? undefined,
    ativo: linha.ativo,
    created_at: linha.created_at,
    updated_at: linha.updated_at,
  }
}

function empresaDaLinha(linha: Empresa): Empresa {
  return {
    ...linha,
    latitude: linha.latitude != null ? Number(linha.latitude) : undefined,
    longitude: linha.longitude != null ? Number(linha.longitude) : undefined,
    regioes_atendidas: linha.regioes_atendidas ?? [],
    categorias_ids: linha.categorias_ids ?? [],
    habilitada_receber: linha.habilitada_receber ?? true,
    avaliacao_media: Number(linha.avaliacao_media ?? 5),
    comissao_percentual:
      linha.comissao_percentual != null ? Number(linha.comissao_percentual) : 10,
  }
}

function motoristaDaLinha(linha: Motorista): Motorista {
  return {
    ...linha,
    telefone: linha.telefone ?? '',
    cnh: linha.cnh ?? '',
    categoria_cnh: linha.categoria_cnh ?? 'B',
    experiencia_anos: Number(linha.experiencia_anos ?? 0),
    disponivel: linha.disponivel ?? true,
    avaliacao_media: Number(linha.avaliacao_media ?? 5),
    foto_url: linha.foto_url ?? undefined,
  }
}

export async function entrarContaNuvem(email: string, senha: string) {
  const db = cliente()
  if (!db || !email || !senha) return null
  const { data, error } = await db.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password: senha,
  })
  if (error || !data.user) return null

  const { data: linha, error: erroPerfil } = await db
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .maybeSingle()
  if (erroPerfil || !linha) {
    await db.auth.signOut()
    return null
  }

  const perfil = perfilDaLinha(linha as Perfil)
  let empresa: Empresa | undefined
  let motorista: Motorista | undefined

  if (perfil.tipo === 'empresa') {
    const { data: empresas } = await db.from('companies').select('*')
    const lista = (empresas ?? []) as Empresa[]
    const linhaEmpresa = lista.find((item) => item.usuario_id === perfil.id) ?? lista[0]
    if (linhaEmpresa) empresa = empresaDaLinha(linhaEmpresa)
  }

  if (perfil.tipo === 'motorista') {
    const { data: linhaMotorista } = await db
      .from('drivers')
      .select('*')
      .eq('usuario_id', perfil.id)
      .maybeSingle()
    if (linhaMotorista) motorista = motoristaDaLinha(linhaMotorista as Motorista)
  }

  return { perfil, empresa, motorista }
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

export async function listarEmpresasParaDistribuicaoNuvem(categoriaId: string) {
  const db = cliente()
  if (!db || !categoriaId) return [] as Empresa[]
  const { data, error } = await db.rpc('empresas_para_distribuicao', {
    p_categoria_id: categoriaId,
  })
  if (error) {
    console.warn('Falha ao listar empresas para distribuição', error.message)
    return [] as Empresa[]
  }
  return ((data ?? []) as Empresa[]).map(empresaDaLinha)
}

export async function gravarOfertasNuvem(ofertas: AtribuicaoViagem[]) {
  const db = cliente()
  if (!db || ofertas.length === 0) return
  const cadastradas = await idsEmpresasQuePodemReceber()
  const filtradas = cadastradas
    ? ofertasComEmpresaCadastrada(ofertas, cadastradas)
    : ofertas
  if (filtradas.length === 0) {
    console.warn('Nenhuma oferta com empresa cadastrada na nuvem para gravar')
    return
  }
  const linhas = filtradas.map((o) => ({
    id: o.id,
    viagem_id: o.viagem_id,
    empresa_id: o.empresa_id,
    status: o.status,
    distancia_km: o.distancia_km ?? null,
    motivo: o.motivo ?? null,
    respondido_em: o.respondido_em ?? null,
    created_at: o.created_at,
  }))
  const { error } = await db.from('trip_assignments').upsert(linhas, { onConflict: 'viagem_id,empresa_id' })
  if (error) console.warn('Falha ao gravar ofertas na nuvem', error.message)
}

/** Poll de segurança quando Realtime está ativo (20–30s). */
export const INTERVALO_SEGURANCA_NUVEM_MS = 25_000

/** Colunas usadas pelo app — evita select('*') genérico. */
export const COLUNAS_VIAGEM =
  'id,codigo,cliente_id,empresa_id,motorista_id,categoria_id,origem,destino,origem_lat,origem_lng,destino_lat,destino_lng,origem_place_id,destino_place_id,data_viagem,horario,passageiros,malas,numero_voo,nome_passageiro,observacoes,distancia_km,preco_base,taxas,preco_total,comissao_percentual,valor_plataforma,valor_empresa,status,payment_status,motorista_lat,motorista_lng,finalizado_em,finalizado_por,version,created_at,updated_at'

export const COLUNAS_OFERTA =
  'id,viagem_id,empresa_id,status,distancia_km,motivo,respondido_em,created_at'

/** Payload do Realtime está completo o bastante para montar a viagem sem REST. */
export function linhaViagemUsavel(linha: Partial<LinhaViagem> | null | undefined): linha is LinhaViagem {
  return Boolean(
    linha &&
      typeof linha.id === 'string' &&
      typeof linha.codigo === 'string' &&
      typeof linha.cliente_id === 'string' &&
      typeof linha.categoria_id === 'string' &&
      typeof linha.origem === 'string' &&
      typeof linha.destino === 'string' &&
      typeof linha.status === 'string' &&
      typeof linha.version === 'number',
  )
}

export function linhaOfertaUsavel(linha: Partial<LinhaOferta> | null | undefined): linha is LinhaOferta {
  return Boolean(
    linha &&
      typeof linha.id === 'string' &&
      typeof linha.viagem_id === 'string' &&
      typeof linha.empresa_id === 'string' &&
      typeof linha.status === 'string',
  )
}

export async function listarViagensNuvem(opcoes?: { atualizadoDesde?: string }) {
  const db = cliente()
  if (!db) return []
  let consulta = db.from('trips').select(COLUNAS_VIAGEM)
  if (opcoes?.atualizadoDesde) {
    consulta = consulta.gte('updated_at', opcoes.atualizadoDesde)
  }
  const { data, error } = await consulta
  if (error || !data) return []
  return (data as LinhaViagem[]).map(viagemDaLinha)
}

export async function listarOfertasNuvem(opcoes?: { criadoDesde?: string }) {
  const db = cliente()
  if (!db) return []
  let consulta = db.from('trip_assignments').select(COLUNAS_OFERTA)
  if (opcoes?.criadoDesde) {
    consulta = consulta.gte('created_at', opcoes.criadoDesde)
  }
  const { data, error } = await consulta
  if (error || !data) return []
  return (data as LinhaOferta[]).map(ofertaDaLinha)
}

export async function buscarViagemNuvem(id: string) {
  const db = cliente()
  if (!db) return null
  const { data, error } = await db
    .from('trips')
    .select(COLUNAS_VIAGEM)
    .eq('id', id)
    .maybeSingle()
  if (error || !data) return null
  return viagemDaLinha(data as LinhaViagem)
}

export function assinarNuvem(
  aoViagem: (viagem: Viagem) => void,
  aoOferta: (oferta: AtribuicaoViagem) => void,
  canalId?: string,
) {
  const db = cliente()
  if (!db) return null
  const nomeCanal = canalId ? `corridas-jemani-${canalId}` : `corridas-jemani-${Date.now()}`
  const canal: RealtimeChannel = db
    .channel(nomeCanal)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, (payload) => {
      if (payload.eventType === 'DELETE') return
      const linha = payload.new as Partial<LinhaViagem> | null
      if (!linha?.id) return
      if (linhaViagemUsavel(linha)) {
        aoViagem(viagemDaLinha(linha))
        return
      }
      void buscarViagemNuvem(linha.id).then((viagem) => {
        if (viagem) aoViagem(viagem)
      })
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'trip_assignments' }, (payload) => {
      if (payload.eventType === 'DELETE') return
      const linha = payload.new as Partial<LinhaOferta> | null
      if (!linhaOfertaUsavel(linha)) return
      // Oferta vem completa no payload; a viagem chega pelo canal de trips ou no poll de segurança.
      aoOferta(ofertaDaLinha(linha))
    })
    .subscribe()
  return canal
}
