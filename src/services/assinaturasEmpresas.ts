import type {
  ConfiguracaoPlataforma,
  Empresa,
  MensalidadeEmpresa,
  PlanoAcessoEmpresa,
  StatusMensalidade,
} from '@/types'

export const MENSALIDADE_PADRAO_USD = 1500

export type LinhaAssinatura = {
  empresa: Empresa
  plano: PlanoAcessoEmpresa
  valor: number
  mensalidade?: MensalidadeEmpresa
  statusMes: StatusMensalidade | 'nao_cobrado'
}

export function lerMensalidadePadrao(configuracoes: ConfiguracaoPlataforma[]) {
  const bruto = Number(
    configuracoes.find((c) => c.chave === 'mensalidade_padrao')?.valor ?? MENSALIDADE_PADRAO_USD,
  )
  return Number.isFinite(bruto) && bruto >= 0 ? bruto : MENSALIDADE_PADRAO_USD
}

export function competenciaDeData(data = new Date()) {
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  return `${ano}-${mes}`
}

export function rotuloCompetencia(competencia: string) {
  const [ano, mes] = competencia.split('-')
  if (!ano || !mes) return competencia
  return `${mes}/${ano}`
}

export function planoDaEmpresa(empresa: Empresa): PlanoAcessoEmpresa {
  return empresa.plano_acesso ?? 'assinatura'
}

export function valorMensalidadeEmpresa(
  empresa: Empresa,
  configuracoes: ConfiguracaoPlataforma[],
) {
  if (empresa.valor_mensalidade != null && Number.isFinite(Number(empresa.valor_mensalidade))) {
    return Number(empresa.valor_mensalidade)
  }
  return lerMensalidadePadrao(configuracoes)
}

export function montarLinhasAssinatura(
  empresas: Empresa[],
  mensalidades: MensalidadeEmpresa[],
  competencia: string,
  configuracoes: ConfiguracaoPlataforma[],
): LinhaAssinatura[] {
  const porEmpresa = new Map(
    mensalidades
      .filter((item) => item.competencia === competencia)
      .map((item) => [item.empresa_id, item]),
  )

  return [...empresas]
    .sort((a, b) => a.nome_comercial.localeCompare(b.nome_comercial, 'pt-BR'))
    .map((empresa) => {
      const plano = planoDaEmpresa(empresa)
      const valor = valorMensalidadeEmpresa(empresa, configuracoes)
      const mensalidade = porEmpresa.get(empresa.id)
      return {
        empresa,
        plano,
        valor,
        mensalidade,
        statusMes: plano === 'repasse_email' ? 'nao_cobrado' : (mensalidade?.status ?? 'pendente'),
      }
    })
}

export function resumirAssinaturas(linhas: LinhaAssinatura[]) {
  let assinantes = 0
  let soEmail = 0
  let pagos = 0
  let pendentes = 0
  let atrasados = 0
  let receitaEsperada = 0
  let receitaPaga = 0

  for (const linha of linhas) {
    if (linha.plano === 'repasse_email') {
      soEmail += 1
      continue
    }
    assinantes += 1
    receitaEsperada += linha.valor
    if (linha.statusMes === 'pago' || linha.statusMes === 'isento') {
      pagos += 1
      if (linha.statusMes === 'pago') receitaPaga += linha.valor
    } else if (linha.statusMes === 'atrasado') {
      atrasados += 1
    } else {
      pendentes += 1
    }
  }

  return {
    assinantes,
    soEmail,
    pagos,
    pendentes,
    atrasados,
    receitaEsperada,
    receitaPaga,
    quantidade: linhas.length,
  }
}
