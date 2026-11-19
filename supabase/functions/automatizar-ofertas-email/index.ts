import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { clienteAdmin } from '../_shared/auth.ts'
import { json } from '../_shared/cors.ts'
import { corpoOfertaCorrida, corpoOfertaCorridaHtml } from '../_shared/modeloOfertaEmail.ts'

type Oferta = {
  id: string
  expires_at: string
  payload: {
    token: string
    email: string
    nome_comercial: string
    codigo: string
    origem: string
    destino: string
    data_viagem: string
    horario: string
    distance: number | null
    passageiros: number
    valor_empresa: number
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ erro: 'Método não permitido' }, 405)
  const secret = Deno.env.get('OFFER_EMAIL_CRON_SECRET')
  if (!secret || req.headers.get('x-offer-cron-secret') !== secret) {
    return json({ erro: 'Não autorizado' }, 401)
  }

  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) return json({ erro: 'RESEND_API_KEY ausente' }, 503)

  const appUrl = (Deno.env.get('APP_URL') || 'https://jemani.vercel.app').replace(/\/$/, '')
  const from = Deno.env.get('EMAIL_FROM')?.trim() || 'Jemani <onboarding@resend.dev>'
  const db = clienteAdmin()
  let enviados = 0
  let falhas = 0
  const inicio = Date.now()

  try {
    for (let i = 0; i < 10 && Date.now() - inicio < 35_000; i++) {
      const { data, error } = await db.rpc('reservar_email_oferta').maybeSingle<Oferta>()
      if (error) throw error
      if (!data) break

      const oferta = data.payload
      const dados = {
        empresaNome: oferta.nome_comercial,
        codigo: oferta.codigo,
        origem: oferta.origem,
        destino: oferta.destino,
        data: oferta.data_viagem,
        horario: oferta.horario.slice(0, 5),
        distanciaKm: oferta.distance ?? undefined,
        passageiros: oferta.passageiros,
        valorEmpresa: oferta.valor_empresa,
        urlRevisao: appUrl + '/convite/' + oferta.token,
        validoAte: new Date(data.expires_at).toLocaleString('pt-BR', {
          timeZone: 'America/Los_Angeles', day: '2-digit', month: 'short',
          hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
        }),
      }

      try {
        const resposta = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          signal: AbortSignal.timeout(8000),
          headers: {
            Authorization: 'Bearer ' + resendKey,
            'Content-Type': 'application/json',
            'Idempotency-Key': 'jemani-offer/' + data.id,
          },
          body: JSON.stringify({
            from,
            to: [oferta.email],
            subject: 'Jemani — Proposta de corrida ' + oferta.codigo,
            html: corpoOfertaCorridaHtml(dados),
            text: corpoOfertaCorrida(dados),
          }),
        })
        if (!resposta.ok) throw new Error('Resend HTTP ' + resposta.status)
        const { error: erroConclusao } = await db.rpc('concluir_email_oferta', { p_id: data.id })
        if (erroConclusao) throw erroConclusao
        enviados++
      } catch (erro) {
        falhas++
        console.error('Falha no envio da oferta', data.id, erro instanceof Error ? erro.message : 'erro')
      }
    }
  } catch (erro) {
    console.error('Falha ao reservar oferta', erro)
    return json({ erro: 'Falha na fila de automação' }, 500)
  }
  return json({ enviados, falhas }, falhas ? 502 : 200)
})
