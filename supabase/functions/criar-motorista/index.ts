import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { CORS, json } from '../_shared/cors.ts'
import { exigirUsuario, ehAdmin, RespostaAuth } from '../_shared/auth.ts'
import { limitarTaxa, resposta429 } from '../_shared/rateLimit.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ erro: 'Método não permitido' }, 405)

  try {
    const { user, perfil } = await exigirUsuario(req)

    const limite = await limitarTaxa({
      chave: `criar-motorista:user:${user.id}`,
      limite: 30,
      janelaSegundos: 3600,
    })
    if (!limite.ok) return resposta429(limite.retryAfterSegundos)

    const url = Deno.env.get('SUPABASE_URL')
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!url || !service) return json({ erro: 'Supabase admin não configurado' }, 500)
    const admin = createClient(url, service)

    let payload: {
      empresa_id?: string
      nome?: string
      email?: string
      senha?: string
      telefone?: string
      cnh?: string
      categoria_cnh?: string
      experiencia_anos?: number
      eh_categoria_shield?: boolean
      foto_url?: string | null
    }
    try {
      payload = await req.json()
    } catch {
      return json({ erro: 'JSON inválido' }, 400)
    }

    const empresaId = (payload.empresa_id ?? '').trim()
    const nome = (payload.nome ?? '').trim()
    const email = (payload.email ?? '').trim().toLowerCase()
    const senha = payload.senha ?? ''
    const telefone = (payload.telefone ?? '').trim()
    const cnh = (payload.cnh ?? '').trim()
    const categoriaCnh = (payload.categoria_cnh ?? 'B').trim() || 'B'
    const experiencia = Number(payload.experiencia_anos ?? 0)

    if (!empresaId || !nome || !email || !telefone || !cnh) {
      return json({ erro: 'Preencha empresa, nome, e-mail, telefone e CNH.' }, 400)
    }
    if (senha.length < 6) {
      return json({ erro: 'A senha precisa ter pelo menos 6 caracteres.' }, 400)
    }

    const { data: empresa, error: empErro } = await admin
      .from('companies')
      .select('id,usuario_id')
      .eq('id', empresaId)
      .maybeSingle()
    if (empErro || !empresa) return json({ erro: 'Empresa não encontrada' }, 404)

    if (!ehAdmin(perfil) && empresa.usuario_id !== user.id) {
      const { data: vinculo } = await admin
        .from('company_users')
        .select('company_id')
        .eq('company_id', empresaId)
        .eq('user_id', user.id)
        .maybeSingle()
      if (!vinculo) return json({ erro: 'Sem permissão para cadastrar motorista nesta empresa' }, 403)
    }

    const { data: emailExistente } = await admin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()
    if (emailExistente) return json({ erro: 'E-mail já cadastrado' }, 409)

    const { data: userData, error: userErro } = await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
    })
    if (userErro || !userData.user) {
      return json({ erro: userErro?.message ?? 'Falha ao criar usuário do motorista' }, 400)
    }

    const usuarioId = userData.user.id
    const agora = new Date().toISOString()

    const { error: perfilErro } = await admin.from('profiles').insert({
      id: usuarioId,
      email,
      nome,
      telefone,
      tipo: 'motorista',
      ativo: true,
      created_at: agora,
      updated_at: agora,
    })
    if (perfilErro) {
      await admin.auth.admin.deleteUser(usuarioId)
      return json({ erro: perfilErro.message }, 400)
    }

    const { data: motorista, error: motErro } = await admin
      .from('drivers')
      .insert({
        empresa_id: empresaId,
        usuario_id: usuarioId,
        nome,
        telefone,
        cnh,
        categoria_cnh: categoriaCnh,
        experiencia_anos: Number.isFinite(experiencia) ? experiencia : 0,
        eh_categoria_shield: Boolean(payload.eh_categoria_shield),
        status: 'disponivel',
        disponivel: true,
        avaliacao_media: 5,
        foto_url: payload.foto_url?.trim() || null,
        created_at: agora,
        updated_at: agora,
      })
      .select('*')
      .single()

    if (motErro || !motorista) {
      await admin.from('profiles').delete().eq('id', usuarioId)
      await admin.auth.admin.deleteUser(usuarioId)
      return json({ erro: motErro?.message ?? 'Falha ao salvar motorista' }, 400)
    }

    return json({ motorista, perfil: { id: usuarioId, email, nome, tipo: 'motorista' } })
  } catch (err) {
    if (err instanceof RespostaAuth) return json({ erro: err.message }, err.status)
    const mensagem = err instanceof Error ? err.message : 'Erro ao criar motorista'
    return json({ erro: mensagem }, 500)
  }
})
