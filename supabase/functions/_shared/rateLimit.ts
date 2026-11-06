import { clienteAdmin } from './auth.ts'

/**
 * Rate limit atômico no Postgres (sobrevive a cold start / multi-isolate).
 * Chave tipicamente: `fn:nome:user:<uuid>` — não usa IP forjado pelo cliente.
 */
export async function limitarTaxa(opts: {
  chave: string
  limite: number
  janelaSegundos: number
}): Promise<{ ok: boolean; retryAfterSegundos: number }> {
  const admin = clienteAdmin()
  const { data, error } = await admin.rpc('edge_rate_limit', {
    p_chave: opts.chave,
    p_limite: opts.limite,
    p_janela_segundos: opts.janelaSegundos,
  })
  if (error) {
    // Fail-open controlado: sem tabela ainda, não derruba o app em deploy parcial.
    console.warn('rate_limit indisponível', error.message)
    return { ok: true, retryAfterSegundos: 0 }
  }
  const linha = Array.isArray(data) ? data[0] : data
  const ok = Boolean(linha?.ok ?? linha?.permitido ?? true)
  const retry = Number(linha?.retry_after_segundos ?? linha?.retry_after ?? 0)
  return { ok, retryAfterSegundos: Number.isFinite(retry) ? retry : opts.janelaSegundos }
}

export function resposta429(retryAfterSegundos: number, mensagem = 'Muitas tentativas. Aguarde.') {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, stripe-signature',
  }
  if (retryAfterSegundos > 0) headers['Retry-After'] = String(Math.ceil(retryAfterSegundos))
  return new Response(JSON.stringify({ erro: mensagem }), { status: 429, headers })
}
