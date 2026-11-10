import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { corsHeaders } from '../_shared/cors.ts'

type Corpo = {
  acao: 'consultar' | 'aceitar'
  token?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = Deno.env.get('SUPABASE_URL')
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!url || !service) {
      return new Response(JSON.stringify({ ok: false, erro: 'config' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const corpo = (await req.json()) as Corpo
    const token = String(corpo.token ?? '').trim()
    if (!token || token.length < 16) {
      return new Response(JSON.stringify({ ok: false, erro: 'link_invalido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(url, service)
    const rpc =
      corpo.acao === 'aceitar' ? 'aceitar_convite_oferta' : 'consultar_convite_oferta'
    const { data, error } = await admin.rpc(rpc, { p_token: token })
    if (error) {
      return new Response(JSON.stringify({ ok: false, erro: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify(data ?? { ok: false, erro: 'indisponivel' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, erro: e instanceof Error ? e.message : 'erro' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
