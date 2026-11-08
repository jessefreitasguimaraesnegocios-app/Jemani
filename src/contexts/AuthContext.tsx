import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useDemoStore } from '@/store/demoStore'
import { modoDemoAtivo, usarNuvemComoFonte } from '@/lib/nuvemAtiva'
import { supabase } from '@/lib/supabase'
import { carregarContaSessaoAtual, sairNuvem } from '@/services/nuvemCorrida'
import type { Perfil, TipoUsuario } from '@/types'
import { SENHA_DEMO } from '@/data/seed'

interface AuthContextValue {
  usuario: Perfil | null
  carregando: boolean
  entrar: (email: string, senha: string) => Promise<Perfil>
  cadastrar: (dados: {
    nome: string
    email: string
    senha: string
    telefone?: string
    tipo?: TipoUsuario
  }) => Promise<Perfil>
  sair: () => Promise<void>
  modoDemo: boolean
  senhaDemo: string
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function restaurarSessaoComRetry(tentativas = 6) {
  for (let i = 0; i < tentativas; i++) {
    const conta = await carregarContaSessaoAtual()
    if (conta) return conta
    if (supabase) {
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        const contaSessao = await carregarContaSessaoAtual()
        if (contaSessao) return contaSessao
      }
      // Tenta renovar token persistido antes de desistir.
      const refrescou = await supabase.auth.refreshSession()
      if (!refrescou.error && refrescou.data.session) {
        const contaRefresh = await carregarContaSessaoAtual()
        if (contaRefresh) return contaRefresh
      }
    }
    await new Promise((r) => setTimeout(r, 250 * (i + 1)))
  }
  return null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const sessaoId = useDemoStore((s) => s.sessaoId)
  const perfis = useDemoStore((s) => s.perfis)
  const entrarStore = useDemoStore((s) => s.entrar)
  const cadastrarStore = useDemoStore((s) => s.cadastrar)
  const sairStore = useDemoStore((s) => s.sair)
  const aplicarContaNuvem = useDemoStore((s) => s.aplicarContaNuvem)
  const [carregando, setCarregando] = useState(usarNuvemComoFonte())

  useEffect(() => {
    if (!usarNuvemComoFonte() || !supabase) {
      setCarregando(false)
      return
    }

    let cancelado = false

    async function restaurar() {
      try {
        const conta = await restaurarSessaoComRetry()
        if (cancelado) return
        if (conta) {
          aplicarContaNuvem(conta)
          return
        }
        // Só desloga se realmente não houver sessão Auth.
        // Mantém sessaoId local enquanto a restauração ainda pode concluir via evento.
        const { data } = await supabase!.auth.getSession()
        if (!data.session && useDemoStore.getState().sessaoId) {
          sairStore()
        }
      } finally {
        if (!cancelado) setCarregando(false)
      }
    }

    void restaurar()

    const { data } = supabase.auth.onAuthStateChange(async (evento, sessao) => {
      if (cancelado) return
      if (evento === 'SIGNED_OUT') {
        if (useDemoStore.getState().sessaoId) sairStore()
        return
      }
      if (!sessao?.user) return
      if (
        evento === 'SIGNED_IN' ||
        evento === 'TOKEN_REFRESHED' ||
        evento === 'INITIAL_SESSION'
      ) {
        const conta = await carregarContaSessaoAtual()
        if (!cancelado && conta) aplicarContaNuvem(conta)
      }
    })

    return () => {
      cancelado = true
      data.subscription.unsubscribe()
    }
  }, [aplicarContaNuvem, sairStore])

  const usuario = useMemo(
    () => perfis.find((p) => p.id === sessaoId) ?? null,
    [perfis, sessaoId],
  )

  const value: AuthContextValue = {
    usuario,
    carregando,
    modoDemo: modoDemoAtivo(),
    senhaDemo: SENHA_DEMO,
    entrar: async (email, senha) => entrarStore(email, senha),
    cadastrar: async (dados) => cadastrarStore(dados),
    sair: async () => {
      sairStore()
      await sairNuvem()
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}

export function rotaPorTipo(tipo: TipoUsuario): string {
  switch (tipo) {
    case 'admin':
      return '/admin'
    case 'empresa':
      return '/empresa'
    case 'motorista':
      return '/motorista'
    default:
      return '/app'
  }
}
