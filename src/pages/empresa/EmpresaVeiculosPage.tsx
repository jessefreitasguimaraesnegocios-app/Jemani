import { useMemo, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { BotaoSalvar } from '@/components/BotaoSalvar'
import { SeletorFotoVeiculo } from '@/components/SeletorFotoVeiculo'
import { useAuth } from '@/contexts/AuthContext'
import { usarIdioma } from '@/i18n/usarIdioma'
import { useDemoStore } from '@/store/demoStore'
import type { AgendamentoVeiculo, StatusEntidade, TipoServicoVeiculo, Veiculo } from '@/types'
import { formatarData } from '@/utils/format'
import './EmpresaVeiculosPage.css'

function hojeLocal() {
  const fuso = import.meta.env.VITE_TIMEZONE || 'America/Los_Angeles'
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: fuso,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function passou(data: string, horario: string) {
  const instante = new Date(`${data}T${horario.length === 5 ? horario : horario.slice(0, 5)}:00`)
  return !Number.isNaN(instante.getTime()) && instante.getTime() < Date.now()
}

function PainelServico({
  titulo,
  itens,
  aoAgendar,
  aoRemover,
  nomeAutor,
}: {
  titulo: string
  itens: AgendamentoVeiculo[]
  aoAgendar: (data: string, horario: string, observacao: string) => void
  aoRemover: (id: string) => void
  nomeAutor?: (motoristaId?: string) => string
}) {
  const { t, locale } = usarIdioma()
  const [data, setData] = useState(hojeLocal)
  const [horario, setHorario] = useState('09:00')
  const [observacao, setObservacao] = useState('')

  function enviar(e: FormEvent) {
    e.preventDefault()
    if (!data || !horario) return
    aoAgendar(data, horario, observacao.trim())
    setObservacao('')
  }

  return (
    <section className="cartao veiculo-servico">
      <h2 className="fonte-display text-2xl">{titulo}</h2>
      {itens.length === 0 && <p className="veiculo-vazio">{t('empresa.veiculos.semAgendamento')}</p>}
      {itens.map((item) => {
        const autor = nomeAutor?.(item.motorista_id) ?? ''
        return (
        <div
          key={item.id}
          className={passou(item.data, item.horario) ? 'veiculo-agendamento veiculo-agendamento--passado' : 'veiculo-agendamento'}
        >
          <div>
            <p>
              {formatarData(item.data, locale)} · {item.horario.slice(0, 5)}
            </p>
            {item.observacao && <p className="veiculo-agendamento-nota">{item.observacao}</p>}
            {autor && <p className="veiculo-agendamento-nota">{autor}</p>}
          </div>
          <button type="button" className="btn-secundario !py-2" onClick={() => aoRemover(item.id)}>
            {t('empresa.veiculos.remover')}
          </button>
        </div>
        )
      })}
      <form className="veiculo-grade" onSubmit={enviar}>
        <div>
          <label className="rotulo" htmlFor={`dia-${titulo}`}>
            {t('empresa.veiculos.dia')}
          </label>
          <input
            id={`dia-${titulo}`}
            className="campo"
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="rotulo" htmlFor={`hora-${titulo}`}>
            {t('empresa.veiculos.horario')}
          </label>
          <input
            id={`hora-${titulo}`}
            className="campo"
            type="time"
            value={horario}
            onChange={(e) => setHorario(e.target.value)}
            required
          />
        </div>
        <div className="veiculo-campo-largo">
          <label className="rotulo" htmlFor={`nota-${titulo}`}>
            {t('empresa.veiculos.observacao')}
          </label>
          <input
            id={`nota-${titulo}`}
            className="campo"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
          />
        </div>
        <button type="submit" className="btn-primario veiculo-campo-largo">
          {t('empresa.veiculos.agendar')}
        </button>
      </form>
    </section>
  )
}

export function EmpresaVeiculosPage() {
  const { t } = usarIdioma()
  const { usuario } = useAuth()
  const empresa = useDemoStore((s) => s.obterEmpresaDoUsuario(usuario?.id ?? ''))
  const todosVeiculos = useDemoStore((s) => s.veiculos)
  const veiculos = useMemo(
    () => todosVeiculos.filter((v) => v.empresa_id === empresa?.id),
    [todosVeiculos, empresa?.id],
  )
  const categorias = useDemoStore((s) => s.categorias)
  const motoristas = useDemoStore((s) => s.motoristas)
  const agendamentos = useDemoStore((s) => s.agendamentosVeiculo)
  const viagens = useDemoStore((s) => s.viagens)
  const salvarVeiculo = useDemoStore((s) => s.salvarVeiculo)
  const excluirVeiculo = useDemoStore((s) => s.excluirVeiculo)
  const agendarServicoVeiculo = useDemoStore((s) => s.agendarServicoVeiculo)
  const removerAgendamentoVeiculo = useDemoStore((s) => s.removerAgendamentoVeiculo)
  const [marca, setMarca] = useState('')
  const [modelo, setModelo] = useState('')
  const [ano, setAno] = useState(new Date().getFullYear())
  const [categoriaId, setCategoriaId] = useState(categorias[0]?.id ?? '')
  const [capacidade, setCapacidade] = useState(4)
  const [placa, setPlaca] = useState('')
  const [fotoUrl, setFotoUrl] = useState<string | undefined>()
  const [cadastroAberto, setCadastroAberto] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const [erro, setErro] = useState('')
  const [veiculoId, setVeiculoId] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState<Veiculo | null>(null)

  const mapaCategorias = useMemo(() => new Map(categorias.map((c) => [c.id, c.nome])), [categorias])
  const porVeiculo = useMemo(() => {
    const mapa = new Map<string, AgendamentoVeiculo[]>()
    for (const item of agendamentos ?? []) {
      if (empresa && item.empresa_id !== empresa.id) continue
      const lista = mapa.get(item.veiculo_id)
      if (lista) lista.push(item)
      else mapa.set(item.veiculo_id, [item])
    }
    for (const lista of mapa.values()) {
      lista.sort((a, b) => `${a.data}T${a.horario}`.localeCompare(`${b.data}T${b.horario}`))
    }
    return mapa
  }, [agendamentos, empresa])

  if (!empresa) return null

  const aberto = veiculos.find((v) => v.id === veiculoId) ?? null

  function rotuloStatus(status: StatusEntidade) {
    if (status === 'disponivel') return t('comum.disponivel')
    if (status === 'ocupado') return t('comum.ocupado')
    return t('empresa.veiculos.inativo')
  }

  function limparFormulario() {
    setMarca('')
    setModelo('')
    setPlaca('')
    setFotoUrl(undefined)
    setAno(new Date().getFullYear())
    setCapacidade(4)
    setCategoriaId(categorias[0]?.id ?? '')
    setEditandoId(null)
    setCadastroAberto(false)
  }

  function abrirEdicao(veiculo: Veiculo) {
    setEditandoId(veiculo.id)
    setMarca(veiculo.marca)
    setModelo(veiculo.modelo)
    setAno(veiculo.ano)
    setCategoriaId(veiculo.categoria_id)
    setCapacidade(veiculo.capacidade)
    setPlaca(veiculo.placa ?? '')
    setFotoUrl(veiculo.fotos[0])
    setCadastroAberto(true)
    setMsg('')
    setErro('')
    setVeiculoId(null)
  }

  function veiculoEmViagem(id: string) {
    return viagens.some(
      (viagem) =>
        viagem.veiculo_id === id &&
        viagem.status !== 'viagem_finalizada' &&
        viagem.status !== 'cancelada' &&
        viagem.status !== 'expired',
    )
  }

  function pedirExclusao() {
    if (!editandoId) return
    const veiculo = veiculos.find((item) => item.id === editandoId)
    if (!veiculo) return
    setMsg('')
    if (veiculoEmViagem(veiculo.id)) {
      setErro(t('empresa.veiculos.emViagem'))
      return
    }
    setErro('')
    setConfirmando(veiculo)
  }

  function confirmarExclusao() {
    if (!confirmando) return
    try {
      excluirVeiculo(confirmando.id)
    } catch (e) {
      setConfirmando(null)
      setErro(e instanceof Error ? e.message : t('empresa.veiculos.emViagem'))
      return
    }
    if (veiculoId === confirmando.id) setVeiculoId(null)
    setConfirmando(null)
    limparFormulario()
    setErro('')
    setMsg(t('empresa.veiculos.excluido'))
  }

  function enviar() {
    if (!marca.trim() || !modelo.trim()) {
      setErro('Informe marca e modelo.')
      throw new Error('campos')
    }
    const eraEdicao = Boolean(editandoId)
    salvarVeiculo({
      id: editandoId ?? undefined,
      empresa_id: empresa!.id,
      marca: marca.trim(),
      modelo: modelo.trim(),
      ano,
      categoria_id: categoriaId,
      capacidade,
      placa: placa.trim(),
      fotos: fotoUrl ? [fotoUrl] : [],
      ar_condicionado: true,
      bagageiro: true,
    })
    limparFormulario()
    setErro('')
    setMsg(eraEdicao ? t('empresa.veiculos.atualizado') : t('empresa.veiculos.salvo'))
  }

  function agendar(tipo: TipoServicoVeiculo, data: string, horario: string, observacao: string) {
    if (!aberto) return
    agendarServicoVeiculo({
      veiculoId: aberto.id,
      empresaId: empresa!.id,
      tipo,
      data,
      horario,
      observacao,
    })
  }

  if (aberto) {
    const lista = porVeiculo.get(aberto.id) ?? []
    return (
      <div className="animar-entrada space-y-4">
        <div>
          <button type="button" className="btn-secundario veiculo-voltar" onClick={() => setVeiculoId(null)}>
            {t('empresa.veiculos.voltar')}
          </button>
          <h1 className="fonte-display text-3xl">
            {aberto.marca} {aberto.modelo} ({aberto.ano})
          </h1>
          <p className="veiculo-sub">
            {mapaCategorias.get(aberto.categoria_id) ?? ''} · {t('empresa.veiculos.lugares', { n: aberto.capacidade })}
            {aberto.placa ? ` · ${aberto.placa}` : ''}
          </p>
        </div>
        <div className="veiculo-acoes">
          <button type="button" className="btn-secundario" onClick={() => abrirEdicao(aberto)}>
            {t('empresa.veiculos.editar')}
          </button>
        </div>
        {erro && <p className="veiculo-erro">{erro}</p>}
        <span className="badge-status">{rotuloStatus(aberto.status)}</span>
        <div className="veiculo-servicos">
          <PainelServico
            titulo={t('empresa.veiculos.mecanica')}
            itens={lista.filter((item) => item.tipo === 'mecanica')}
            aoAgendar={(data, horario, observacao) => agendar('mecanica', data, horario, observacao)}
            aoRemover={removerAgendamentoVeiculo}
            nomeAutor={(id) => motoristas.find((m) => m.id === id)?.nome ?? ''}
          />
          <PainelServico
            titulo={t('empresa.veiculos.lavaJato')}
            itens={lista.filter((item) => item.tipo === 'lava_jato')}
            aoAgendar={(data, horario, observacao) => agendar('lava_jato', data, horario, observacao)}
            aoRemover={removerAgendamentoVeiculo}
            nomeAutor={(id) => motoristas.find((m) => m.id === id)?.nome ?? ''}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="animar-entrada space-y-4">
      <h1 className="fonte-display text-3xl">{t('empresa.veiculos.titulo')}</h1>
      {erro && <p className="veiculo-erro">{erro}</p>}
      <div className="veiculo-lista">
        {veiculos.map((v) => (
          <div key={v.id} className="cartao veiculo-card">
            <div className="veiculo-card-info">
              {v.fotos[0] && (
                <img src={v.fotos[0]} alt="" className="veiculo-card-foto" />
              )}
              <button type="button" className="veiculo-nome" onClick={() => setVeiculoId(v.id)}>
                {v.marca} {v.modelo} ({v.ano})
              </button>
              <p className="veiculo-meta">
                {mapaCategorias.get(v.categoria_id) ?? ''} · {t('empresa.veiculos.lugares', { n: v.capacidade })}
                {v.placa ? ` · ${v.placa}` : ''}
              </p>
              <div className="veiculo-acoes">
                <button type="button" className="btn-secundario" onClick={() => abrirEdicao(v)}>
                  {t('empresa.veiculos.editar')}
                </button>
              </div>
            </div>
            <span className="badge-status">{rotuloStatus(v.status)}</span>
          </div>
        ))}
      </div>

      {!cadastroAberto && (
        <div className="veiculo-cadastro">
          <button
            type="button"
            className="btn-primario"
            onClick={() => {
              limparFormulario()
              setCadastroAberto(true)
              setMsg('')
              setErro('')
            }}
          >
            {t('empresa.veiculos.cadastrar')}
          </button>
          {msg && <p className="veiculo-ok">{msg}</p>}
        </div>
      )}

      {cadastroAberto && (
        <div className="cartao veiculo-form">
          <h2 className="fonte-display text-2xl">
            {editandoId ? t('empresa.veiculos.editarTitulo') : t('empresa.veiculos.cadastrar')}
          </h2>
          <div className="veiculo-grade">
            <div>
              <label className="rotulo" htmlFor="vei-marca">
                {t('empresa.veiculos.marca')}
              </label>
              <input
                id="vei-marca"
                className="campo"
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="rotulo" htmlFor="vei-modelo">
                {t('empresa.veiculos.modelo')}
              </label>
              <input
                id="vei-modelo"
                className="campo"
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="rotulo" htmlFor="vei-ano">
                {t('empresa.veiculos.ano')}
              </label>
              <input
                id="vei-ano"
                className="campo"
                type="number"
                value={ano}
                onChange={(e) => setAno(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="rotulo" htmlFor="vei-capacidade">
                {t('empresa.veiculos.capacidade')}
              </label>
              <input
                id="vei-capacidade"
                className="campo"
                type="number"
                min={1}
                value={capacidade}
                onChange={(e) => setCapacidade(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="rotulo" htmlFor="vei-categoria">
                {t('empresa.veiculos.categoria')}
              </label>
              <select
                id="vei-categoria"
                className="campo"
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
              >
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="rotulo" htmlFor="vei-placa">
                {t('empresa.veiculos.placa')}
              </label>
              <input
                id="vei-placa"
                className="campo"
                value={placa}
                onChange={(e) => setPlaca(e.target.value)}
              />
            </div>
            <div className="veiculo-campo-largo">
              <SeletorFotoVeiculo urlAtual={fotoUrl} onEscolher={setFotoUrl} />
            </div>
          </div>
          <div className="veiculo-form-acoes">
            <BotaoSalvar className="btn-primario" aoSalvar={enviar}>
              {t('empresa.veiculos.salvar')}
            </BotaoSalvar>
            <button
              type="button"
              className="btn-secundario"
              onClick={limparFormulario}
            >
              {t('comum.cancelar')}
            </button>
            {editandoId && (
              <button type="button" className="btn-perigo" onClick={pedirExclusao}>
                {t('empresa.veiculos.excluir')}
              </button>
            )}
          </div>
        </div>
      )}

      {confirmando &&
        createPortal(
          <div className="veiculo-popup" role="presentation" onClick={() => setConfirmando(null)}>
            <div
              className="veiculo-popup-painel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="veiculo-popup-titulo"
              onClick={(evento) => evento.stopPropagation()}
            >
              <h2 id="veiculo-popup-titulo" className="fonte-display text-2xl">
                {t('empresa.veiculos.certeza')}
              </h2>
              <p>
                {t('empresa.veiculos.confirmarExclusao', {
                  nome: `${confirmando.marca} ${confirmando.modelo}`,
                })}
              </p>
              <div className="veiculo-popup-acoes">
                <button type="button" className="btn-secundario" onClick={() => setConfirmando(null)}>
                  {t('comum.cancelar')}
                </button>
                <button type="button" className="btn-perigo" onClick={confirmarExclusao}>
                  {t('empresa.veiculos.excluir')}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
