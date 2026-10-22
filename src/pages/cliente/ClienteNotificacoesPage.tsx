import { useMemo } from 'react'
import { Mail, MailOpen } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { usarIdioma } from '@/i18n/usarIdioma'
import { useDemoStore } from '@/store/demoStore'
import { dispararFeedbackAbrirCarta } from '@/utils/feedbackAlerta'
import './ClienteNotificacoesPage.css'

export function ClienteNotificacoesPage() {
  const { usuario } = useAuth()
  const { t, locale } = usarIdioma()
  const todas = useDemoStore((s) => s.notificacoes)
  const configuracoes = useDemoStore((s) => s.configuracoes)
  const notificacoes = useMemo(() => {
    const mapa = new Map<string, (typeof todas)[number]>()
    for (const n of todas) {
      if (n.usuario_id !== usuario?.id) continue
      const chave = `${n.tipo}|${n.titulo}|${n.referencia_id ?? ''}|${n.mensagem}`
      const atual = mapa.get(chave)
      if (!atual || n.created_at > atual.created_at) mapa.set(chave, n)
    }
    return [...mapa.values()].sort((a, b) => b.created_at.localeCompare(a.created_at))
  }, [todas, usuario?.id])
  const marcar = useDemoStore((s) => s.marcarNotificacaoLida)

  function abrirCarta(id: string, jaLida: boolean) {
    if (!jaLida) dispararFeedbackAbrirCarta(configuracoes)
    marcar(id)
  }

  return (
    <div className="animar-entrada space-y-4">
      <h1 className="fonte-display text-3xl">{t('cliente.alertas.titulo')}</h1>
      {notificacoes.length === 0 && (
        <div className="cartao text-[var(--color-slate)]">{t('cliente.alertas.vazio')}</div>
      )}
      {notificacoes.map((n) => (
        <button
          key={n.id}
          type="button"
          className={`cartao alerta-item w-full text-left ${n.lida ? 'alerta-item--lida opacity-70' : ''}`}
          onClick={() => abrirCarta(n.id, n.lida)}
          aria-label={n.lida ? 'Alerta lido' : 'Alerta não lido'}
        >
          <span className="alerta-item-icone" aria-hidden="true">
            {n.lida ? <MailOpen size={22} strokeWidth={2} /> : <Mail size={22} strokeWidth={2.25} />}
          </span>
          <span className="alerta-item-corpo">
            <p className="font-medium">{n.titulo}</p>
            <p className="mt-1 text-sm text-[var(--color-slate)]">{n.mensagem}</p>
            <p className="mt-2 text-xs text-[var(--color-slate)]">
              {new Date(n.created_at).toLocaleString(locale)}
            </p>
          </span>
        </button>
      ))}
    </div>
  )
}
