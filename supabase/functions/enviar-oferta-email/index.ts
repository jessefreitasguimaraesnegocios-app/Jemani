import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { CORS, json } from '../_shared/cors.ts'
import { exigirUsuario, ehAdmin, RespostaAuth } from '../_shared/auth.ts'
import { limitarTaxa, resposta429 } from '../_shared/rateLimit.ts'

type Corpo = {
  para: string
  assunto: string
  html: string
  texto: string
  viagem_id?: string
  empresa_id?: string
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ erro: 'Método não permitido' }, 405)

  try {
    const { user, perfil } = await exigirUsuario(req)
    if (!ehAdmin(perfil)) {
      return json({ erro: 'Apenas admin pode enviar oferta por e-mail' }, 403)
    }

    const limite = await limitarTaxa({
      chave: `enviar-oferta-email:user:${user.id}`,
      limite: 40,
      janelaSegundos: 3600,
    })
    if (!limite.ok) return resposta429(limite.retryAfterSegundos)

    let payload: Corpo
    try {
      payload = await req.json()
    } catch {
      return json({ erro: 'JSON inválido' }, 400)
    }

    const para = String(payload.para ?? '').trim().toLowerCase()
    const assunto = String(payload.assunto ?? '').trim()
    const html = String(payload.html ?? '').trim()
    const texto = String(payload.texto ?? '').trim()

    if (!para || !para.includes('@')) return json({ erro: 'E-mail da empresa inválido' }, 400)
    if (!assunto || !html) return json({ erro: 'Assunto e HTML são obrigatórios' }, 400)

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) {
      return json(
        {
          erro:
            'Envio automático não configurado. Defina o secret RESEND_API_KEY no projeto Supabase.',
        },
        503,
      )
    }

    const from =
      Deno.env.get('EMAIL_FROM')?.trim() ||
      'Jemani <onboarding@resend.dev>'

    const resposta = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [para],
        subject: assunto,
        html,
        text: texto || undefined,
      }),
    })

    const corpo = await resposta.json().catch(() => ({}))
    if (!resposta.ok) {
      const detalhe =
        typeof corpo === 'object' && corpo && 'message' in corpo
          ? String((corpo as { message: string }).message)
          : `HTTP ${resposta.status}`
      return json({ erro: `Falha no envio: ${detalhe}` }, 502)
    }

    if (payload.viagem_id) {
      try {
        const url = Deno.env.get('SUPABASE_URL')
        const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
        if (url && service) {
          const admin = createClient(url, service)
          await admin.from('audit_logs').insert({
            acao: 'email_oferta_enviado',
            usuario_id: user.id,
            entidade_tipo: 'viagem',
            entidade_id: payload.viagem_id,
            metadados: {
              empresa_id: payload.empresa_id ?? null,
              para,
              provider: 'resend',
              message_id:
                typeof corpo === 'object' && corpo && 'id' in corpo
                  ? (corpo as { id: string }).id
                  : null,
            },
          })
        }
      } catch {
        /* auditoria é best-effort */
      }
    }

    return json({
      ok: true,
      id:
        typeof corpo === 'object' && corpo && 'id' in corpo
          ? (corpo as { id: string }).id
          : null,
    })
  } catch (e) {
    if (e instanceof RespostaAuth) return json({ erro: e.message }, e.status)
    return json({ erro: e instanceof Error ? e.message : 'Erro ao enviar e-mail' }, 500)
  }
})
