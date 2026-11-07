export interface DadosGmailCompose {
  para: string
  assunto: string
  corpo: string
}

/** Monta URL de composição do Gmail (sem API). O envio é feito pelo usuário no Gmail. */
export function montarUrlGmailCompose(dados: DadosGmailCompose): string {
  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to: dados.para,
    su: dados.assunto,
    body: dados.corpo,
  })
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

export function corpoOfertaCorrida(params: {
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
}): string {
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
      'Revisar corrida (link exclusivo):',
      params.urlRevisao,
      '',
      params.validoAte
        ? `Link exclusivo · válido até ${params.validoAte}. O clique abre a revisão — ainda não aceita.`
        : 'Link exclusivo. O clique abre a revisão — ainda não aceita.',
    )
  } else {
    linhas.push('', 'Responda no painel Jemani (Solicitações) para aceitar ou recusar.')
  }
  linhas.push('', 'Atenciosamente,', 'Equipe Jemani')
  return linhas.join('\n')
}

export function abrirGmailCompose(dados: DadosGmailCompose): void {
  const url = montarUrlGmailCompose(dados)
  window.open(url, '_blank', 'noopener,noreferrer')
}
