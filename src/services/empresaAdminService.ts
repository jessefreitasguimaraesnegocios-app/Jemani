import type { Empresa } from '@/types'

export interface DadosNovaEmpresa {
  nome_comercial: string
  razao_social: string
  cnpj: string
  telefone: string
  email: string
  senha: string
  cidade: string
  endereco_base: string
  latitude: number
  longitude: number
  regioes_atendidas: string[]
  categorias_ids: string[]
  nome_gestor?: string
}

function clienteFunctions() {
  const base = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (!base || !anon) {
    throw new Error('Supabase não configurado (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).')
  }
  return { base, anon }
}

export async function criarEmpresaNoSupabase(dados: DadosNovaEmpresa): Promise<Empresa> {
  const { base, anon } = clienteFunctions()
  const resp = await fetch(`${base}/functions/v1/criar-empresa`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${anon}`,
      apikey: anon,
    },
    body: JSON.stringify(dados),
  })
  const data = (await resp.json()) as { empresa?: Empresa; erro?: string }
  if (!resp.ok || !data.empresa) {
    throw new Error(data.erro ?? `Falha ao salvar empresa no Supabase (${resp.status})`)
  }
  return {
    ...data.empresa,
    latitude: data.empresa.latitude != null ? Number(data.empresa.latitude) : undefined,
    longitude: data.empresa.longitude != null ? Number(data.empresa.longitude) : undefined,
    regioes_atendidas: data.empresa.regioes_atendidas ?? [],
    categorias_ids: data.empresa.categorias_ids ?? [],
    habilitada_receber: data.empresa.habilitada_receber ?? true,
    avaliacao_media: Number(data.empresa.avaliacao_media ?? 5),
    comissao_percentual:
      data.empresa.comissao_percentual != null
        ? Number(data.empresa.comissao_percentual)
        : 10,
  }
}
