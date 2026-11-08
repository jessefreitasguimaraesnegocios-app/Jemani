import { useCallback, useEffect, useState } from 'react'
import { useDemoStore } from '@/store/demoStore'
import {
  definirIdiomaConta,
  lerPreferenciasConta,
} from '@/lib/preferenciasConta'
import { MENSAGENS, type ChaveTraducao } from './mensagens'
import { localeDoIdioma, normalizarIdioma, type IdiomaApp } from './tipos'

export function usarIdioma() {
  const sessaoId = useDemoStore((s) => s.sessaoId)
  const [idioma, setIdioma] = useState(() => lerPreferenciasConta(sessaoId).idioma)

  useEffect(() => {
    setIdioma(lerPreferenciasConta(sessaoId).idioma)
  }, [sessaoId])

  useEffect(() => {
    function aoMudar(evento: Event) {
      const detalhe = (evento as CustomEvent).detail as
        | { usuarioId?: string; preferencias?: { idioma?: string } }
        | undefined
      const idEvento = detalhe?.usuarioId ?? 'anon'
      const idAtual = sessaoId?.trim() || 'anon'
      if (idEvento !== idAtual) return
      setIdioma(normalizarIdioma(detalhe?.preferencias?.idioma))
    }
    window.addEventListener('jemani-preferencias-conta', aoMudar)
    return () => window.removeEventListener('jemani-preferencias-conta', aoMudar)
  }, [sessaoId])

  useEffect(() => {
    document.documentElement.lang = idioma
  }, [idioma])

  const t = useCallback(
    (chave: ChaveTraducao, vars?: Record<string, string | number>) => {
      let texto = MENSAGENS[idioma][chave] ?? MENSAGENS['pt-BR'][chave] ?? String(chave)
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          texto = texto.replaceAll(`{${k}}`, String(v))
        }
      }
      return texto
    },
    [idioma],
  )

  function definirIdioma(novo: IdiomaApp) {
    const gravado = definirIdiomaConta(sessaoId, novo)
    setIdioma(gravado.idioma)
  }

  return { idioma, locale: localeDoIdioma(idioma), t, definirIdioma }
}
