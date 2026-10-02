import type { Empresa } from '@/types'

export function calcularRepasseComissao(precoTotal: number, percentual: number) {
  const pct = Math.min(100, Math.max(0, Number(percentual) || 0))
  const valor_plataforma = Math.round(((precoTotal * pct) / 100) * 100) / 100
  const valor_empresa = Math.round((precoTotal - valor_plataforma) * 100) / 100
  return {
    comissao_percentual: pct,
    valor_plataforma,
    valor_empresa,
  }
}

export function obterComissaoDaEmpresa(
  empresa: Pick<Empresa, 'comissao_percentual'> | undefined,
  padraoPlataforma: number,
): number {
  if (empresa?.comissao_percentual != null && !Number.isNaN(Number(empresa.comissao_percentual))) {
    return Number(empresa.comissao_percentual)
  }
  return padraoPlataforma
}

export function lerComissaoPadrao(
  configuracoes: Array<{ chave: string; valor: string }>,
): number {
  return Number(configuracoes.find((c) => c.chave === 'comissao_percentual')?.valor ?? '10')
}
