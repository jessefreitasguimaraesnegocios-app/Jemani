import { supabase, supabaseConfigurado } from '@/lib/supabase'
import { exigirSessaoAuthValida } from '@/services/sessaoAuth'

export type ResultadoEnvioOfertaEmail = {
  ok: true
  id?: string | null
}

export async function enviarOfertaEmailAutomatico(entrada: {
  para: string
  assunto: string
  html: string
  texto: string
  viagemId: string
  empresaId: string
}): Promise<ResultadoEnvioOfertaEmail> {
  if (!supabaseConfigurado || !supabase) {
    throw new Error('Nuvem não configurada para envio automático de e-mail')
  }

  const sessao = await exigirSessaoAuthValida()
  if (!sessao.access_token) {
    throw new Error('Sessão inválida. Entre novamente como admin.')
  }

  const base = import.meta.env.VITE_SUPABASE_URL as string
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string
  const resposta = await fetch(`${base.replace(/\/$/, '')}/functions/v1/enviar-oferta-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anon,
      Authorization: `Bearer ${sessao.access_token}`,
    },
    body: JSON.stringify({
      para: entrada.para,
      assunto: entrada.assunto,
      html: entrada.html,
      texto: entrada.texto,
      viagem_id: entrada.viagemId,
      empresa_id: entrada.empresaId,
    }),
  })

  const corpo = (await resposta.json().catch(() => ({}))) as {
    ok?: boolean
    id?: string
    erro?: string
  }

  if (!resposta.ok || !corpo.ok) {
    throw new Error(corpo.erro || `Falha ao enviar e-mail (HTTP ${resposta.status})`)
  }

  return { ok: true, id: corpo.id ?? null }
}
