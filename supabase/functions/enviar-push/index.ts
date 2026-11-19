import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { CORS, json } from '../_shared/cors.ts'

type CorpoWebhook = {
  type?: string
  table?: string
  schema?: string
  record?: {
    id?: string
    usuario_id?: string
    titulo?: string
    mensagem?: string
    tipo?: string
    referencia_id?: string | null
  }
  notification_id?: string
}

type ContaServico = {
  project_id: string
  client_email: string
  private_key: string
  token_uri?: string
}

type TokenLinha = {
  id: string
  token: string
  plataforma: string
}

function admin() {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new Error('SUPABASE_URL / SERVICE_ROLE ausentes')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

function autorizarWebhook(req: Request) {
  const secreto = Deno.env.get('PUSH_WEBHOOK_SECRET')?.trim()
  if (!secreto) return false
  const header =
    req.headers.get('x-push-secret')?.trim() ||
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
  return header === secreto
}

function lerContaServico(): ContaServico {
  const bruto = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON')
  if (!bruto) throw new Error('FCM_SERVICE_ACCOUNT_JSON ausente')
  const conta = JSON.parse(bruto) as ContaServico
  if (!conta.project_id || !conta.client_email || !conta.private_key) {
    throw new Error('Service account FCM incompleta')
  }
  return conta
}

function base64Url(bytes: Uint8Array) {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlTexto(texto: string) {
  return base64Url(new TextEncoder().encode(texto))
}

async function obterAccessTokenFcm(conta: ContaServico) {
  const agora = Math.floor(Date.now() / 1000)
  const header = base64UrlTexto(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claim = base64UrlTexto(
    JSON.stringify({
      iss: conta.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: conta.token_uri || 'https://oauth2.googleapis.com/token',
      iat: agora,
      exp: agora + 3600,
    }),
  )
  const unsigned = `${header}.${claim}`
  const pem = conta.private_key.replace(/\\n/g, '\n')
  const pemLimpo = pem.replace('-----BEGIN PRIVATE KEY-----', '').replace('-----END PRIVATE KEY-----', '').replace(/\s+/g, '')
  const der = Uint8Array.from(atob(pemLimpo), (c) => c.charCodeAt(0))
  const chave = await crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const assinatura = new Uint8Array(
    await crypto.subtle.sign('RSASSA-PKCS1-v1_5', chave, new TextEncoder().encode(unsigned)),
  )
  const jwt = `${unsigned}.${base64Url(assinatura)}`
  const tokenUri = conta.token_uri || 'https://oauth2.googleapis.com/token'
  const resp = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })
  const corpo = await resp.json().catch(() => ({}))
  if (!resp.ok || !corpo.access_token) {
    throw new Error(`OAuth FCM falhou: ${JSON.stringify(corpo)}`)
  }
  return String(corpo.access_token)
}

function rotaPorTipo(tipoUsuario: string | null | undefined, referenciaId?: string | null) {
  const ref = referenciaId?.trim()
  switch (tipoUsuario) {
    case 'empresa':
      return ref ? `/empresa/viagens/${ref}` : '/empresa/solicitacoes'
    case 'motorista':
      return '/motorista'
    case 'admin':
      return '/admin/solicitacoes'
    default:
      return ref ? `/app/viagens/${ref}` : '/app/notificacoes'
  }
}

async function enviarFcm(params: {
  accessToken: string
  projectId: string
  token: string
  titulo: string
  mensagem: string
  data: Record<string, string>
}) {
  const url = `https://fcm.googleapis.com/v1/projects/${params.projectId}/messages:send`
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        token: params.token,
        notification: {
          title: params.titulo,
          body: params.mensagem,
        },
        data: params.data,
        android: {
          priority: 'HIGH',
          notification: {
            sound: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      },
    }),
  })
  const corpo = await resp.json().catch(() => ({}))
  return { ok: resp.ok, status: resp.status, corpo }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ erro: 'Método não permitido' }, 405)

  if (!autorizarWebhook(req)) {
    return json({ erro: 'Não autorizado' }, 401)
  }

  try {
    let payload: CorpoWebhook
    try {
      payload = await req.json()
    } catch {
      return json({ erro: 'JSON inválido' }, 400)
    }

    const db = admin()
    const notificationId = payload.notification_id || payload.record?.id
    if (!notificationId) return json({ erro: 'notification_id ausente' }, 400)

    // Preferir o record do webhook/trigger: o INSERT ainda pode não estar
    // visível para outra conexão (pg_net dispara antes do commit).
    let notif: {
      id: string
      usuario_id: string
      titulo: string
      mensagem: string
      tipo: string
      referencia_id: string | null
    } | null = null

    const rec = payload.record
    if (rec?.id && rec.usuario_id) {
      notif = {
        id: String(rec.id),
        usuario_id: String(rec.usuario_id),
        titulo: String(rec.titulo ?? 'Jemani'),
        mensagem: String(rec.mensagem ?? ''),
        tipo: String(rec.tipo ?? 'sistema'),
        referencia_id: rec.referencia_id ?? null,
      }
    }

    if (!notif) {
      for (let tentativa = 0; tentativa < 4 && !notif; tentativa++) {
        if (tentativa > 0) await new Promise((r) => setTimeout(r, 200 * tentativa))
        const { data } = await db
          .from('notifications')
          .select('id, usuario_id, titulo, mensagem, tipo, referencia_id')
          .eq('id', notificationId)
          .maybeSingle()
        if (data) notif = data
      }
    }

    if (!notif) {
      return json({ erro: 'Notificação não encontrada' }, 404)
    }

    const { data: cfg } = await db
      .from('platform_settings')
      .select('valor')
      .eq('chave', 'notificacoes_push')
      .maybeSingle()

    if ((cfg?.valor ?? 'true') === 'false') {
      return json({ ok: true, enviado: 0, motivo: 'push_desligado' })
    }

    const { data: perfil } = await db
      .from('profiles')
      .select('tipo')
      .eq('id', notif.usuario_id)
      .maybeSingle()

    const { data: tokens, error: erroTokens } = await db
      .from('device_push_tokens')
      .select('id, token, plataforma')
      .eq('usuario_id', notif.usuario_id)
      .eq('ativo', true)

    if (erroTokens) return json({ erro: erroTokens.message }, 500)
    const lista = (tokens ?? []) as TokenLinha[]
    if (lista.length === 0) return json({ ok: true, enviado: 0, motivo: 'sem_tokens' })

    const conta = lerContaServico()
    const accessToken = await obterAccessTokenFcm(conta)
    const rota = rotaPorTipo(perfil?.tipo, notif.referencia_id)
    const dataPayload = {
      notificationId: String(notif.id),
      tipo: String(notif.tipo ?? 'sistema'),
      referenciaId: String(notif.referencia_id ?? ''),
      rota,
    }

    let enviados = 0
    const falhas: Array<{ token: string; detalhe: unknown }> = []

    for (const item of lista) {
      const resultado = await enviarFcm({
        accessToken,
        projectId: conta.project_id,
        token: item.token,
        titulo: notif.titulo || 'Jemani',
        mensagem: notif.mensagem || '',
        data: dataPayload,
      })
      if (resultado.ok) {
        enviados += 1
        continue
      }
      falhas.push({ token: item.token.slice(0, 12), detalhe: resultado.corpo })
      const codigo = String(
        (resultado.corpo as { error?: { details?: Array<{ errorCode?: string }> } })?.error
          ?.details?.[0]?.errorCode ?? '',
      )
      if (codigo === 'UNREGISTERED' || codigo === 'INVALID_ARGUMENT' || resultado.status === 404) {
        await db
          .from('device_push_tokens')
          .update({ ativo: false, updated_at: new Date().toISOString() })
          .eq('id', item.id)
      }
    }

    return json({ ok: true, enviado: enviados, falhas: falhas.length, detalhes: falhas })
  } catch (erro) {
    console.error('enviar-push', erro)
    return json({ erro: erro instanceof Error ? erro.message : 'Falha interna' }, 500)
  }
})
