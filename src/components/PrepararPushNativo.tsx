import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { useAuth } from '@/contexts/AuthContext'
import { useDemoStore } from '@/store/demoStore'
import {
  iniciarPushNativo,
  marcarNotificacaoVistaNoApp,
  notificacaoJaVistaNoApp,
  rotaParaPush,
} from '@/services/pushNativo'

export function PrepararPushNativo() {
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const pushLigado =
    (useDemoStore((s) => s.configuracoes.find((c) => c.chave === 'notificacoes_push')?.valor) ??
      'true') !== 'false'

  const usuarioRef = useRef(usuario)
  const navigateRef = useRef(navigate)
  usuarioRef.current = usuario
  navigateRef.current = navigate

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    if (!usuario?.id || !pushLigado) return

    let ativo = true

    void iniciarPushNativo({
      aoReceberForeground: (payload) => {
        if (!ativo) return
        const id = payload.notificationId
        const estado = useDemoStore.getState()
        if (id && (notificacaoJaVistaNoApp(id) || estado.notificacoes.some((n) => n.id === id))) {
          marcarNotificacaoVistaNoApp(id)
          return
        }
        if (id && usuarioRef.current?.id) {
          marcarNotificacaoVistaNoApp(id)
          estado.aplicarNotificacaoNuvem({
            id,
            usuario_id: usuarioRef.current.id,
            titulo: payload.titulo ?? 'Jemani',
            mensagem: payload.mensagem ?? '',
            tipo: payload.tipo ?? 'sistema',
            lida: false,
            referencia_id: payload.referenciaId,
            created_at: new Date().toISOString(),
          })
        }
      },
      aoTocar: (payload) => {
        if (!ativo) return
        navigateRef.current(rotaParaPush(usuarioRef.current?.tipo, payload))
      },
    }).catch((erro) => {
      console.warn('Push nativo indisponível', erro)
    })

    return () => {
      ativo = false
    }
  }, [pushLigado, usuario?.id])

  useEffect(() => {
    if (!usuario?.id) return
    const cancelar = useDemoStore.subscribe((estado) => {
      for (const n of estado.notificacoes) {
        if (n.usuario_id === usuario.id) marcarNotificacaoVistaNoApp(n.id)
      }
    })
    for (const n of useDemoStore.getState().notificacoes) {
      if (n.usuario_id === usuario.id) marcarNotificacaoVistaNoApp(n.id)
    }
    return cancelar
  }, [usuario?.id])

  return null
}
