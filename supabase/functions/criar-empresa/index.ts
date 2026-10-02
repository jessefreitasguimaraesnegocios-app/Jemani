import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  })
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS })
  if (req.method !== "POST") return json({ erro: "Método não permitido" }, 405)

  const url = Deno.env.get("SUPABASE_URL")
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!url || !service) {
    return json({ erro: "Supabase admin não configurado" }, 500)
  }

  let payload: {
    nome_comercial?: string
    razao_social?: string
    cnpj?: string
    telefone?: string
    email?: string
    senha?: string
    cidade?: string
    endereco_base?: string
    latitude?: number
    longitude?: number
    regioes_atendidas?: string[]
    categorias_ids?: string[]
    nome_gestor?: string
  }

  try {
    payload = await req.json()
  } catch {
    return json({ erro: "JSON inválido" }, 400)
  }

  const nome_comercial = (payload.nome_comercial ?? "").trim()
  const razao_social = (payload.razao_social ?? "").trim()
  const cnpj = (payload.cnpj ?? "").trim()
  const telefone = (payload.telefone ?? "").trim()
  const email = (payload.email ?? "").trim().toLowerCase()
  const senha = payload.senha ?? ""
  const cidade = (payload.cidade ?? "").trim()

  if (!nome_comercial || !razao_social || !cnpj || !telefone || !email || !cidade) {
    return json({ erro: "Preencha nome, razão social, EIN, telefone, e-mail e cidade." }, 400)
  }
  if (senha.length < 6) {
    return json({ erro: "Senha do acesso da empresa precisa ter no mínimo 6 caracteres." }, 400)
  }
  if (typeof payload.latitude !== "number" || typeof payload.longitude !== "number") {
    return json({ erro: "Informe o endereço-base com coordenadas (rua e número)." }, 400)
  }

  const admin = createClient(url, service)

  const { data: existenteEin } = await admin
    .from("companies")
    .select("id")
    .eq("cnpj", cnpj)
    .maybeSingle()
  if (existenteEin) {
    return json({ erro: "Já existe uma empresa com este EIN / CNPJ." }, 409)
  }

  const { data: userData, error: userErro } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
  })
  if (userErro || !userData.user) {
    return json({ erro: userErro?.message ?? "Falha ao criar usuário da empresa" }, 400)
  }

  const usuarioId = userData.user.id
  const agora = new Date().toISOString()
  const nomeGestor = (payload.nome_gestor ?? "").trim() || `Gestor ${nome_comercial}`

  const { error: perfilErro } = await admin.from("profiles").insert({
    id: usuarioId,
    email,
    nome: nomeGestor,
    telefone,
    tipo: "empresa",
    ativo: true,
    created_at: agora,
    updated_at: agora,
  })
  if (perfilErro) {
    await admin.auth.admin.deleteUser(usuarioId)
    return json({ erro: perfilErro.message }, 400)
  }

  const empresa = {
    usuario_id: usuarioId,
    nome_comercial,
    razao_social,
    cnpj,
    telefone,
    email,
    cidade,
    endereco_base: (payload.endereco_base ?? "").trim(),
    latitude: payload.latitude,
    longitude: payload.longitude,
    regioes_atendidas: payload.regioes_atendidas?.filter(Boolean) ?? [cidade],
    categorias_ids: (payload.categorias_ids ?? []).filter((id) => UUID.test(id)),
    status: "ativa",
    habilitada_receber: true,
    avaliacao_media: 5,
    comissao_percentual: 10,
  }

  const { data: criada, error: empErro } = await admin
    .from("companies")
    .insert(empresa)
    .select("*")
    .single()

  if (empErro || !criada) {
    await admin.from("profiles").delete().eq("id", usuarioId)
    await admin.auth.admin.deleteUser(usuarioId)
    return json({ erro: empErro?.message ?? "Falha ao salvar empresa" }, 400)
  }

  await admin.from("company_users").insert({
    company_id: criada.id,
    user_id: usuarioId,
    papel: "gestor",
  })

  return json({ empresa: criada })
})
