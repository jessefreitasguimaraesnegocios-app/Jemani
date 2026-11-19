function escaparHtml(texto: string): string {
  return texto
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
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
  janelaMinutos?: number
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
      params.janelaMinutos
        ? `Link exclusivo · válido por até ${params.janelaMinutos} minutos. O clique abre a revisão.`
        : params.validoAte
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
      ? `<tr>
          <td style="padding:10px 14px;border-top:1px solid #e8e8e8;font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:#888;">Distância da base</td>
        </tr>
        <tr>
          <td style="padding:0 14px 12px;font-size:15px;font-weight:700;color:#111;">${params.distanciaKm} km</td>
        </tr>`
      : ''
  let validade = 'Link exclusivo'
  if (params.janelaMinutos) {
    validade += ` · válido por até ${params.janelaMinutos} minutos`
  } else if (params.validoAte) {
    validade += ` · válido até ${escaparHtml(params.validoAte)}`
  }
  const botao = params.urlRevisao
    ? `
      <p style="margin:24px 0 8px;text-align:center;">
        <a href="${escaparHtml(params.urlRevisao)}"
           style="display:inline-block;padding:14px 32px;background:#15633d;color:#ffffff;text-decoration:none;border-radius:999px;font-weight:700;font-size:16px;font-family:Arial,sans-serif;">
          Revisar corrida
        </a>
      </p>
      <p style="margin:0;text-align:center;font-size:12px;color:#667085;line-height:1.45;">
        ${validade}<br/>O clique abre a revisão. Ainda não aceita.
      </p>`
    : `<p style="margin:24px 0 0;">Responda no painel Jemani (Solicitações) para aceitar ou recusar.</p>`

  return `
<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1a1a1a;background:#ffffff;padding:8px;">
  <p style="margin:0 0 4px;font-size:12px;color:#15633d;font-weight:700;">Jemani · Proposta de corrida</p>
  <p style="margin:0 0 16px;">Olá, ${escaparHtml(params.empresaNome)}!</p>
  <p style="margin:0 0 16px;">Temos uma corrida disponível para sua empresa. Confira os detalhes:</p>
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e5e5e5;border-radius:12px;overflow:hidden;background:#fafafa;">
    <tr>
      <td style="padding:12px 14px 4px;font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:#888;">Data e horário</td>
    </tr>
    <tr>
      <td style="padding:0 14px 12px;font-size:15px;font-weight:700;color:#111;">${escaparHtml(params.data)} · ${escaparHtml(params.horario)}</td>
    </tr>
    <tr>
      <td style="padding:10px 14px 4px;border-top:1px solid #e8e8e8;font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:#888;">Origem</td>
    </tr>
    <tr>
      <td style="padding:0 14px 12px;font-size:15px;font-weight:700;color:#111;">${escaparHtml(params.origem)}</td>
    </tr>
    <tr>
      <td style="padding:10px 14px 4px;border-top:1px solid #e8e8e8;font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:#888;">Destino</td>
    </tr>
    <tr>
      <td style="padding:0 14px 12px;font-size:15px;font-weight:700;color:#111;">${escaparHtml(params.destino)}</td>
    </tr>
    <tr>
      <td style="padding:10px 14px 4px;border-top:1px solid #e8e8e8;font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:#888;">Código · Passageiros</td>
    </tr>
    <tr>
      <td style="padding:0 14px 12px;font-size:15px;font-weight:700;color:#111;">${escaparHtml(params.codigo)} · ${params.passageiros}</td>
    </tr>
    ${distancia}
    <tr>
      <td style="padding:10px 14px 4px;border-top:1px solid #e8e8e8;font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:#888;">Valor / condições</td>
    </tr>
    <tr>
      <td style="padding:0 14px 14px;font-size:15px;font-weight:700;color:#111;">${escaparHtml(valor)}</td>
    </tr>
  </table>
  ${botao}
  <hr style="border:none;border-top:1px solid #eee;margin:28px 0 12px;" />
  <p style="margin:0;font-size:12px;color:#98a2b3;">Mensagem enviada pela plataforma Jemani</p>
</div>`.trim()
}
