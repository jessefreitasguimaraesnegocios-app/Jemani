import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { usarIdioma } from '@/i18n/usarIdioma'
import { useDemoStore } from '@/store/demoStore'
import type { MensagemEmpresa, Motorista } from '@/types'
import './ChatEmpresa.css'

type Props = {
  empresaId: string
  autor: MensagemEmpresa['autor']
  motoristaId: string
  motoristas?: Motorista[]
  aoTrocarMotorista?: (id: string) => void
  telaCheia?: boolean
  titulo?: string
}

export function ChatEmpresa({
  empresaId,
  autor,
  motoristaId,
  motoristas,
  aoTrocarMotorista,
  telaCheia,
  titulo,
}: Props) {
  const { t, locale } = usarIdioma()
  const mensagens = useDemoStore((s) => s.mensagensEmpresa)
  const enviarMensagemEmpresa = useDemoStore((s) => s.enviarMensagemEmpresa)
  const [texto, setTexto] = useState('')
  const fimRef = useRef<HTMLDivElement>(null)

  const conversa = useMemo(
    () =>
      mensagens
        .filter((item) => item.empresa_id === empresaId && item.motorista_id === motoristaId)
        .sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [mensagens, empresaId, motoristaId],
  )

  useEffect(() => {
    fimRef.current?.scrollIntoView({ block: 'end' })
  }, [conversa.length, motoristaId])

  function enviar(evento: FormEvent) {
    evento.preventDefault()
    if (!motoristaId) return
    enviarMensagemEmpresa({ empresaId, motoristaId, autor, texto })
    setTexto('')
  }

  return (
    <div className={`chat-empresa ${telaCheia ? 'chat-empresa--tela' : ''}`}>
      {titulo && <p className="chat-empresa-titulo">{titulo}</p>}
      {motoristas && motoristas.length > 0 && (
        <div className="chat-empresa-pessoas">
          {motoristas.map((motorista) => (
            <button
              key={motorista.id}
              type="button"
              className={`chat-empresa-pessoa ${motorista.id === motoristaId ? 'chat-empresa-pessoa--ativa' : ''}`}
              onClick={() => aoTrocarMotorista?.(motorista.id)}
            >
              {motorista.nome}
            </button>
          ))}
        </div>
      )}
      <div className="chat-empresa-lista">
        {conversa.length === 0 && <p className="chat-empresa-vazio">{t('empresa.aoVivo.chatVazio')}</p>}
        {conversa.map((mensagem) => (
          <p
            key={mensagem.id}
            className={`chat-empresa-balao ${mensagem.autor === autor ? 'chat-empresa-balao--meu' : ''}`}
          >
            {mensagem.texto}
            <span className="chat-empresa-hora">
              {new Date(mensagem.created_at).toLocaleTimeString(locale, {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </p>
        ))}
        <div ref={fimRef} />
      </div>
      <form className="chat-empresa-form" onSubmit={enviar}>
        <input
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
          placeholder={t('empresa.aoVivo.chatCampo')}
          aria-label={t('empresa.aoVivo.chatCampo')}
        />
        <button type="submit">{t('empresa.aoVivo.enviar')}</button>
      </form>
    </div>
  )
}
