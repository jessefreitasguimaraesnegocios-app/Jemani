import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { CORS, json } from '../_shared/cors.ts'
import { exigirUsuario, ehAdmin, RespostaAuth } from '../_shared/auth.ts'
import { distribuirOfertasAposPagamento } from '../_shared/distribuirOfertas.ts'

/**
 * Marca a corrida como paga sem Stripe e abre ofertas às empresas elegíveis.
 * Só para teste (secret ALLOW_DEV_PAYMENT=true).
 */
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ erro: 'Método não permitido' }, 405)

  if (Deno.env.get('ALLOW_DEV_PAYMENT') !== 'true') {
    return json({ erro: 'Simulação de pagamento desligada no servidor' }, 403)
  }

  try {
    const { user, perfil } = await exigirUsuario(req)
    const body = await req.json()
    const viagemId = String(body.viagem_id ?? '').trim()
    if (!viagemId) return json({ erro: 'viagem_id obrigatório' }, 400)

    const url = Deno.env.get('SUPABASE_URL')
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!url || !service) return json({ erro: 'Supabase admin não configurado' }, 500)
    const admin = createClient(url, service)

    const { data: viagem, error: erroViagem } = await admin
      .from('trips')
      .select('id,cliente_id,empresa_id')
      .eq('id', viagemId)
      .maybeSingle()

    if (erroViagem) return json({ erro: erroViagem.message }, 400)
    if (!viagem) return json({ erro: 'Viagem não encontrada' }, 404)
    if (!ehAdmin(perfil) && viagem.cliente_id !== user.id) {
      return json({ erro: 'Sem permissão' }, 403)
    }
    if (viagem.empresa_id) {
      return json({ pago: true, ja_atribuida: true, ofertas: 0 })
    }

    const resultado = await distribuirOfertasAposPagamento(
      admin,
      viagemId,
      'pagamento_simulado',
    )

    return json({
      pago: true,
      ofertas: resultado.ofertas,
      status: resultado.status,
    })
  } catch (err) {
    if (err instanceof RespostaAuth) return json({ erro: err.message }, err.status)
    const mensagem = err instanceof Error ? err.message : 'Erro ao simular pagamento'
    return json({ erro: mensagem }, 500)
  }
})
