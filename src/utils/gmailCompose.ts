export interface DadosGmailCompose {
  para: string
  assunto: string
  corpo: string
  /** Versão HTML (botão clicável). Se presente, copia para a área de transferência. */
  corpoHtml?: string
}

function escaparHtml(texto: string): string {
  return texto
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
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

type ParamsOferta = {
  empresaNome: string
  codigo: string
  origem: string
  destino: string
  data: string
  horario: string
  distanciaKm?: number
  passageiros: number
  valorEmpresa?: number
  /** Link exclusivo de revisão/aceite (não confirma sozinho ao abrir). */
  urlRevisao?: string
  validoAte?: string
}

export function corpoOfertaCorrida(params: ParamsOferta): string {
  const linhas = [
    `Olá, ${params.empresaNome},`,
    '',
    'Temos uma corrida disponível para sua empresa. Confira os detalhes:',
    '',
    `Código: ${params.codigo}`,
    `DATA E HORÁRIO: ${params.data} às ${params.horario}`,
    `ORIGEM: ${params.origem}`,
    `DESTINO: ${params.destino}`,
    `Passageiros: ${params.passageiros}`,
  ]
  if (typeof params.distanciaKm === 'number') {
    linhas.push(`Distância da sua base ao embarque: ${params.distanciaKm} km`)
  }
  if (typeof params.valorEmpresa === 'number') {
    linhas.push(`Valor estimado para a empresa: USD ${params.valorEmpresa.toFixed(2)}`)
  } else {
    linhas.push('Valor / condições: conforme proposta comercial')
  }
  if (params.urlRevisao) {
    linhas.push(
      '',
      'Revisar corrida (botão no e-mail HTML):',
      params.urlRevisao,
      '',
      params.validoAte
        ? `Botão exclusivo · válido até ${params.validoAte}. O clique abre a revisão — ainda não aceita.`
        : 'Botão exclusivo. O clique abre a revisão — ainda não aceita.',
    )
  } else {
    linhas.push('', 'Responda no painel Jemani (Solicitações) para aceitar ou recusar.')
  }
  linhas.push('', 'Atenciosamente,', 'Equipe Jemani')
  return linhas.join('\n')
}

/** Corpo HTML com botão (sem URL crua à vista). Gmail só aceita isso via colar rich text. */
export function corpoOfertaCorridaHtml(params: ParamsOferta): string {
  const valor =
    typeof params.valorEmpresa === 'number'
      ? `USD ${params.valorEmpresa.toFixed(2)}`
      : 'conforme proposta comercial'
  const distancia =
    typeof params.distanciaKm === 'number'
      ? `<p style="margin:0 0 8px;"><strong>Distância da sua base ao embarque:</strong> ${params.distanciaKm} km</p>`
      : ''
  const botao = params.urlRevisao
    ? `
      <p style="margin:28px 0 12px;">
        <a href="${escaparHtml(params.urlRevisao)}"
           style="display:inline-block;padding:14px 28px;background:#b8956c;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:700;font-size:16px;font-family:Arial,sans-serif;">
          Revisar corrida
        </a>
      </p>
      <p style="margin:0;font-size:13px;color:#667085;">
        ${
          params.validoAte
            ? `Botão exclusivo · válido até ${escaparHtml(params.validoAte)}. O clique abre a revisão — ainda não aceita.`
            : 'Botão exclusivo. O clique abre a revisão — ainda não aceita.'
        }
      </p>`
    : `<p style="margin:24px 0 0;">Responda no painel Jemani (Solicitações) para aceitar ou recusar.</p>`

  return `
<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1a1a1a;">
  <p style="margin:0 0 12px;">Olá, ${escaparHtml(params.empresaNome)},</p>
  <p style="margin:0 0 16px;">Temos uma corrida disponível para sua empresa. Confira os detalhes:</p>
  <p style="margin:0 0 8px;"><strong>Código:</strong> ${escaparHtml(params.codigo)}</p>
  <p style="margin:0 0 8px;"><strong>DATA E HORÁRIO:</strong> ${escaparHtml(params.data)} às ${escaparHtml(params.horario)}</p>
  <p style="margin:0 0 8px;"><strong>ORIGEM:</strong> ${escaparHtml(params.origem)}</p>
  <p style="margin:0 0 8px;"><strong>DESTINO:</strong> ${escaparHtml(params.destino)}</p>
  <p style="margin:0 0 8px;"><strong>Passageiros:</strong> ${params.passageiros}</p>
  ${distancia}
  <p style="margin:0 0 8px;"><strong>Valor estimado para a empresa:</strong> ${escaparHtml(valor)}</p>
  ${botao}
  <p style="margin:28px 0 0;">Atenciosamente,<br/>Equipe Jemani</p>
</div>`.trim()
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
