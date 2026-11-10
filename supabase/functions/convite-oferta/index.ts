import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { CORS, json } from '../_shared/cors.ts'

type Corpo = {
  acao: 'consultar' | 'aceitar'
  token?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const url = Deno.env.get('SUPABASE_URL')
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!url || !service) {
      return json({ ok: false, erro: 'config' }, 500)
    }

    const corpo = (await req.json()) as Corpo
    const token = String(corpo.token ?? '').trim()
    if (!token || token.length < 16) {
      return json({ ok: false, erro: 'link_invalido' }, 400)
    }

    const admin = createClient(url, service)
    const rpc =
      corpo.acao === 'aceitar' ? 'aceitar_convite_oferta' : 'consultar_convite_oferta'
    const { data, error } = await admin.rpc(rpc, { p_token: token })
    if (error) {
      return json({ ok: false, erro: error.message }, 400)
    }

    return json(data ?? { ok: false, erro: 'indisponivel' })
  } catch (e) {
    return json({ ok: false, erro: e instanceof Error ? e.message : 'erro' }, 500)
  }
})
