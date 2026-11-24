import { Capacitor } from '@capacitor/core'
import type { StateStorage } from 'zustand/middleware'
import { obterIdAbaSessao } from '@/lib/idAbaSessao'

const CAMPOS_SESSAO = new Set(['sessaoId', 'perfis', 'empresas', 'motoristas'])

function chaveSessaoAba(nome: string): string {
  return `${nome}__sessao__${obterIdAbaSessao()}`
}

type Persistido = {
  state?: Record<string, unknown>
  version?: number
}

/**
 * No navegador, a fatia de sessão (sessaoId/perfil) fica no sessionStorage da aba.
 * O restante continua no localStorage compartilhado.
 * No app nativo, mantém tudo no localStorage (uma WebView).
 */
export function storageZustandPorAba(): StateStorage {
  if (Capacitor.isNativePlatform() || typeof sessionStorage === 'undefined') {
    return {
      getItem: (name) => localStorage.getItem(name),
      setItem: (name, value) => localStorage.setItem(name, value),
      removeItem: (name) => localStorage.removeItem(name),
    }
  }

  return {
    getItem: (name) => {
      const compartilhado = localStorage.getItem(name)
      const sessaoAba = sessionStorage.getItem(chaveSessaoAba(name))
      if (!compartilhado && !sessaoAba) return null

      let base: Persistido = {}
      try {
        base = compartilhado ? (JSON.parse(compartilhado) as Persistido) : {}
      } catch {
        base = {}
      }

      let fatia: Record<string, unknown> = {}
      try {
        fatia = sessaoAba ? (JSON.parse(sessaoAba) as Record<string, unknown>) : {}
      } catch {
        fatia = {}
      }

      // Primeira visita da aba: herda sessaoId legado do localStorage uma vez.
      if (!sessaoAba && base.state && typeof base.state.sessaoId === 'string') {
        fatia = {
          sessaoId: base.state.sessaoId,
          perfis: base.state.perfis ?? [],
          empresas: base.state.empresas ?? [],
          motoristas: base.state.motoristas ?? [],
        }
        sessionStorage.setItem(chaveSessaoAba(name), JSON.stringify(fatia))
        localStorage.setItem(
          name,
          JSON.stringify({
            ...base,
            state: {
              ...(base.state ?? {}),
              sessaoId: null,
              perfis: [],
              empresas: [],
              motoristas: [],
            },
          }),
        )
      }

      return JSON.stringify({
        ...base,
        state: {
          ...(base.state ?? {}),
          ...fatia,
        },
      })
    },
    setItem: (name, value) => {
      let parsed: Persistido
      try {
        parsed = JSON.parse(value) as Persistido
      } catch {
        localStorage.setItem(name, value)
        return
      }

      const estado = parsed.state ?? {}
      const fatiaSessao: Record<string, unknown> = {}
      const resto: Record<string, unknown> = {}

      for (const [chave, valor] of Object.entries(estado)) {
        if (CAMPOS_SESSAO.has(chave)) fatiaSessao[chave] = valor
        else resto[chave] = valor
      }

      // Não deixa sessaoId “vazar” para outras abas via localStorage.
      resto.sessaoId = null
      resto.perfis = []
      resto.empresas = []
      resto.motoristas = []

      sessionStorage.setItem(chaveSessaoAba(name), JSON.stringify(fatiaSessao))
      localStorage.setItem(
        name,
        JSON.stringify({
          ...parsed,
          state: resto,
        }),
      )
    },
    removeItem: (name) => {
      localStorage.removeItem(name)
      sessionStorage.removeItem(chaveSessaoAba(name))
    },
  }
}
