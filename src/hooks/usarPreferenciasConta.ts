import { useEffect, useState } from 'react'
import { useDemoStore } from '@/store/demoStore'
import {
  definirTemaConta,
  lerPreferenciasConta,
  type TemaAparencia,
} from '@/lib/preferenciasConta'

export function usarTemaConta() {
  const sessaoId = useDemoStore((s) => s.sessaoId)
  const [tema, setTema] = useState<TemaAparencia>(() => lerPreferenciasConta(sessaoId).tema)

  useEffect(() => {
    setTema(lerPreferenciasConta(sessaoId).tema)
  }, [sessaoId])

  useEffect(() => {
    function aoMudar(evento: Event) {
      const detalhe = (evento as CustomEvent).detail as
        | { usuarioId?: string; preferencias?: { tema?: TemaAparencia } }
        | undefined
      const idEvento = detalhe?.usuarioId ?? 'anon'
      const idAtual = sessaoId?.trim() || 'anon'
      if (idEvento !== idAtual) return
      if (detalhe?.preferencias?.tema) setTema(detalhe.preferencias.tema)
    }
    window.addEventListener('jemani-preferencias-conta', aoMudar)
    return () => window.removeEventListener('jemani-preferencias-conta', aoMudar)
  }, [sessaoId])

  function definirTema(novo: TemaAparencia) {
    const gravado = definirTemaConta(sessaoId, novo)
    setTema(gravado.tema)
  }

  return { tema, definirTema }
}
