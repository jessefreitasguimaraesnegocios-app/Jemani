export function emitirAvisoSistema(titulo: string, mensagem: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  try {
    new Notification(titulo, { body: mensagem })
  } catch {
    /* o navegador recusou o aviso */
  }
}

export async function pedirPermissaoAviso() {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission === 'default') {
    await Notification.requestPermission()
  }
}
