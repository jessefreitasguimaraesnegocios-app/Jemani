import { useEffect, useRef } from 'react'
import { useDemoStore } from '@/store/demoStore'
import { pedirPermissaoAviso } from '@/utils/avisoSistema'

const CHAVE = 'jemani-demo-v5'

export function usarAvisoDoSistema(usuarioId?: string) {
  const vistos = useRef(new Set<string>())

  useEffect(() => {
    void pedirPermissaoAviso()
    if (!usuarioId) return

    for (const n of useDemoStore.getState().notificacoes) {
      if (n.usuario_id === usuarioId) vistos.current.add(n.id)
    }

    function aoMudar(evento: StorageEvent) {
      if (evento.key !== CHAVE || !evento.newValue || !('Notification' in window)) return
      if (Notification.permission !== 'granted') return
      try {
        const dados = JSON.parse(evento.newValue) as {
          state?: { notificacoes?: Array<{ id: string; usuario_id: string; lida: boolean; titulo: string; mensagem: string }> }
        }
        for (const n of dados.state?.notificacoes ?? []) {
          if (n.usuario_id !== usuarioId || n.lida || vistos.current.has(n.id)) continue
          vistos.current.add(n.id)
          new Notification(n.titulo, { body: n.mensagem })
        }
      } catch {
        /* persistência ilegível */
      }
    }

    window.addEventListener('storage', aoMudar)
    return () => window.removeEventListener('storage', aoMudar)
  }, [usuarioId])
}
