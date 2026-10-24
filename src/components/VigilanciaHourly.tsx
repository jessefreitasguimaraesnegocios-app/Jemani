import { useEffect } from 'react'
import { useDemoStore } from '@/store/demoStore'

/** Dispara avisos 20/15/10/5 min e marca vencimento — com dedupe no store. */
export function VigilanciaHourly() {
  const verificarAvisosHourly = useDemoStore((s) => s.verificarAvisosHourly)

  useEffect(() => {
    verificarAvisosHourly()
    const id = window.setInterval(() => verificarAvisosHourly(), 30_000)
    const aoVisivel = () => {
      if (document.visibilityState === 'visible') verificarAvisosHourly()
    }
    document.addEventListener('visibilitychange', aoVisivel)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', aoVisivel)
    }
  }, [verificarAvisosHourly])

  return null
}
