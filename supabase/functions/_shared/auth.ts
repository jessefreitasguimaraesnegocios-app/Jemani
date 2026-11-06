import { createClient, type User } from 'jsr:@supabase/supabase-js@2'

export type PerfilAuth = {
  id: string
  tipo: string
  ativo: boolean
}

export function clienteAdmin() {
  const url = Deno.env.get('SUPABASE_URL')
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !service) throw new Error('Supabase admin não configurado')
  return createClient(url, service)
}

export function clienteComJwt(jwt: string) {
  const url = Deno.env.get('SUPABASE_URL')
  const anon = Deno.env.get('SUPABASE_ANON_KEY')
  if (!url || !anon) throw new Error('Supabase não configurado')
  return createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  })
}

/** Exige JWT de usuário (não aceita só a anon key). */
export async function exigirUsuario(req: Request): Promise<{
  jwt: string
  user: User
  perfil: PerfilAuth
}> {
  const auth = req.headers.get('Authorization') ?? ''
  const jwt = auth.replace(/^Bearer\s+/i, '').trim()
  if (!jwt) throw new RespostaAuth('Não autenticado', 401)

  const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  if (anon && jwt === anon) {
    throw new RespostaAuth('Sessão de usuário obrigatória', 401)
  }

  const admin = clienteAdmin()
  const { data, error } = await admin.auth.getUser(jwt)
  if (error || !data.user) throw new RespostaAuth('Sessão inválida', 401)

  const { data: perfil, error: erroPerfil } = await admin
    .from('profiles')
    .select('id,tipo,ativo')
    .eq('id', data.user.id)
    .maybeSingle()

  if (erroPerfil || !perfil || !perfil.ativo) {
    throw new RespostaAuth('Perfil inativo ou ausente', 403)
  }

  return {
    jwt,
    user: data.user,
    perfil: perfil as PerfilAuth,
  }
}

export class RespostaAuth extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export function ehAdmin(perfil: PerfilAuth) {
  return perfil.tipo === 'admin'
}
