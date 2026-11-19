import { Capacitor, type PluginListenerHandle } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import type { TipoUsuario } from '@/types'
import {
  desativarTokensPushNuvem,
  registrarTokenPushNuvem,
} from '@/services/nuvemPushTokens'

let listenersProntos = false
let handles: PluginListenerHandle[] = []
let tokenAtual: string | null = null
let idsRecebidosRecentemente = new Set<string>()

export type PayloadPushTap = {
  notificationId?: string
  tipo?: string
  referenciaId?: string
  rota?: string
}

export function marcarNotificacaoVistaNoApp(id: string) {
  if (!id) return
  idsRecebidosRecentemente.add(id)
  if (idsRecebidosRecentemente.size > 80) {
    const primeiro = idsRecebidosRecentemente.values().next().value
    if (primeiro) idsRecebidosRecentemente.delete(primeiro)
  }
}

export function notificacaoJaVistaNoApp(id?: string | null) {
  if (!id) return false
  return idsRecebidosRecentemente.has(id)
}

export function rotaParaPush(
  tipoUsuario: TipoUsuario | undefined,
  payload: PayloadPushTap,
): string {
  if (payload.rota?.startsWith('/')) return payload.rota

  const ref = payload.referenciaId?.trim()
  switch (tipoUsuario) {
    case 'empresa':
      if (ref) return `/empresa/viagens/${ref}`
      return '/empresa/solicitacoes'
    case 'motorista':
      return '/motorista'
    case 'admin':
      if (ref) return '/admin/solicitacoes'
      return '/admin/solicitacoes'
    case 'cliente':
    default:
      if (ref) return `/app/viagens/${ref}`
      return '/app/notificacoes'
  }
}

export function obterTokenPushAtual() {
  return tokenAtual
}

export async function iniciarPushNativo(opcoes: {
  aoReceberForeground: (payload: PayloadPushTap & { titulo?: string; mensagem?: string }) => void
  aoTocar: (payload: PayloadPushTap) => void
}) {
  if (!Capacitor.isNativePlatform()) return false

  if (!listenersProntos) {
    handles = [
      await PushNotifications.addListener('registration', (ev) => {
        tokenAtual = ev.value
        void registrarTokenPushNuvem(ev.value)
      }),
      await PushNotifications.addListener('registrationError', (erro) => {
        console.warn('Falha no registro push', erro)
      }),
      await PushNotifications.addListener('pushNotificationReceived', (notif) => {
        const data = (notif.data ?? {}) as Record<string, string>
        const payload: PayloadPushTap & { titulo?: string; mensagem?: string } = {
          notificationId: data.notificationId ?? data.notification_id,
          tipo: data.tipo,
          referenciaId: data.referenciaId ?? data.referencia_id,
          rota: data.rota,
          titulo: notif.title,
          mensagem: notif.body,
        }
        opcoes.aoReceberForeground(payload)
      }),
      await PushNotifications.addListener('pushNotificationActionPerformed', (ev) => {
        const data = (ev.notification.data ?? {}) as Record<string, string>
        opcoes.aoTocar({
          notificationId: data.notificationId ?? data.notification_id,
          tipo: data.tipo,
          referenciaId: data.referenciaId ?? data.referencia_id,
          rota: data.rota,
        })
      }),
    ]
    listenersProntos = true
  }

  let permissao = await PushNotifications.checkPermissions()
  if (permissao.receive === 'prompt' || permissao.receive === 'prompt-with-rationale') {
    permissao = await PushNotifications.requestPermissions()
  }
  if (permissao.receive !== 'granted') return false

  await PushNotifications.register()
  return true
}

export async function pararPushNativoNoLogout() {
  if (!Capacitor.isNativePlatform()) return
  const token = tokenAtual
  await desativarTokensPushNuvem(token)
  tokenAtual = null
}

export async function limparListenersPushNativo() {
  for (const h of handles) {
    await h.remove().catch(() => undefined)
  }
  handles = []
  listenersProntos = false
}
