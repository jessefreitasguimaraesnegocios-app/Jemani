export type IdiomaApp = 'pt-BR' | 'en' | 'es'

export const IDIOMAS_SUPORTADOS: IdiomaApp[] = ['pt-BR', 'en', 'es']

export function normalizarIdioma(valor?: string | null): IdiomaApp {
  if (valor === 'en' || valor === 'es' || valor === 'pt-BR') return valor
  if (valor === 'pt' || valor === 'pt_BR') return 'pt-BR'
  return 'pt-BR'
}

export function localeDoIdioma(idioma: IdiomaApp): string {
  if (idioma === 'en') return 'en-US'
  if (idioma === 'es') return 'es-ES'
  return 'pt-BR'
}
