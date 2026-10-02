import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { BadgeStatus } from '@/components/BadgeStatus'
import { useAuth } from '@/contexts/AuthContext'
import { stripeCheckoutDisponivel } from '@/lib/stripeApi'
import { criarIntencaoPagamento, permitirSimulacaoPagamentoDev } from '@/services/pagamentoService'
import { useDemoStore } from '@/store/demoStore'
import { formatarData, formatarMoeda } from '@/utils/format'

export function ClienteViagemDetalhePage() {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const { usuario } = useAuth()
  const viagem = useDemoStore((s) => s.viagens.find((v) => v.id === id))
  const empresas = useDemoStore((s) => s.empresas)
  const motoristas = useDemoStore((s) => s.motoristas)
  const veiculos = useDemoStore((s) => s.veiculos)
  const categorias = useDemoStore((s) => s.categorias)
  const todosHistoricos = useDemoStore((s) => s.historicos)
  const historicos = useMemo(
    () =>
      todosHistoricos
        .filter((h) => h.viagem_id === id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [todosHistoricos, id],
  )
  const avaliacoes = useDemoStore((s) => s.avaliacoes)
  const cancelarViagem = useDemoStore((s) => s.cancelarViagem)
  const criarAvaliacao = useDemoStore((s) => s.criarAvaliacao)
  const simularPagamentoEDistribuir = useDemoStore((s) => s.simularPagamentoEDistribuir)
  const confirmarPagamentoStripe = useDemoStore((s) => s.confirmarPagamentoStripe)
  const confirmandoRef = useRef(false)

  const [motivo, setMotivo] = useState('')
  const [notaEmpresa, setNotaEmpresa] = useState(5)
  const [notaMotorista, setNotaMotorista] = useState(5)
  const [notaServico, setNotaServico] = useState(5)
  const [comentario, setComentario] = useState('')
  const [msg, setMsg] = useState('')
  const [pagando, setPagando] = useState(false)

  useEffect(() => {
    const status = params.get('pagamento')
    const sessionId = params.get('session_id')
    if (!status) return

    if (status === 'cancelado') {
      setMsg('Pagamento cancelado. Você pode tentar de novo quando quiser.')
      setParams({}, { replace: true })
      return
    }

    if (status === 'ok' && sessionId && usuario && id && !confirmandoRef.current) {
      confirmandoRef.current = true
      setPagando(true)
      void confirmarPagamentoStripe(id, usuario.id, sessionId)
        .then(() => setMsg('Pagamento confirmado via Stripe. Corrida liberada para as empresas.'))
        .catch((err) => setMsg(err instanceof Error ? err.message : 'Erro ao confirmar Stripe'))
        .finally(() => {
          setPagando(false)
          setParams({}, { replace: true })
        })
    }
  }, [params, setParams, usuario, id, confirmarPagamentoStripe])

  if (!viagem || viagem.cliente_id !== usuario?.id) {
    return (
      <div className="cartao">
        Viagem não encontrada. <Link to="/app/viagens">Voltar</Link>
      </div>
    )
  }

  const empresa = empresas.find((e) => e.id === viagem.empresa_id)
  const motorista = motoristas.find((m) => m.id === viagem.motorista_id)
  const veiculo = veiculos.find((v) => v.id === viagem.veiculo_id)
  const categoria = categorias.find((c) => c.id === viagem.categoria_id)
  const jaAvaliou = avaliacoes.some((a) => a.viagem_id === viagem.id)
  const stripeOk = stripeCheckoutDisponivel()

  async function pagarComStripe() {
    if (!usuario) return
    setPagando(true)
    setMsg('')
    try {
      const intencao = await criarIntencaoPagamento({
        bookingId: viagem!.id,
        codigo: viagem!.codigo,
        amount: viagem!.preco_total,
        platformFee: viagem!.valor_plataforma,
        companyAmount: viagem!.valor_empresa,
        emailCliente: usuario.email,
      })
      if (!intencao.checkoutUrl) {
        throw new Error(
          'Checkout Stripe indisponível. Configure VITE_STRIPE_ENABLED=true e as Edge Functions.',
        )
      }
      window.location.href = intencao.checkoutUrl
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Erro ao iniciar Stripe')
      setPagando(false)
    }
  }

  function handleCancelar(e: FormEvent) {
    e.preventDefault()
    if (!usuario) return
    try {
      cancelarViagem(viagem!.id, usuario.id, motivo || 'Cancelado pelo cliente')
      setMsg('Viagem cancelada')
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Erro')
    }
  }

  function handleAvaliar(e: FormEvent) {
    e.preventDefault()
    if (!usuario || !viagem?.empresa_id) return
    criarAvaliacao({
      viagem_id: viagem.id,
      cliente_id: usuario.id,
      empresa_id: viagem.empresa_id,
      motorista_id: viagem.motorista_id,
      nota_empresa: notaEmpresa,
      nota_motorista: notaMotorista,
      nota_servico: notaServico,
      comentario: comentario || undefined,
    })
    setMsg('Avaliação registrada. Obrigado!')
  }

  return (
    <div className="animar-entrada space-y-4">
      <Link to="/app/viagens" className="text-sm text-[var(--color-gold-deep)]">
        ← Minhas viagens
      </Link>

      <div className="cartao">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="fonte-display text-3xl">{viagem.codigo}</h1>
            <p className="mt-1 text-[var(--color-slate)]">
              {viagem.origem} → {viagem.destino}
            </p>
          </div>
          <BadgeStatus status={viagem.status} />
        </div>

        {viagem.status === 'pending_payment' && (
          <div className="mt-4 rounded-xl border border-[var(--color-gold)] bg-[rgba(184,149,108,0.12)] p-4">
            <p className="font-medium">Aguardando pagamento</p>
            <p className="mt-1 text-sm text-[var(--color-slate)]">
              Confirme o pagamento para liberar a corrida às empresas parceiras. Em teste, use o
              cartão Stripe <code>4242 4242 4242 4242</code>.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {stripeOk && (
                <button
                  type="button"
                  className="btn-ouro"
                  disabled={pagando}
                  onClick={() => void pagarComStripe()}
                >
                  {pagando ? 'Abrindo Stripe...' : 'Pagar com Stripe (teste)'}
                </button>
              )}
              {permitirSimulacaoPagamentoDev() && (
                <button
                  type="button"
                  className="btn-secundario"
                  disabled={pagando}
                  onClick={() => {
                    if (!usuario) return
                    setPagando(true)
                    setMsg('')
                    void simularPagamentoEDistribuir(viagem.id, usuario.id)
                      .then(() =>
                        setMsg('Pagamento DEV simulado. Corrida distribuída por proximidade.'),
                      )
                      .catch((err) =>
                        setMsg(err instanceof Error ? err.message : 'Erro no pagamento DEV'),
                      )
                      .finally(() => setPagando(false))
                  }}
                >
                  {pagando ? 'Processando...' : 'Simular pagamento (DEV)'}
                </button>
              )}
            </div>
            {!stripeOk && (
              <p className="mt-2 text-xs text-[var(--color-slate)]">
                Para ativar Stripe teste: VITE_STRIPE_ENABLED=true + Edge Functions com
                STRIPE_SECRET_KEY (sk_test_...).
              </p>
            )}
          </div>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Info label="Data" valor={`${formatarData(viagem.data_viagem)} · ${viagem.horario}`} />
          <Info label="Categoria" valor={categoria?.nome ?? '—'} />
          <Info label="Passageiros" valor={String(viagem.passageiros)} />
          <Info label="Preço" valor={formatarMoeda(viagem.preco_total)} />
          <Info label="Empresa" valor={empresa?.nome_comercial ?? 'Aguardando'} />
          <Info label="Motorista" valor={motorista?.nome ?? '—'} />
          <Info
            label="Veículo"
            valor={veiculo ? `${veiculo.marca} ${veiculo.modelo}` : '—'}
          />
          <Info label="Passageiro" valor={viagem.nome_passageiro ?? usuario?.nome ?? '—'} />
          {viagem.malas != null && <Info label="Malas" valor={String(viagem.malas)} />}
          {viagem.numero_voo && <Info label="Voo" valor={viagem.numero_voo} />}
          {viagem.observacoes && (
            <div className="sm:col-span-2">
              <Info label="Observações" valor={viagem.observacoes} />
            </div>
          )}
        </div>
      </div>

      <div className="cartao">
        <h2 className="fonte-display text-2xl">Histórico</h2>
        <ul className="mt-3 space-y-2">
          {historicos.length === 0 && (
            <li className="text-sm text-[var(--color-slate)]">Sem eventos ainda.</li>
          )}
          {historicos.map((h) => (
            <li key={h.id} className="text-sm text-[var(--color-slate)]">
              <BadgeStatus status={h.status_novo} />{' '}
              <span className="ml-2">{new Date(h.created_at).toLocaleString('pt-BR')}</span>
            </li>
          ))}
        </ul>
      </div>

      {!['viagem_finalizada', 'cancelada'].includes(viagem.status) && (
        <form className="cartao space-y-3" onSubmit={handleCancelar}>
          <h2 className="fonte-display text-2xl">Cancelar</h2>
          <input
            className="campo"
            placeholder="Motivo do cancelamento"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
          <button type="submit" className="btn-perigo">
            Cancelar viagem
          </button>
        </form>
      )}

      {viagem.status === 'viagem_finalizada' && !jaAvaliou && viagem.empresa_id && (
        <form className="cartao space-y-3" onSubmit={handleAvaliar}>
          <h2 className="fonte-display text-2xl">Avaliar serviço</h2>
          <Nota label="Empresa" valor={notaEmpresa} onChange={setNotaEmpresa} />
          <Nota label="Motorista" valor={notaMotorista} onChange={setNotaMotorista} />
          <Nota label="Serviço" valor={notaServico} onChange={setNotaServico} />
          <textarea
            className="campo"
            placeholder="Comentário"
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
          />
          <button type="submit" className="btn-primario">
            Enviar avaliação
          </button>
        </form>
      )}

      {msg && <p className="text-sm text-[var(--color-success)]">{msg}</p>}
    </div>
  )
}

function Info({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-[var(--color-slate)]">{label}</p>
      <p className="mt-1 font-medium">{valor}</p>
    </div>
  )
}

function Nota({
  label,
  valor,
  onChange,
}: {
  label: string
  valor: number
  onChange: (n: number) => void
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      <select
        className="campo !w-24"
        value={valor}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </label>
  )
}
