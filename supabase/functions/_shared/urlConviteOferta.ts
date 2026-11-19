const ORIGEM_PUBLICA_JEMANI = 'https://jemani.vercel.app'

export function montarUrlConvite(token: string): string {
  return `${ORIGEM_PUBLICA_JEMANI}/convite/${encodeURIComponent(token)}`
}
