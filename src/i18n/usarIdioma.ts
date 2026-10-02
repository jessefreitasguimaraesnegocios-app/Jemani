import { useCallback, useEffect } from 'react'
import { useDemoStore } from '@/store/demoStore'
import { MENSAGENS, type ChaveTraducao } from './mensagens'
import { localeDoIdioma, normalizarIdioma, type IdiomaApp } from './tipos'

export function usarIdioma() {
  const valor = useDemoStore((s) => s.configuracoes.find((c) => c.chave === 'idioma')?.valor)
  const idioma = normalizarIdioma(valor)
  const atualizarConfiguracao = useDemoStore((s) => s.atualizarConfiguracao)

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
    atualizarConfiguracao('idioma', novo)
  }

  return { idioma, locale: localeDoIdioma(idioma), t, definirIdioma }
}
