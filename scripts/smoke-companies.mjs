import { readFileSync } from 'node:fs'

function loadEnv(path) {
  try {
    const txt = readFileSync(path, 'utf8')
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
      if (!m) continue
      if (!process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
    }
  } catch {
    /* ignore */
  }
}

loadEnv('.env')
loadEnv('.env.local')

const base = (process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
const anon = process.env.VITE_SUPABASE_ANON_KEY || ''

async function login(email, password) {
  const res = await fetch(`${base}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anon, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json()
  return data.access_token || null
}

async function get(path, jwt) {
  const res = await fetch(`${base}${path}`, {
    headers: { apikey: anon, Authorization: `Bearer ${jwt}` },
  })
  const text = await res.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    body = text.slice(0, 240)
  }
  return { status: res.status, body }
}

async function rpc(name, jwt, body) {
  const res = await fetch(`${base}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: anon,
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body ?? {}),
  })
  const text = await res.text()
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    parsed = text.slice(0, 240)
  }
  return { status: res.status, body: parsed }
}

const jwt = await login('admin@jemani.app', 'demo1234')
if (!jwt) {
  console.log(JSON.stringify({ ok: false, erro: 'login admin falhou' }))
  process.exit(1)
}

const companies = await get(
  '/rest/v1/companies?select=id,nome_comercial,status,habilitada_receber,email&order=nome_comercial&limit=30',
  jwt,
)
const vehicles = await get(
  '/rest/v1/vehicles?select=id,empresa_id,marca,modelo,status&status=neq.inativo&limit=50',
  jwt,
)
const marketplace = await rpc('empresas_marketplace', jwt, {})
const rateLimit = await rpc('edge_rate_limit', jwt, {
  p_chave: 'smoke:admin',
  p_limite: 5,
  p_janela_segundos: 60,
})

// Cliente real? tentar email comum do seed
const clienteJwt = await login('cliente@jemani.app', 'demo1234')
let cliente = null
if (clienteJwt) {
  const cCompanies = await get(
    '/rest/v1/companies?select=id,nome_comercial&limit=10',
    clienteJwt,
  )
  const cVehicles = await get(
    '/rest/v1/vehicles?select=id,marca,modelo&status=neq.inativo&limit=20',
    clienteJwt,
  )
  const cMarket = await rpc('empresas_marketplace', clienteJwt, {})
  cliente = {
    companies_status: cCompanies.status,
    companies_count: Array.isArray(cCompanies.body) ? cCompanies.body.length : 0,
    companies_detalhe: Array.isArray(cCompanies.body)
      ? cCompanies.body.map((c) => c.nome_comercial)
      : cCompanies.body,
    vehicles_status: cVehicles.status,
    vehicles_count: Array.isArray(cVehicles.body) ? cVehicles.body.length : 0,
    marketplace_status: cMarket.status,
    marketplace_count: Array.isArray(cMarket.body) ? cMarket.body.length : 0,
    marketplace_detalhe: Array.isArray(cMarket.body)
      ? cMarket.body.slice(0, 5).map((c) => c.nome_comercial)
      : cMarket.body,
  }
}

console.log(
  JSON.stringify(
    {
      admin: {
        companies_status: companies.status,
        companies_count: Array.isArray(companies.body) ? companies.body.length : 0,
        empresas: Array.isArray(companies.body)
          ? companies.body.map((c) => ({
              nome: c.nome_comercial,
              status: c.status,
              habilitada: c.habilitada_receber,
            }))
          : companies.body,
        vehicles_status: vehicles.status,
        vehicles_count: Array.isArray(vehicles.body) ? vehicles.body.length : 0,
        marketplace: marketplace,
        edge_rate_limit_como_authenticated: rateLimit,
      },
      cliente_seed: cliente || 'login_cliente_indisponivel',
    },
    null,
    2,
  ),
)
