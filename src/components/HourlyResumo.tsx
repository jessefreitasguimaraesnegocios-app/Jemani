import { useMemo, useState } from 'react'
import {
  ehHourly,
  minutosRestantesOficial,
  OPCOES_EXTENSAO_MINUTOS,
  rotuloDuracao,
  formatarExtensaoConfirmada,
} from '@/services/hourlyChauffeur'
import { useDemoStore } from '@/store/demoStore'
import type { Viagem } from '@/types'
import { formatarMoeda } from '@/utils/format'
import './HourlyResumo.css'

type Props = {
  viagem: Viagem
  papel: 'cliente' | 'motorista' | 'admin' | 'empresa'
  locale?: string
  /** No motorista começa aberto; pode minimizar como observações. */
  minimizar?: boolean
}

export function HourlyResumo({
  viagem,
  papel,
  locale = 'en-US',
  minimizar = false,
}: Props) {
  const extensoes = useDemoStore((s) => s.extensoesViagem)
  const solicitarExtensaoHourly = useDemoStore((s) => s.solicitarExtensaoHourly)
  const confirmarExtensaoHourlyPaga = useDemoStore((s) => s.confirmarExtensaoHourlyPaga)
  const sessaoId = useDemoStore((s) => s.sessaoId)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [aberto, setAberto] = useState(true)

  const daViagem = useMemo(
    () =>
      extensoes
        .filter((e) => e.viagem_id === viagem.id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [extensoes, viagem.id],
  )

  if (!ehHourly(viagem)) return null

  const restam = minutosRestantesOficial(viagem)
  const podeEstender =
    papel === 'cliente' &&
    viagem.payment_status === 'paid' &&
    !['viagem_finalizada', 'cancelada', 'expired', 'pending_payment'].includes(viagem.status)

  async function estender(minutos: number) {
    if (!sessaoId) return
    setBusy(true)
    setMsg('')
    try {
      const chave = `ui-${viagem.id}-${minutos}-${Math.floor(Date.now() / 5000)}`
      const ext = solicitarExtensaoHourly(viagem.id, minutos, sessaoId, chave)
      await confirmarExtensaoHourlyPaga(ext.id, sessaoId, { provider: 'teste' })
      setMsg(formatarExtensaoConfirmada(ext, locale))
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Falha na extensão')
    } finally {
      setBusy(false)
    }
  }

  const corpo = (
    <>
      <div className="hourly-resumo-grade">
        <p>
          <span>Início</span>
          <strong>
            {viagem.inicio_agendado
              ? new Date(viagem.inicio_agendado).toLocaleString(locale, {
                  hour: '2-digit',
                  minute: '2-digit',
                  day: '2-digit',
                  month: 'short',
                })
              : `${viagem.data_viagem} ${viagem.horario}`}
          </strong>
        </p>
        <p>
          <span>Duração</span>
          <strong>{rotuloDuracao(viagem.duracao_contratada_minutos ?? 0)}</strong>
        </p>
        <p>
          <span>Término previsto</span>
          <strong>
            {viagem.fim_agendado
              ? new Date(viagem.fim_agendado).toLocaleTimeString(locale, {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '—'}
          </strong>
        </p>
        <p>
          <span>Tempo restante</span>
          <strong className={restam != null && restam <= 20 ? 'hourly-resumo-urgente' : ''}>
            {restam == null ? '—' : restam <= 0 ? 'Vencido' : `${restam} min`}
          </strong>
        </p>
        <p>
          <span>Franquia</span>
          <strong>{viagem.franquia_milhas ?? 0} mi</strong>
        </p>
        {viagem.milhas_percorridas != null && (
          <p>
            <span>Percorridas</span>
            <strong>{viagem.milhas_percorridas} mi</strong>
          </p>
        )}
      </div>

      {daViagem.length > 0 && (
        <div className="hourly-resumo-hist">
          <p className="hourly-resumo-hist-titulo">Extensões</p>
          {daViagem.map((ext) => (
            <p key={ext.id} className="hourly-resumo-hist-item">
              {ext.status === 'pago'
                ? formatarExtensaoConfirmada(ext, locale)
                : `+${rotuloDuracao(ext.minutos)} · ${ext.status}${
                    ext.preco_adicional ? ` · ${formatarMoeda(ext.preco_adicional, locale)}` : ''
                  }`}
            </p>
          ))}
        </div>
      )}

      {podeEstender && (
        <div className="hourly-resumo-ext">
          <p className="hourly-resumo-hist-titulo">EXTEND RESERVATION</p>
          <div className="hourly-resumo-ext-botoes">
            {OPCOES_EXTENSAO_MINUTOS.map((m) => (
              <button
                key={m}
                type="button"
                className="btn-secundario"
                disabled={busy}
                onClick={() => void estender(m)}
              >
                +{rotuloDuracao(m).toUpperCase()}
              </button>
            ))}
          </div>
          <p className="hourly-resumo-dica">
            Extensão só entra após pagamento confirmado. Em produção use Stripe; aqui a confirmação
            de teste valida o fluxo completo.
          </p>
        </div>
      )}
      {msg && <p className="hourly-resumo-msg">{msg}</p>}
      {viagem.horario_vencido_em && (
        <p className="hourly-resumo-vencido">
          Horário contratado vencido em{' '}
          {new Date(viagem.horario_vencido_em).toLocaleTimeString(locale, {
            hour: '2-digit',
            minute: '2-digit',
          })}
          . Conclua com segurança — sem abandono do passageiro.
        </p>
      )}
    </>
  )

  if (!minimizar) {
    return (
      <section className="hourly-resumo">
        <p className="hourly-resumo-selo">HOURLY CHAUFFEUR</p>
        {corpo}
      </section>
    )
  }

  return (
    <section className={`hourly-resumo${aberto ? '' : ' hourly-resumo--compacto'}`}>
      <button
        type="button"
        className="hourly-resumo-topo"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
      >
        <span>HOURLY CHAUFFEUR</span>
        <em>{aberto ? 'Minimizar' : 'Abrir'}</em>
      </button>
      {aberto && corpo}
    </section>
  )
}
