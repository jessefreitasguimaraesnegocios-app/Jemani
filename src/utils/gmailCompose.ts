export { corpoOfertaCorrida, corpoOfertaCorridaHtml } from '../../supabase/functions/_shared/modeloOfertaEmail'

export interface DadosGmailCompose {
  para: string
  assunto: string
  corpo: string
  /** Versão HTML (botão clicável). Se presente, copia para a área de transferência. */
  corpoHtml?: string
}

/** Monta URL de composição do Gmail (sem API). O envio é feito pelo usuário no Gmail. */
export function montarUrlGmailCompose(
  dados: DadosGmailCompose,
  opcoes?: { incluirCorpo?: boolean },
): string {
  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to: dados.para,
    su: dados.assunto,
  })
  if (opcoes?.incluirCorpo !== false && dados.corpo) {
    params.set('body', dados.corpo)
  }
  return `https://mail.google.com/mail/?${params.toString()}`
}

export function corpoPadraoNovaCorrida(empresaNome: string, detalhes?: string): string {
  return [
    `Olá, ${empresaNome},`,
    '',
    'Temos uma nova corrida disponível na plataforma Jemani.',
    detalhes ? '' : undefined,
    detalhes,
    '',
    'Acesse o painel da empresa para revisar e responder.',
    '',
    'Atenciosamente,',
    'Equipe Jemani',
  ]
    .filter((l) => l !== undefined)
    .join('\n')
}

async function copiarCorpoHtml(html: string, texto: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard) return false
  try {
    if (typeof ClipboardItem !== 'undefined') {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([texto], { type: 'text/plain' }),
        }),
      ])
      return true
    }
    await navigator.clipboard.writeText(texto)
    return false
  } catch {
    try {
      await navigator.clipboard.writeText(texto)
    } catch {
      /* ignore */
    }
    return false
  }
}

export type ResultadoGmailCompose = {
  /** True quando o HTML com botão foi copiado — admin precisa colar no Gmail (Ctrl+V). */
  colouHtml: boolean
}

export async function abrirGmailCompose(dados: DadosGmailCompose): Promise<ResultadoGmailCompose> {
  let colouHtml = false
  if (dados.corpoHtml) {
    colouHtml = await copiarCorpoHtml(dados.corpoHtml, dados.corpo)
  }
  // Com HTML na área de transferência, abre o Gmail sem body para o Ctrl+V colar o botão.
  const url = montarUrlGmailCompose(dados, { incluirCorpo: !colouHtml })
  window.open(url, '_blank', 'noopener,noreferrer')
  return { colouHtml }
}
