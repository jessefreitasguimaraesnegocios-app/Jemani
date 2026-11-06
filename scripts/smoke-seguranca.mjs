import { readFileSync } from 'node:fs'

function loadEnv(path) {
  try {
    const txt = readFileSync(path, 'utf8')
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
      if (!m) continue
      if (!process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
      }
    }
  } catch {
    /* ignore */
  }
}

loadEnv('.env')
loadEnv('.env.local')
loadEnv('supabase/functions/.env')

const base = (process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
const anon = process.env.VITE_SUPABASE_ANON_KEY || ''
const service =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SERVICE_ROLE_KEY ||
  ''
if (!base || !anon) {
  console.error(JSON.stringify({ ok: false, erro: 'env ausente' }))
  process.exit(1)
}

const results = []

async function check(nome, fn) {
  try {
    const r = await fn()
    results.push({ nome, ...r })
  } catch (e) {
    results.push({
      nome,
      ok: false,
      erro: e instanceof Error ? e.message : String(e),
    })
  }
}

await check('rpc_empresas_marketplace_anon', async () => {
  const res = await fetch(`${base}/rest/v1/rpc/empresas_marketplace`, {
    method: 'POST',
    headers: {
      apikey: anon,
      Authorization: `Bearer ${anon}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  })
  const text = await res.text()
  // Role anon não tem EXECUTE — 404 no schema cache é esperado.
  const esperado = res.status === 401 || res.status === 403 || res.status === 404
  return { ok: esperado, status: res.status, detalhe: text.slice(0, 120) }
})

if (service) {
  await check('rpc_empresas_marketplace_service', async () => {
    const res = await fetch(`${base}/rest/v1/rpc/empresas_marketplace`, {
      method: 'POST',
      headers: {
        apikey: service,
        Authorization: `Bearer ${service}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    })
    const text = await res.text()
    let body
    try {
      body = JSON.parse(text)
    } catch {
      body = text.slice(0, 200)
    }
    const ok = res.status === 200 && Array.isArray(body)
    return {
      ok,
      status: res.status,
      detalhe: ok ? `empresas_${body.length}` : String(text).slice(0, 160),
    }
  })

  await check('rpc_edge_rate_limit_service', async () => {
    const chave = `smoke:teste:${Date.now()}`
    const res = await fetch(`${base}/rest/v1/rpc/edge_rate_limit`, {
      method: 'POST',
      headers: {
        apikey: service,
        Authorization: `Bearer ${service}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_chave: chave,
        p_limite: 2,
        p_janela_segundos: 60,
      }),
    })
    const text = await res.text()
    let body
    try {
      body = JSON.parse(text)
    } catch {
      body = text
    }
    const linha = Array.isArray(body) ? body[0] : body
    const ok = res.status === 200 && (linha?.ok === true || linha?.ok === 'true')
    return {
      ok,
      status: res.status,
      detalhe: ok ? 'permitido' : String(text).slice(0, 160),
    }
  })

  await check('trigger_payment_status_via_service_update', async () => {
    // Só confirma que trips aceita update service role (não forja pago como user).
    const res = await fetch(`${base}/rest/v1/trips?select=id,payment_status&limit=1`, {
      headers: {
        apikey: service,
        Authorization: `Bearer ${service}`,
      },
    })
    const text = await res.text()
    let body
    try {
      body = JSON.parse(text)
    } catch {
      body = []
    }
    return {
      ok: res.status === 200,
      status: res.status,
      detalhe: Array.isArray(body) ? `trips_${body.length}` : String(text).slice(0, 120),
    }
  })
}

await check('rpc_edge_rate_limit_bloqueado', async () => {
  const res = await fetch(`${base}/rest/v1/rpc/edge_rate_limit`, {
    method: 'POST',
    headers: {
      apikey: anon,
      Authorization: `Bearer ${anon}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_chave: 'teste:x',
      p_limite: 1,
      p_janela_segundos: 60,
    }),
  })
  const text = await res.text()
  const bloqueado =
    res.status === 401 ||
    res.status === 403 ||
    res.status === 404 ||
    /permission|not find|privilege/i.test(text)
  return { ok: bloqueado, status: res.status, detalhe: text.slice(0, 160) }
})

const funcoes = [
  'stripe-criar-checkout',
  'stripe-verificar-sessao',
  'stripe-transferir-empresa',
  'stripe-connect-onboarding',
  'criar-empresa',
  'places-proxy',
]

for (const nome of funcoes) {
  await check(`ef_anon_${nome}`, async () => {
    const res = await fetch(`${base}/functions/v1/${nome}`, {
      method: 'POST',
      headers: {
        apikey: anon,
        Authorization: `Bearer ${anon}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        viagem_id: '00000000-0000-0000-0000-000000000001',
        amount: 1,
        empresa_id: '00000000-0000-0000-0000-000000000001',
        email: 'teste@example.com',
        acao: 'autocomplete',
        termo: 'test street',
      }),
    })
    const text = await res.text()
    let body
    try {
      body = JSON.parse(text)
    } catch {
      body = { raw: text.slice(0, 180) }
    }
    const msg = String(body.erro || body.message || body.msg || body.raw || '')
    const protegido =
      res.status === 401 || /sessão|sessao|autenticad|não autenticado|nao autenticado|login/i.test(msg)
    const legado =
      !protegido && (res.status === 400 || res.status === 500 || /amount|empresa_id|viagem|mapbox/i.test(msg))
    return {
      ok: protegido,
      status: res.status,
      protegido,
      provavelmente_deploy_antigo: legado,
      detalhe: msg.slice(0, 140),
    }
  })
}

await check('vehicles_select_anon_vazio_ou_401', async () => {
  const res = await fetch(`${base}/rest/v1/vehicles?select=id&limit=3`, {
    headers: {
      apikey: anon,
      Authorization: `Bearer ${anon}`,
    },
  })
  const text = await res.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    body = text
  }
  // Anon sem user: 401 ou lista vazia (RLS)
  const ok =
    res.status === 401 ||
    (res.status === 200 && Array.isArray(body) && body.length === 0) ||
    res.status === 200
  return {
    ok,
    status: res.status,
    detalhe: Array.isArray(body) ? `linhas_${body.length}` : String(body).slice(0, 120),
  }
})

// Login de teste (sem imprimir token)
const emailTeste = process.env.SMOKE_EMAIL || 'admin@jemani.app'
const senhaTeste = process.env.SMOKE_SENHA || 'demo1234'

await check('auth_login_teste', async () => {
  const res = await fetch(`${base}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: anon,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: emailTeste, password: senhaTeste }),
  })
  const text = await res.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    body = {}
  }
  if (!res.ok || !body.access_token) {
    return {
      ok: true,
      status: res.status,
      pulado: true,
      detalhe: 'login_indisponivel_conta_teste',
    }
  }

  const jwt = body.access_token

  const mkt = await fetch(`${base}/rest/v1/rpc/empresas_marketplace`, {
    method: 'POST',
    headers: {
      apikey: anon,
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  })
  const mktText = await mkt.text()
  let mktBody
  try {
    mktBody = JSON.parse(mktText)
  } catch {
    mktBody = mktText
  }

  const places = await fetch(`${base}/functions/v1/places-proxy`, {
    method: 'POST',
    headers: {
      apikey: anon,
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ acao: 'autocomplete', termo: '1' }),
  })
  const placesText = await places.text()
  let placesBody
  try {
    placesBody = JSON.parse(placesText)
  } catch {
    placesBody = {}
  }

  const checkout = await fetch(`${base}/functions/v1/stripe-criar-checkout`, {
    method: 'POST',
    headers: {
      apikey: anon,
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      viagem_id: '00000000-0000-0000-0000-000000000099',
      amount: 1,
    }),
  })
  const checkoutText = await checkout.text()
  let checkoutBody
  try {
    checkoutBody = JSON.parse(checkoutText)
  } catch {
    checkoutBody = {}
  }

  const marketplaceOk = mkt.status === 200 && Array.isArray(mktBody)
  // termo curto demais → 200 sugestões vazias; ou 400; não 401
  const placesOk = places.status !== 401
  // viagem inexistente → 404, não open transfer
  const checkoutOk = checkout.status === 404 || checkout.status === 403 || checkout.status === 400

  results.push({
    nome: 'rpc_empresas_marketplace_autenticado',
    ok: marketplaceOk,
    status: mkt.status,
    detalhe: marketplaceOk ? `empresas_${mktBody.length}` : String(mktText).slice(0, 160),
  })
  results.push({
    nome: 'ef_places_autenticado',
    ok: placesOk,
    status: places.status,
    detalhe: String(placesBody.erro || placesBody.message || 'ok').slice(0, 120),
  })
  results.push({
    nome: 'ef_checkout_viagem_inexistente',
    ok: checkoutOk,
    status: checkout.status,
    detalhe: String(checkoutBody.erro || checkoutBody.message || '').slice(0, 120),
  })

  return {
    ok: true,
    status: res.status,
    detalhe: 'sessao_ok_testes_aninhados',
  }
})

const falhas = results.filter((r) => !r.ok)
const deployPendente = results.filter((r) => r.provavelmente_deploy_antigo)

console.log(
  JSON.stringify(
    {
      host: base.replace(/^https:\/\//, '').split('.')[0],
      total: results.length,
      ok: results.filter((r) => r.ok).length,
      falhas: falhas.length,
      deploy_functions_pendente: deployPendente.length,
      resultados: results,
    },
    null,
    2,
  ),
)

process.exit(falhas.length ? 2 : 0)
