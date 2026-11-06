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

const login = await fetch(`${base}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { apikey: anon, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: process.env.SMOKE_EMAIL || 'admin@jemani.app',
    password: process.env.SMOKE_SENHA || 'demo1234',
  }),
})
const sess = await login.json()
const jwt = sess.access_token
if (!jwt) {
  console.log(JSON.stringify({ ok: false, erro: 'login falhou' }))
  process.exit(1)
}

const res = await fetch(`${base}/rest/v1/rpc/empresas_marketplace`, {
  method: 'POST',
  headers: {
    apikey: anon,
    Authorization: `Bearer ${jwt}`,
    'Content-Type': 'application/json',
  },
  body: '{}',
})
const full = await res.text()

const openapi = await fetch(`${base}/rest/v1/?apikey=${anon}`, {
  headers: {
    apikey: anon,
    Authorization: `Bearer ${jwt}`,
    Accept: 'application/openapi+json',
  },
})
const spec = await openapi.text()
const paths = [...spec.matchAll(/\/rpc\/([a-z0-9_]+)/gi)].map((m) => m[1])
const relacionadas = [...new Set(paths)].filter((p) =>
  /empresa|market|rate_limit|edge_/i.test(p),
)

console.log(
  JSON.stringify(
    {
      status: res.status,
      erro_completo: (() => {
        try {
          return JSON.parse(full)
        } catch {
          return full
        }
      })(),
      openapi_status: openapi.status,
      rpcs_relacionadas_no_openapi: relacionadas.slice(0, 40),
      total_rpcs: [...new Set(paths)].length,
    },
    null,
    2,
  ),
)
