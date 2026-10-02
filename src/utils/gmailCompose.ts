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
}): string {
  const linhas = [
    `Olá, ${params.empresaNome},`,
    '',
    'Nova corrida Jemani disponível para sua empresa (oferta por proximidade do embarque).',
    '',
    `Código: ${params.codigo}`,
    `Trecho: ${params.origem} → ${params.destino}`,
    `Quando: ${params.data} às ${params.horario}`,
    `Passageiros: ${params.passageiros}`,
  ]
  if (typeof params.distanciaKm === 'number') {
    linhas.push(`Distância da sua base ao embarque: ${params.distanciaKm} km`)
  }
  if (typeof params.valorEmpresa === 'number') {
    linhas.push(`Valor estimado para a empresa: USD ${params.valorEmpresa.toFixed(2)}`)
  }
  linhas.push(
    '',
    'Responda no painel Jemani (Solicitações) para aceitar ou recusar.',
    '',
    'Atenciosamente,',
    'Equipe Jemani',
  )
  return linhas.join('\n')
}

export function abrirGmailCompose(dados: DadosGmailCompose): void {
  const url = montarUrlGmailCompose(dados)
  window.open(url, '_blank', 'noopener,noreferrer')
}
