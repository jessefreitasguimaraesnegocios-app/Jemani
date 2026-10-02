import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react'
import { useDemoStore } from '@/store/demoStore'
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const sessaoId = useDemoStore((s) => s.sessaoId)
  const perfis = useDemoStore((s) => s.perfis)
  const entrarStore = useDemoStore((s) => s.entrar)
  const cadastrarStore = useDemoStore((s) => s.cadastrar)
  const sairStore = useDemoStore((s) => s.sair)

  const usuario = useMemo(
    () => perfis.find((p) => p.id === sessaoId) ?? null,
    [perfis, sessaoId],
  )

  const value: AuthContextValue = {
    usuario,
    carregando: false,
    modoDemo: import.meta.env.VITE_DEMO_MODE !== 'false',
    senhaDemo: SENHA_DEMO,
    entrar: async (email, senha) => entrarStore(email, senha),
    cadastrar: async (dados) => cadastrarStore(dados),
    sair: async () => {
      sairStore()
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
