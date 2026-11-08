import { supabase } from '@/lib/supabase'
import type { Motorista } from '@/types'

export interface DadosNovoMotorista {
  empresa_id: string
  nome: string
  email: string
  senha: string
  telefone: string
  cnh: string
  categoria_cnh?: string
  experiencia_anos?: number
  eh_categoria_shield?: boolean
  foto_url?: string | null
}

function clienteFunctions() {
  const base = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (!base || !anon) {
    throw new Error('Supabase não configurado (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).')
  }
  return { base: base.replace(/\/$/, ''), anon }
}

export async function criarMotoristaNoSupabase(
  dados: DadosNovoMotorista,
): Promise<Motorista> {
  const { base, anon } = clienteFunctions()
  const { exigirSessaoAuthValida } = await import('@/services/sessaoAuth')
  let sessao
  try {
    sessao = await exigirSessaoAuthValida()
  } catch {
    throw new Error('Sessão expirada. Saia e entre de novo para cadastrar motorista.')
  }
  const resp = await fetch(`${base}/functions/v1/criar-motorista`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessao.access_token}`,
      apikey: anon,
    },
    body: JSON.stringify(dados),
  })
  const data = (await resp.json()) as { motorista?: Motorista; erro?: string }
  if (!resp.ok || !data.motorista) {
    throw new Error(data.erro ?? `Falha ao salvar motorista no Supabase (${resp.status})`)
  }
  return {
    ...data.motorista,
    experiencia_anos: Number(data.motorista.experiencia_anos ?? 0),
    avaliacao_media: Number(data.motorista.avaliacao_media ?? 5),
    disponivel: data.motorista.disponivel ?? true,
    eh_categoria_shield: Boolean(data.motorista.eh_categoria_shield),
    foto_url: data.motorista.foto_url ?? undefined,
  }
}

export async function atualizarMotoristaNuvem(
  motorista: Motorista,
): Promise<Motorista> {
  const db = supabase
  if (!db) throw new Error('Supabase não configurado')
  const { data, error } = await db
    .from('drivers')
    .update({
      nome: motorista.nome,
      telefone: motorista.telefone,
      cnh: motorista.cnh,
      categoria_cnh: motorista.categoria_cnh,
      experiencia_anos: motorista.experiencia_anos,
      eh_categoria_shield: Boolean(motorista.eh_categoria_shield),
      status: motorista.status,
      disponivel: motorista.disponivel,
      foto_url: motorista.foto_url?.trim() ? motorista.foto_url : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', motorista.id)
    .select('*')
    .single()
  if (error || !data) {
    throw new Error(error?.message ?? 'Não foi possível atualizar o motorista no Supabase.')
  }
  return {
    ...(data as Motorista),
    experiencia_anos: Number((data as Motorista).experiencia_anos ?? 0),
    avaliacao_media: Number((data as Motorista).avaliacao_media ?? 5),
    eh_categoria_shield: Boolean((data as Motorista).eh_categoria_shield),
    foto_url: (data as Motorista).foto_url ?? undefined,
  }
}
