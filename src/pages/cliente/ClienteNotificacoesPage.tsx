import { useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { usarIdioma } from '@/i18n/usarIdioma'
import { useDemoStore } from '@/store/demoStore'

export function ClienteNotificacoesPage() {
  const { usuario } = useAuth()
  const { t, locale } = usarIdioma()
  const todas = useDemoStore((s) => s.notificacoes)
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
          className={`cartao w-full text-left ${n.lida ? 'opacity-70' : ''}`}
          onClick={() => marcar(n.id)}
        >
          <p className="font-medium">{n.titulo}</p>
          <p className="mt-1 text-sm text-[var(--color-slate)]">{n.mensagem}</p>
          <p className="mt-2 text-xs text-[var(--color-slate)]">
            {new Date(n.created_at).toLocaleString(locale)}
          </p>
        </button>
      ))}
    </div>
  )
}
