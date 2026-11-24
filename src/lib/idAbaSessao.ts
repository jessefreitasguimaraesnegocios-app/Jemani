/**
 * Identidade estável da aba (sobrevive a F5) e exclusiva entre abas.
 * sessionStorage é copiado ao duplicar a aba — o heartbeat em localStorage
 * detecta o conflito e gera um novo id, migrando as chaves da sessão.
 */

const CHAVE_ID = 'jemani-aba-id'
const CHAVE_NAV = 'jemani-aba-nav'
const PREFIXO_HEART = 'jemani-aba-heart:'

function gerarId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `aba-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function migrarPrefixosSessionStorage(idAntigo: string, idNovo: string) {
  if (typeof sessionStorage === 'undefined') return
  const pendentes: Array<{ de: string; para: string; valor: string }> = []
  for (let i = 0; i < sessionStorage.length; i++) {
    const chave = sessionStorage.key(i)
    if (!chave || !chave.includes(idAntigo)) continue
    if (chave === CHAVE_ID || chave === CHAVE_NAV) continue
    pendentes.push({
      de: chave,
      para: chave.split(idAntigo).join(idNovo),
      valor: sessionStorage.getItem(chave) ?? '',
    })
  }
  for (const item of pendentes) {
    sessionStorage.setItem(item.para, item.valor)
    sessionStorage.removeItem(item.de)
  }
}

function lerHeart(id: string): { nav: string; ts: number } | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const bruto = localStorage.getItem(PREFIXO_HEART + id)
    if (!bruto) return null
    const lido = JSON.parse(bruto) as { nav?: string; ts?: number }
    if (typeof lido.nav !== 'string' || typeof lido.ts !== 'number') return null
    return { nav: lido.nav, ts: lido.ts }
  } catch {
    return null
  }
}

function gravarHeart(id: string, nav: string) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(PREFIXO_HEART + id, JSON.stringify({ nav, ts: Date.now() }))
}

function limparHeart(id: string) {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(PREFIXO_HEART + id)
}

let idAbaMemo: string | null = null
let heartbeatIniciado = false

/**
 * Resolve o id da aba de forma síncrona (necessário antes do createClient).
 * No app nativo não há multi-aba real — retorna constante.
 */
export function obterIdAbaSessao(): string {
  if (idAbaMemo) return idAbaMemo

  if (typeof sessionStorage === 'undefined') {
    idAbaMemo = 'nativo'
    return idAbaMemo
  }

  const nav = gerarId()
  sessionStorage.setItem(CHAVE_NAV, nav)

  let id = sessionStorage.getItem(CHAVE_ID)
  if (!id) {
    id = gerarId()
    sessionStorage.setItem(CHAVE_ID, id)
  } else {
    const heart = lerHeart(id)
    const outroVivo = Boolean(heart && heart.nav !== nav && Date.now() - heart.ts < 2000)
    if (outroVivo) {
      const antigo = id
      id = gerarId()
      sessionStorage.setItem(CHAVE_ID, id)
      migrarPrefixosSessionStorage(antigo, id)
      limparHeart(antigo)
    }
  }

  idAbaMemo = id
  iniciarHeartbeat(id, nav)
  return id
}

function iniciarHeartbeat(id: string, nav: string) {
  if (heartbeatIniciado || typeof window === 'undefined') return
  heartbeatIniciado = true
  gravarHeart(id, nav)
  window.setInterval(() => gravarHeart(id, nav), 600)
  const aoSair = () => limparHeart(id)
  window.addEventListener('pagehide', aoSair)
  window.addEventListener('beforeunload', aoSair)
}

/** Chave lógica do GoTrue — única por aba para não sincronizar via BroadcastChannel. */
export function chaveStorageAuthSupabase(): string {
  return `jemani-auth-${obterIdAbaSessao()}`
}
