import { useMemo, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BadgeStatus } from '@/components/BadgeStatus'
import { ModalFinalizarViagem } from '@/components/ModalFinalizarViagem'
import { useAuth } from '@/contexts/AuthContext'
import { SLUG_SHIELD } from '@/data/seed'
import { useDemoStore } from '@/store/demoStore'
import type { StatusViagem } from '@/types'
import { formatarData, formatarMoeda } from '@/utils/format'

const PROXIMOS: Partial<Record<StatusViagem, { label: string; status: StatusViagem }>> = {
  motorista_atribuido: { label: 'Motorista a caminho', status: 'motorista_a_caminho' },
  motorista_a_caminho: { label: 'Motorista chegou', status: 'motorista_chegou' },
  motorista_chegou: { label: 'Passageiro embarcou', status: 'passageiro_embarcou' },
  passageiro_embarcou: { label: 'Iniciar viagem', status: 'viagem_em_andamento' },
}

export function EmpresaViagemDetalhePage() {
  const { id } = useParams()
  const { usuario } = useAuth()
  const empresa = useDemoStore((s) => s.obterEmpresaDoUsuario(usuario?.id ?? ''))
  const viagem = useDemoStore((s) => s.viagens.find((v) => v.id === id))
  const todosMotoristas = useDemoStore((s) => s.motoristas)
  const todosVeiculos = useDemoStore((s) => s.veiculos)
  const categorias = useDemoStore((s) => s.categorias)
  const perfis = useDemoStore((s) => s.perfis)
  const corridaShield = useMemo(
    () => categorias.find((c) => c.id === viagem?.categoria_id)?.slug === SLUG_SHIELD,
    [categorias, viagem?.categoria_id],
  )
  const motoristas = useMemo(
    () =>
      todosMotoristas.filter((m) => {
        if (m.empresa_id !== empresa?.id || !m.disponivel) return false
        if (corridaShield) return Boolean(m.eh_categoria_shield)
        return true
      }),
    [todosMotoristas, empresa?.id, corridaShield],
  )
  const veiculosDaEmpresa = useMemo(
    () =>
      todosVeiculos.filter(
        (v) => v.empresa_id === empresa?.id && v.status === 'disponivel',
      ),
    [todosVeiculos, empresa?.id],
  )
  const veiculos = useMemo(() => {
    if (!viagem) return veiculosDaEmpresa
    const comCapacidade = veiculosDaEmpresa.filter((v) => v.capacidade >= viagem.passageiros)
    return [...comCapacidade].sort((a, b) => {
      const aMatch = a.categoria_id === viagem.categoria_id ? 0 : 1
      const bMatch = b.categoria_id === viagem.categoria_id ? 0 : 1
      if (aMatch !== bMatch) return aMatch - bMatch
      return a.capacidade - b.capacidade
    })
  }, [veiculosDaEmpresa, viagem])
  const temVeiculoCategoriaExata = useMemo(
    () => Boolean(viagem && veiculos.some((v) => v.categoria_id === viagem.categoria_id)),
    [veiculos, viagem],
  )
  const atribuirEquipe = useDemoStore((s) => s.atribuirEquipe)
  const atualizarStatus = useDemoStore((s) => s.atualizarStatus)
  const solicitarFinalizacao = useDemoStore((s) => s.solicitarFinalizacao)
  const confirmarFinalizacao = useDemoStore((s) => s.confirmarFinalizacao)

  const [motoristaId, setMotoristaId] = useState('')
  const [veiculoId, setVeiculoId] = useState('')
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState('')
  const [mostrarFinalizar, setMostrarFinalizar] = useState(false)
  const [finalizando, setFinalizando] = useState(false)

  if (!empresa || !viagem || (viagem.empresa_id && viagem.empresa_id !== empresa.id)) {
    return (
      <div className="cartao">
        Viagem não encontrada. <Link to="/empresa/viagens">Voltar</Link>
      </div>
    )
  }

  const cat = categorias.find((c) => c.id === viagem.categoria_id)
  const motoristaAtual = todosMotoristas.find((m) => m.id === viagem.motorista_id)
  const veiculoAtual = todosVeiculos.find((v) => v.id === viagem.veiculo_id)
  const proximo = PROXIMOS[viagem.status]

  function handleAtribuir(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setOk('')
    try {
      atribuirEquipe(viagem!.id, motoristaId, veiculoId)
      setOk('Equipe atribuída com sucesso')
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro')
    }
  }

  function avancarStatus() {
    if (!proximo || !usuario) return
    setErro('')
    try {
      atualizarStatus(viagem!.id, proximo.status, usuario.id)
      setOk(`Status atualizado: ${proximo.label}`)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro')
    }
  }

  function abrirFinalizacao() {
    const check = solicitarFinalizacao(viagem!.id)
    if (!check.ok) {
      setErro(check.mensagem)
      return
    }
    setMostrarFinalizar(true)
  }

  function concluirFinalizacao() {
    if (!usuario) return
    setFinalizando(true)
    setErro('')
    try {
      confirmarFinalizacao(viagem!.id, usuario.id, true)
      setOk('Viagem finalizada com checagem dupla')
      setMostrarFinalizar(false)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro')
    } finally {
      setFinalizando(false)
    }
  }

  return (
    <div className="animar-entrada space-y-4">
      <Link to="/empresa/viagens" className="text-sm text-[var(--color-gold-deep)]">
        ← Histórico
      </Link>
      <div className="cartao">
        <div className="flex flex-wrap justify-between gap-2">
          <h1 className="fonte-display text-3xl">{viagem.codigo}</h1>
          <BadgeStatus status={viagem.status} />
        </div>
        <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <p>
            {viagem.origem} → {viagem.destino}
          </p>
          <p>
            {formatarData(viagem.data_viagem)} · {viagem.horario}
          </p>
          <p>Categoria: {cat?.nome}</p>
          <p>Passageiros: {viagem.passageiros}</p>
          {viagem.malas != null && <p>Malas: {viagem.malas}</p>}
          {viagem.numero_voo && <p>Voo: {viagem.numero_voo}</p>}
          {viagem.nome_passageiro && <p>Passageiro: {viagem.nome_passageiro}</p>}
          {viagem.observacoes && <p className="sm:col-span-2">Obs.: {viagem.observacoes}</p>}
          <p>Total: {formatarMoeda(viagem.preco_total)}</p>
          <p>Empresa recebe: {formatarMoeda(viagem.valor_empresa)}</p>
          <p>Comissão: {formatarMoeda(viagem.valor_plataforma)}</p>
          <p>Motorista: {motoristaAtual?.nome ?? '—'}</p>
          <p>
            Veículo:{' '}
            {veiculoAtual ? `${veiculoAtual.marca} ${veiculoAtual.modelo}` : '—'}
          </p>
        </div>
      </div>

      {viagem.status === 'empresa_confirmada' && (
        <form className="cartao space-y-3" onSubmit={handleAtribuir}>
          <h2 className="fonte-display text-2xl">Selecionar motorista e veículo</h2>
          <div>
            <label className="rotulo">Motorista</label>
            <select
              className="campo"
              value={motoristaId}
              onChange={(e) => setMotoristaId(e.target.value)}
              required
              disabled={motoristas.length === 0}
            >
              <option value="">
                {corridaShield && motoristas.length === 0
                  ? 'Nenhum motorista Shield disponível'
                  : 'Selecione'}
              </option>
              {motoristas.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome} · CNH {m.categoria_cnh}
                  {m.eh_categoria_shield ? ' · Shield' : ''}
                </option>
              ))}
            </select>
            {corridaShield && (
              <p className="mt-1 text-xs text-[var(--color-slate)]">
                Corrida JEMANI SHIELD: só motorista marcado como Shield pode assumir.
              </p>
            )}
          </div>
          <div>
            <label className="rotulo">Veículo</label>
            <select
              className="campo"
              value={veiculoId}
              onChange={(e) => setVeiculoId(e.target.value)}
              required
              disabled={veiculos.length === 0}
            >
              <option value="">
                {veiculos.length === 0 ? 'Nenhum veículo disponível' : 'Selecione'}
              </option>
              {veiculos.map((v) => {
                const catVeiculo = categorias.find((c) => c.id === v.categoria_id)
                const mesmaCategoria = v.categoria_id === viagem.categoria_id
                return (
                  <option key={v.id} value={v.id}>
                    {v.marca} {v.modelo} · {catVeiculo?.nome ?? 'Categoria'} · {v.capacidade}{' '}
                    lugares · {v.placa}
                    {mesmaCategoria ? ' ★' : ''}
                  </option>
                )
              })}
            </select>
            {veiculos.length === 0 ? (
              <p className="mt-1 text-xs text-[var(--color-danger)]">
                Cadastre um veículo disponível com capacidade para {viagem.passageiros}{' '}
                passageiro(s) em{' '}
                <Link to="/empresa/veiculos" className="underline">
                  Veículos
                </Link>
                .
              </p>
            ) : !temVeiculoCategoriaExata ? (
              <p className="mt-1 text-xs text-[var(--color-slate)]">
                Nenhum veículo da categoria {cat?.nome}. Mostrando outros disponíveis da frota com
                capacidade suficiente — prefira cadastrar um {cat?.nome} quando possível.
              </p>
            ) : (
              <p className="mt-1 text-xs text-[var(--color-slate)]">
                ★ = mesma categoria da reserva ({cat?.nome}).
              </p>
            )}
          </div>
          <button type="submit" className="btn-ouro">
            Confirmar equipe
          </button>
        </form>
      )}

      {proximo && (
        <div className="cartao">
          <h2 className="fonte-display text-2xl">Atualizar status</h2>
          <button type="button" className="btn-primario mt-3" onClick={avancarStatus}>
            {proximo.label}
          </button>
        </div>
      )}

      {viagem.status === 'viagem_em_andamento' && (
        <div className="cartao">
          <h2 className="fonte-display text-2xl">Finalizar corrida</h2>
          <p className="mt-1 text-sm text-[var(--color-slate)]">
            Exige confirmação em duas etapas para evitar clique acidental.
          </p>
          <button type="button" className="btn-ouro mt-3" onClick={abrirFinalizacao}>
            Finalizar viagem
          </button>
        </div>
      )}

      {mostrarFinalizar && (
        <ModalFinalizarViagem
          viagem={viagem}
          clienteNome={perfis.find((p) => p.id === viagem.cliente_id)?.nome}
          empresaNome={empresa.nome_comercial}
          veiculoLabel={
            veiculoAtual ? `${veiculoAtual.marca} ${veiculoAtual.modelo}` : undefined
          }
          onCancelar={() => setMostrarFinalizar(false)}
          onConfirmar={concluirFinalizacao}
          carregando={finalizando}
        />
      )}

      {erro && <p className="text-sm text-[var(--color-danger)]">{erro}</p>}
      {ok && <p className="text-sm text-[var(--color-success)]">{ok}</p>}
    </div>
  )
}
