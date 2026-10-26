import { useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useDemoStore } from '@/store/demoStore'

/** Apaga alertas com mais de 24h quando não há corrida ativa. */
export function VigilanciaAlertas() {
  const { usuario } = useAuth()
  const limparNotificacoesExpiradas = useDemoStore((s) => s.limparNotificacoesExpiradas)

  useEffect(() => {
    if (!usuario?.id) return
    const usuarioId: string = usuario.id
    limparNotificacoesExpiradas(usuarioId)
    const id = window.setInterval(() => limparNotificacoesExpiradas(usuarioId), 60_000)
    function aoVisivel() {
      if (document.visibilityState === 'visible') limparNotificacoesExpiradas(usuarioId)
    }
    document.addEventListener('visibilitychange', aoVisivel)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', aoVisivel)
    }
  }, [limparNotificacoesExpiradas, usuario])

  return null
}
